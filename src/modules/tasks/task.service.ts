import prisma from '../../database/prisma';

import {
    scheduleTaskReminder,
    removeTaskReminder,
} from '../../queues/reminder.service';

import { getIO } from '../../config/socket';
import ExcelJS from 'exceljs';
import { calculatePriority } from '../../utils/priority.util';
import { AppError } from '../../utils/AppError';


interface CreateTaskData {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dueDate?: string;
}


export class TaskService {

    // =====================================================
    // CREATE TASK
    // =====================================================

    async createTask(
        userId: string,
        data: CreateTaskData
    ) {
        const parsedDueDate = data.dueDate
            ? new Date(data.dueDate)
            : null;

        const task = await prisma.task.create({
            data: {
                title: data.title,
                description: data.description,

                // Priority автоматты есептеледі
                priority: calculatePriority(parsedDueDate),

                dueDate: parsedDueDate ?? undefined,

                creatorId: userId,
            },
        });


        // Reminder
        if (
            task.status !== 'DONE' &&
            task.dueDate
        ) {
            await scheduleTaskReminder(
                task.id,
                task.title,
                userId,
                task.dueDate
            );
        }


        // Socket.io
        const io = getIO();

        io.to(`user:${userId}`).emit(
            'task:created',
            task
        );


        return task;
    }


    // =====================================================
    // GET ALL TASKS
    // =====================================================

    async getTasks(
        userId: string,
        status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE',
        dueDate?: 'today' | 'overdue',
        page: number = 1,
        limit: number = 10
    ) {
        const now = new Date();


        const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        );


        const where: any = {
            OR: [
                {
                    creatorId: userId,
                },
                {
                    assigneeId: userId,
                },
            ],
        };


        // Status filter
        if (status) {
            where.status = status;
        }


        // Today filter
        if (dueDate === 'today') {
            where.dueDate = {
                gte: startOfToday,
                lt: endOfToday,
            };
        }


        // Overdue filter
        if (dueDate === 'overdue') {
            where.dueDate = {
                lt: now,
            };
        }


        // Pagination
        const skip = (page - 1) * limit;


        const tasks = await prisma.task.findMany({
            where,

            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },

            orderBy: {
                createdAt: 'desc',
            },

            skip,
            take: limit,
        });


        const total = await prisma.task.count({
            where,
        });


        return {
            tasks,

            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(
                    total / limit
                ),
            },
        };
    }


    // =====================================================
    // GET ONE TASK
    // =====================================================

    async getTaskById(
        userId: string,
        taskId: string
    ) {
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,

                OR: [
                    {
                        creatorId: userId,
                    },
                    {
                        assigneeId: userId,
                    },
                ],
            },

            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });


        if (!task) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        return task;
    }


    // =====================================================
    // UPDATE TASK
    // =====================================================

    async updateTask(
        userId: string,
        taskId: string,
        data: {
            title?: string;
            description?: string;
            status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
            priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            dueDate?: string | null;
        }
    ) {
        // Task-ты тек creator өзгерте алады
        const existingTask =
            await prisma.task.findFirst({
                where: {
                    id: taskId,
                    creatorId: userId,
                },
            });


        if (!existingTask) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        // =================================================
        // DEPENDENCY CHECK
        // UPDATE жасамай тұрып тексеріледі
        // =================================================

        if (
            data.status &&
            ['IN_PROGRESS', 'REVIEW', 'DONE']
                .includes(data.status)
        ) {
            const unfinishedDependencies =
                await prisma.taskDependency.findMany({
                    where: {
                        blockedTaskId: taskId,

                        blockingTask: {
                            status: {
                                not: 'DONE',
                            },
                        },
                    },

                    include: {
                        blockingTask: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                            },
                        },
                    },
                });


            if (
                unfinishedDependencies.length > 0
            ) {
                const blockingTitles =
                    unfinishedDependencies
                        .map(
                            (dependency) =>
                                dependency
                                    .blockingTask
                                    .title
                        )
                        .join(', ');


                throw new AppError(
                    `Task is blocked by unfinished tasks: ${blockingTitles}`,
                    409
                );
            }
        }


        // =================================================
        // UPDATE
        // =================================================

        const task = await prisma.task.update({
            where: {
                id: taskId,
            },

            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                priority: data.priority,

                dueDate: data.dueDate
                    ? new Date(data.dueDate)
                    : data.dueDate === null
                        ? null
                        : undefined,
            },
        });


        // =================================================
        // REMINDER UPDATE
        // =================================================

        if (task.status === 'DONE') {
            await removeTaskReminder(
                task.id
            );
        }
        else if (task.dueDate) {
            await scheduleTaskReminder(
                task.id,
                task.title,
                userId,
                task.dueDate
            );
        }
        else {
            await removeTaskReminder(
                task.id
            );
        }


        // =================================================
        // SOCKET.IO
        // =================================================

        const io = getIO();

        io.to(`user:${userId}`).emit(
            'task:updated',
            task
        );


        return task;
    }


    // =====================================================
    // DELETE TASK
    // =====================================================

    async deleteTask(
        userId: string,
        taskId: string
    ) {
        const existingTask =
            await prisma.task.findFirst({
                where: {
                    id: taskId,
                    creatorId: userId,
                },
            });


        if (!existingTask) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        // Reminder өшіреміз
        await removeTaskReminder(
            taskId
        );


        // Task өшіреміз
        await prisma.task.delete({
            where: {
                id: taskId,
            },
        });


        // Socket event
        const io = getIO();

        io.to(`user:${userId}`).emit(
            'task:deleted',
            {
                taskId,
            }
        );


        return {
            message:
                'Task deleted successfully',
        };
    }


    // =====================================================
    // ASSIGN TASK
    // =====================================================

    async assignTask(
        userId: string,
        taskId: string,
        assigneeId: string
    ) {
        // Task creator-ға тиесілі ме?
        const task =
            await prisma.task.findFirst({
                where: {
                    id: taskId,
                    creatorId: userId,
                },
            });


        if (!task) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        // Assignee бар ма?
        const assignee =
            await prisma.user.findUnique({
                where: {
                    id: assigneeId,
                },
            });


        if (!assignee) {
            throw new AppError(
                'Assignee not found',
                404
            );
        }


        const updatedTask =
            await prisma.task.update({
                where: {
                    id: taskId,
                },

                data: {
                    assigneeId,
                },

                include: {
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });


        const io = getIO();


        // Creator notification
        io.to(`user:${userId}`).emit(
            'task:assigned',
            updatedTask
        );


        // Assignee notification
        if (assigneeId !== userId) {
            io.to(
                `user:${assigneeId}`
            ).emit(
                'task:assigned',
                updatedTask
            );
        }


        return updatedTask;
    }


    // =====================================================
    // EXCEL EXPORT
    // =====================================================

    async exportTasks(
        userId: string
    ) {
        const tasks =
            await prisma.task.findMany({
                where: {
                    OR: [
                        {
                            creatorId: userId,
                        },
                        {
                            assigneeId: userId,
                        },
                    ],
                },

                include: {
                    creator: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },

                    assignee: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },

                orderBy: {
                    createdAt: 'desc',
                },
            });


        const workbook =
            new ExcelJS.Workbook();


        const worksheet =
            workbook.addWorksheet(
                'Tasks'
            );


        worksheet.columns = [
            {
                header: 'Title',
                key: 'title',
                width: 30,
            },
            {
                header: 'Description',
                key: 'description',
                width: 40,
            },
            {
                header: 'Status',
                key: 'status',
                width: 18,
            },
            {
                header: 'Priority',
                key: 'priority',
                width: 15,
            },
            {
                header: 'Due Date',
                key: 'dueDate',
                width: 22,
            },
            {
                header: 'Creator',
                key: 'creator',
                width: 25,
            },
            {
                header: 'Assignee',
                key: 'assignee',
                width: 25,
            },
            {
                header: 'Created At',
                key: 'createdAt',
                width: 22,
            },
        ];


        for (const task of tasks) {
            worksheet.addRow({
                title: task.title,

                description:
                    task.description || '',

                status:
                    task.status,

                priority:
                    task.priority,

                dueDate:
                    task.dueDate || '',

                creator:
                    task.creator.name,

                assignee:
                    task.assignee?.name || '',

                createdAt:
                    task.createdAt,
            });
        }


        const buffer =
            await workbook.xlsx.writeBuffer();


        return buffer;
    }


    // =====================================================
    // EXCEL IMPORT
    // =====================================================

    async importTasks(
        userId: string,
        buffer: Buffer
    ) {
        const workbook =
            new ExcelJS.Workbook();


        await workbook.xlsx.load(
            buffer as any
        );


        const worksheet =
            workbook.getWorksheet('Tasks')
            || workbook.worksheets[0];


        if (!worksheet) {
            throw new AppError(
                'Excel worksheet not found',
                400
            );
        }


        const createdTasks = [];


        for (
            let rowNumber = 2;
            rowNumber <= worksheet.rowCount;
            rowNumber++
        ) {
            const row =
                worksheet.getRow(rowNumber);


            const title =
                row
                    .getCell(1)
                    .text
                    .trim();


            const description =
                row
                    .getCell(2)
                    .text
                    .trim();


            const status =
                row
                    .getCell(3)
                    .text
                    .trim();


            const priority =
                row
                    .getCell(4)
                    .text
                    .trim();


            const dueDateText =
                row
                    .getCell(5)
                    .text
                    .trim();


            if (!title) {
                continue;
            }


            const validStatuses = [
                'TODO',
                'IN_PROGRESS',
                'REVIEW',
                'DONE',
            ];


            const validPriorities = [
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL',
            ];


            const task =
                await prisma.task.create({
                    data: {
                        title,

                        description:
                            description
                            || undefined,

                        status:
                            validStatuses.includes(
                                status
                            )
                                ? status as
                                | 'TODO'
                                | 'IN_PROGRESS'
                                | 'REVIEW'
                                | 'DONE'
                                : 'TODO',

                        priority:
                            validPriorities.includes(
                                priority
                            )
                                ? priority as
                                | 'LOW'
                                | 'MEDIUM'
                                | 'HIGH'
                                | 'CRITICAL'
                                : 'MEDIUM',

                        dueDate:
                            dueDateText
                                ? new Date(
                                    dueDateText
                                )
                                : undefined,

                        creatorId:
                            userId,
                    },
                });


            if (
                task.dueDate &&
                task.status !== 'DONE'
            ) {
                await scheduleTaskReminder(
                    task.id,
                    task.title,
                    userId,
                    task.dueDate
                );
            }


            createdTasks.push(
                task
            );
        }


        return {
            imported:
                createdTasks.length,

            tasks:
                createdTasks,
        };
    }


    // =====================================================
    // ANALYTICS
    // =====================================================

    async getAnalytics(
        userId: string
    ) {
        const now =
            new Date();


        const userTasksWhere = {
            OR: [
                {
                    creatorId: userId,
                },
                {
                    assigneeId: userId,
                },
            ],
        };


        const [
            total,
            todo,
            inProgress,
            review,
            done,
            overdue,
        ] = await Promise.all([

            prisma.task.count({
                where:
                    userTasksWhere,
            }),

            prisma.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'TODO',
                },
            }),

            prisma.task.count({
                where: {
                    ...userTasksWhere,
                    status:
                        'IN_PROGRESS',
                },
            }),

            prisma.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'REVIEW',
                },
            }),

            prisma.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'DONE',
                },
            }),

            prisma.task.count({
                where: {
                    ...userTasksWhere,

                    dueDate: {
                        lt: now,
                    },

                    status: {
                        not: 'DONE',
                    },
                },
            }),
        ]);


        const completionRate =
            total === 0
                ? 0
                : Number(
                    (
                        (done / total)
                        * 100
                    ).toFixed(1)
                );


        return {
            total,
            todo,
            inProgress,
            review,
            done,
            overdue,
            completionRate,
        };
    }


    // =====================================================
    // ADD DEPENDENCY
    // =====================================================

    async addDependency(
        userId: string,
        taskId: string,
        blockingTaskId: string
    ) {
        // Task өзіне тәуелді бола алмайды
        if (
            taskId === blockingTaskId
        ) {
            throw new AppError(
                'Task cannot depend on itself',
                400
            );
        }


        // Blocked Task
        const task =
            await prisma.task.findFirst({
                where: {
                    id: taskId,

                    OR: [
                        {
                            creatorId: userId,
                        },
                        {
                            assigneeId: userId,
                        },
                    ],
                },
            });


        if (!task) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        // Blocking Task
        const blockingTask =
            await prisma.task.findFirst({
                where: {
                    id: blockingTaskId,

                    OR: [
                        {
                            creatorId: userId,
                        },
                        {
                            assigneeId: userId,
                        },
                    ],
                },
            });


        if (!blockingTask) {
            throw new AppError(
                'Blocking task not found',
                404
            );
        }


        // Бір dependency екі рет қосылып кетпесін
        const existingDependency =
            await prisma.taskDependency.findFirst({
                where: {
                    blockedTaskId:
                        taskId,

                    blockingTaskId,
                },
            });


        if (existingDependency) {
            throw new AppError(
                'Dependency already exists',
                409
            );
        }


        const dependency =
            await prisma.taskDependency.create({
                data: {
                    blockedTaskId:
                        taskId,

                    blockingTaskId,
                },

                include: {
                    blockedTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                        },
                    },

                    blockingTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                        },
                    },
                },
            });


        return dependency;
    }


    // =====================================================
    // GET DEPENDENCIES
    // =====================================================

    async getDependencies(
        userId: string,
        taskId: string
    ) {
        const task =
            await prisma.task.findFirst({
                where: {
                    id: taskId,

                    OR: [
                        {
                            creatorId: userId,
                        },
                        {
                            assigneeId: userId,
                        },
                    ],
                },
            });


        if (!task) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        const dependencies =
            await prisma.taskDependency.findMany({
                where: {
                    blockedTaskId:
                        taskId,
                },

                include: {
                    blockingTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            dueDate: true,
                        },
                    },
                },
            });


        return dependencies;
    }


    // =====================================================
    // REMOVE DEPENDENCY
    // =====================================================

    async removeDependency(
        userId: string,
        taskId: string,
        dependencyId: string
    ) {
        const task =
            await prisma.task.findFirst({
                where: {
                    id: taskId,

                    OR: [
                        {
                            creatorId: userId,
                        },
                        {
                            assigneeId: userId,
                        },
                    ],
                },
            });


        if (!task) {
            throw new AppError(
                'Task not found',
                404
            );
        }


        const dependency =
            await prisma.taskDependency.findFirst({
                where: {
                    id:
                        dependencyId,

                    blockedTaskId:
                        taskId,
                },
            });


        if (!dependency) {
            throw new AppError(
                'Dependency not found',
                404
            );
        }


        await prisma.taskDependency.delete({
            where: {
                id:
                    dependencyId,
            },
        });


        return {
            message:
                'Dependency removed successfully',
        };
    }
}