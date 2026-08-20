"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const prisma_1 = __importDefault(require("../../database/prisma"));
const reminder_service_1 = require("../../queues/reminder.service");
const socket_1 = require("../../config/socket");
const exceljs_1 = __importDefault(require("exceljs"));
const priority_util_1 = require("../../utils/priority.util");
const AppError_1 = require("../../utils/AppError");
class TaskService {
    async createTask(userId, data) {
        const parsedDueDate = data.dueDate
            ? new Date(data.dueDate)
            : null;
        const task = await prisma_1.default.task.create({
            data: {
                title: data.title,
                description: data.description,
                priority: (0, priority_util_1.calculatePriority)(parsedDueDate),
                dueDate: parsedDueDate ?? undefined,
                creatorId: userId,
            },
        });
        if (task.status !== 'DONE' &&
            task.dueDate) {
            await (0, reminder_service_1.scheduleTaskReminder)(task.id, task.title, userId, task.dueDate);
        }
        const io = (0, socket_1.getIO)();
        io.to(`user:${userId}`).emit('task:created', task);
        return task;
    }
    async getTasks(userId, status, dueDate, page = 1, limit = 10) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const where = {
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
        const tasks = await prisma_1.default.task.findMany({
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
        const total = await prisma_1.default.task.count({
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
    async getTaskById(userId, taskId) {
        const task = await prisma_1.default.task.findFirst({
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
            throw new AppError_1.AppError('Task not found', 404);
        }
        return task;
    }
    async updateTask(userId, taskId, data) {
        const existingTask = await prisma_1.default.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
            },
        });
        if (!existingTask) {
            throw new AppError_1.AppError('Task not found', 404);
        }
        if (data.status &&
            ['IN_PROGRESS', 'REVIEW', 'DONE']
                .includes(data.status)) {
            const unfinishedDependencies = await prisma_1.default.taskDependency.findMany({
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
            if (unfinishedDependencies.length > 0) {
                const blockingTitles = unfinishedDependencies
                    .map((dependency) => dependency
                    .blockingTask
                    .title)
                    .join(', ');
                throw new AppError_1.AppError(`Task is blocked by unfinished tasks: ${blockingTitles}`, 409);
            }
        }
        const task = await prisma_1.default.task.update({
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
        if (task.status === 'DONE') {
            await (0, reminder_service_1.removeTaskReminder)(task.id);
        }
        else if (task.dueDate) {
            await (0, reminder_service_1.scheduleTaskReminder)(task.id, task.title, userId, task.dueDate);
        }
        else {
            await (0, reminder_service_1.removeTaskReminder)(task.id);
        }
        const io = (0, socket_1.getIO)();
        io.to(`user:${userId}`).emit('task:updated', task);
        return task;
    }
    async deleteTask(userId, taskId) {
        const existingTask = await prisma_1.default.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
            },
        });
        if (!existingTask) {
            throw new AppError_1.AppError('Task not found', 404);
        }
        await (0, reminder_service_1.removeTaskReminder)(taskId);
        await prisma_1.default.task.delete({
            where: {
                id: taskId,
            },
        });
        const io = (0, socket_1.getIO)();
        io.to(`user:${userId}`).emit('task:deleted', {
            taskId,
        });
        return {
            message: 'Task deleted successfully',
        };
    }
    async assignTask(userId, taskId, assigneeId) {
        const task = await prisma_1.default.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
            },
        });
        if (!task) {
            throw new AppError_1.AppError('Task not found', 404);
        }
        const assignee = await prisma_1.default.user.findUnique({
            where: {
                id: assigneeId,
            },
        });
        if (!assignee) {
            throw new AppError_1.AppError('Assignee not found', 404);
        }
        const updatedTask = await prisma_1.default.task.update({
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
        const io = (0, socket_1.getIO)();
        io.to(`user:${userId}`).emit('task:assigned', updatedTask);
        if (assigneeId !== userId) {
            io.to(`user:${assigneeId}`).emit('task:assigned', updatedTask);
        }
        return updatedTask;
    }
    async exportTasks(userId) {
        const tasks = await prisma_1.default.task.findMany({
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
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Tasks');
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
                description: task.description || '',
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate || '',
                creator: task.creator.name,
                assignee: task.assignee?.name || '',
                createdAt: task.createdAt,
            });
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
    async importTasks(userId, buffer) {
        const workbook = new exceljs_1.default.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet('Tasks')
            || workbook.worksheets[0];
        if (!worksheet) {
            throw new AppError_1.AppError('Excel worksheet not found', 400);
        }
        const createdTasks = [];
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const title = row
                .getCell(1)
                .text
                .trim();
            const description = row
                .getCell(2)
                .text
                .trim();
            const status = row
                .getCell(3)
                .text
                .trim();
            const priority = row
                .getCell(4)
                .text
                .trim();
            const dueDateText = row
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
            const task = await prisma_1.default.task.create({
                data: {
                    title,
                    description: description
                        || undefined,
                    status: validStatuses.includes(status)
                        ? status
                        : 'TODO',
                    priority: validPriorities.includes(priority)
                        ? priority
                        : 'MEDIUM',
                    dueDate: dueDateText
                        ? new Date(dueDateText)
                        : undefined,
                    creatorId: userId,
                },
            });
            if (task.dueDate &&
                task.status !== 'DONE') {
                await (0, reminder_service_1.scheduleTaskReminder)(task.id, task.title, userId, task.dueDate);
            }
            createdTasks.push(task);
        }
        return {
            imported: createdTasks.length,
            tasks: createdTasks,
        };
    }
    async getAnalytics(userId) {
        const now = new Date();
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
        const [total, todo, inProgress, review, done, overdue,] = await Promise.all([
            prisma_1.default.task.count({
                where: userTasksWhere,
            }),
            prisma_1.default.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'TODO',
                },
            }),
            prisma_1.default.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'IN_PROGRESS',
                },
            }),
            prisma_1.default.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'REVIEW',
                },
            }),
            prisma_1.default.task.count({
                where: {
                    ...userTasksWhere,
                    status: 'DONE',
                },
            }),
            prisma_1.default.task.count({
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
        const completionRate = total === 0
            ? 0
            : Number(((done / total)
                * 100).toFixed(1));
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
    async addDependency(userId, taskId, blockingTaskId) {
        if (taskId === blockingTaskId) {
            throw new AppError_1.AppError('Task cannot depend on itself', 400);
        }
        const task = await prisma_1.default.task.findFirst({
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
            throw new AppError_1.AppError('Task not found', 404);
        }
        const blockingTask = await prisma_1.default.task.findFirst({
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
            throw new AppError_1.AppError('Blocking task not found', 404);
        }
        const existingDependency = await prisma_1.default.taskDependency.findFirst({
            where: {
                blockedTaskId: taskId,
                blockingTaskId,
            },
        });
        if (existingDependency) {
            throw new AppError_1.AppError('Dependency already exists', 409);
        }
        const dependency = await prisma_1.default.taskDependency.create({
            data: {
                blockedTaskId: taskId,
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
    async getDependencies(userId, taskId) {
        const task = await prisma_1.default.task.findFirst({
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
            throw new AppError_1.AppError('Task not found', 404);
        }
        const dependencies = await prisma_1.default.taskDependency.findMany({
            where: {
                blockedTaskId: taskId,
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
    async removeDependency(userId, taskId, dependencyId) {
        const task = await prisma_1.default.task.findFirst({
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
            throw new AppError_1.AppError('Task not found', 404);
        }
        const dependency = await prisma_1.default.taskDependency.findFirst({
            where: {
                id: dependencyId,
                blockedTaskId: taskId,
            },
        });
        if (!dependency) {
            throw new AppError_1.AppError('Dependency not found', 404);
        }
        await prisma_1.default.taskDependency.delete({
            where: {
                id: dependencyId,
            },
        });
        return {
            message: 'Dependency removed successfully',
        };
    }
}
exports.TaskService = TaskService;
