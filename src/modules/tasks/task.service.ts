import prisma from '../../database/prisma';
import {
    scheduleTaskReminder,
    removeTaskReminder,
} from '../../queues/reminder.service';
import { getIO } from '../../config/socket';

interface CreateTaskData {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dueDate?: string;
}

export class TaskService {
    async createTask(userId: string, data: CreateTaskData) {
        const task = await prisma.task.create({
            data: {
                title: data.title,
                description: data.description,
                priority: data.priority,
                dueDate: data.dueDate
                    ? new Date(data.dueDate)
                    : undefined,

                creatorId: userId,
            },
        });

        if (task.status === 'DONE') {
            await removeTaskReminder(task.id);
        } else if (task.dueDate) {
            await scheduleTaskReminder(
                task.id,
                task.title,
                userId,
                task.dueDate
            );
        } else {
            await removeTaskReminder(task.id);
        }
        const io = getIO();

        io.to(`user:${userId}`).emit(
            'task:created',
            task
        );

        return task;
    }

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

        if (status) {
            where.status = status;
        }

        if (dueDate === 'today') {
            where.dueDate = {
                gte: startOfToday,
                lt: endOfToday,
            };
        }

        if (dueDate === 'overdue') {
            where.dueDate = {
                lt: now,
            };
        }

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
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getTaskById(userId: string, taskId: string) {
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
            throw new Error('Task not found');
        }

        return task;
    }

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
        // Алдымен Task осы пайдаланушыға тиесілі ме?
        const existingTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
            },
        });

        if (!existingTask) {
            throw new Error('Task not found');
        }

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

        if (task.dueDate) {
            await scheduleTaskReminder(
                task.id,
                task.title,
                userId,
                task.dueDate
            );
        } else {
            await removeTaskReminder(task.id);
        }
        const io = getIO();

        io.to(`user:${userId}`).emit(
            'task:updated',
            task
        );

        return task;
    }

    async deleteTask(userId: string, taskId: string) {
        const existingTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
            },
        });

        if (!existingTask) {
            throw new Error('Task not found');
        }

        await removeTaskReminder(taskId);

        await prisma.task.delete({
            where: {
                id: taskId,
            },
        });

        const io = getIO();

        io.to(`user:${userId}`).emit(
            'task:deleted',
            {
                taskId,
            }
        );

        return {
            message: 'Task deleted successfully',
        };
    }


    async assignTask(
        userId: string,
        taskId: string,
        assigneeId: string
    ) {
        // 1. Task бар ма және оны қазіргі User құрған ба?
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
            },
        });

        if (!task) {
            throw new Error('Task not found');
        }

        // 2. Тағайындалатын User бар ма?
        const assignee = await prisma.user.findUnique({
            where: {
                id: assigneeId,
            },
        });

        if (!assignee) {
            throw new Error('Assignee not found');
        }

        // 3. Task-ты User-ге тағайындау
        const updatedTask = await prisma.task.update({
            where: {
                id: taskId,
            },
            data: {
                assigneeId: assigneeId,
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

        io.to(`user:${userId}`).emit(
            'task:assigned',
            updatedTask
        );

        io.to(`user:${assigneeId}`).emit(
            'task:assigned',
            updatedTask
        );



        return updatedTask;

    }
}