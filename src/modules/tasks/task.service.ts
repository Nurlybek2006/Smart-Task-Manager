import prisma from '../../database/prisma';

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
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,

                // JWT арқылы келген пайдаланушы
                creatorId: userId,
            },
        });

        return task;
    }

    async getTasks(userId: string) {
        const tasks = await prisma.task.findMany({
            where: {
                creatorId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return tasks;
    }

    async getTaskById(userId: string, taskId: string) {
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                creatorId: userId,
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

        await prisma.task.delete({
            where: {
                id: taskId,
            },
        });

        return {
            message: 'Task deleted successfully',
        };
    }
}