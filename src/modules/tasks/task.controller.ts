import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { TaskService } from './task.service';

const taskService = new TaskService();

export class TaskController {
    async create(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { title, description, priority, dueDate } = req.body;

            if (!title) {
                return res.status(400).json({
                    error: 'Title is required',
                });
            }

            const task = await taskService.createTask(
                req.user.userId,
                {
                    title,
                    description,
                    priority,
                    dueDate,
                }
            );

            return res.status(201).json(task);
        } catch (error: any) {
            return res.status(500).json({
                error: error.message,
            });
        }
    }

    async getAll(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { status, dueDate, page, limit } = req.query;

            const parsedPage =
                typeof page === 'string' ? parseInt(page) : 1;

            const parsedLimit =
                typeof limit === 'string' ? parseInt(limit) : 10;

            const result = await taskService.getTasks(
                req.user.userId,

                typeof status === 'string'
                    ? status as 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
                    : undefined,

                typeof dueDate === 'string'
                    ? dueDate as 'today' | 'overdue'
                    : undefined,

                parsedPage,
                parsedLimit
            );

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: error.message,
            });
        }
    }

    async getOne(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id } = req.params;

            if (typeof id !== 'string') {
                return res.status(400).json({
                    error: 'Invalid task ID',
                });
            }

            const task = await taskService.getTaskById(
                req.user.userId,
                id
            );

            return res.status(200).json(task);
        } catch (error: any) {
            return res.status(404).json({
                error: error.message,
            });
        }
    }

    async update(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id } = req.params;

            if (typeof id !== 'string') {
                return res.status(400).json({
                    error: 'Invalid task ID',
                });
            }

            const {
                title,
                description,
                status,
                priority,
                dueDate,
            } = req.body;

            const task = await taskService.updateTask(
                req.user.userId,
                id,
                {
                    title,
                    description,
                    status,
                    priority,
                    dueDate,
                }
            );

            return res.status(200).json(task);
        } catch (error: any) {
            return res.status(404).json({
                error: error.message,
            });
        }
    }

    async delete(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id } = req.params;

            if (typeof id !== 'string') {
                return res.status(400).json({
                    error: 'Invalid task ID',
                });
            }

            const result = await taskService.deleteTask(
                req.user.userId,
                id
            );

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(404).json({
                error: error.message,
            });
        }
    }


    async assign(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id } = req.params;
            const { assigneeId } = req.body;

            if (typeof id !== 'string') {
                return res.status(400).json({
                    error: 'Invalid task ID',
                });
            }

            if (!assigneeId || typeof assigneeId !== 'string') {
                return res.status(400).json({
                    error: 'assigneeId is required',
                });
            }

            const task = await taskService.assignTask(
                req.user.userId,
                id,
                assigneeId
            );

            return res.status(200).json(task);
        } catch (error: any) {
            return res.status(400).json({
                error: error.message,
            });
        }
    }

    async exportExcel(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const buffer = await taskService.exportTasks(
                req.user.userId
            );

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="tasks.xlsx"'
            );

            return res.send(Buffer.from(buffer));
        } catch (error: any) {
            return res.status(500).json({
                error: error.message,
            });
        }
    }

    async importExcel(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    error: 'Excel file is required',
                });
            }

            const result = await taskService.importTasks(
                req.user.userId,
                req.file.buffer
            );

            return res.status(201).json(result);
        } catch (error: any) {
            return res.status(500).json({
                error: error.message,
            });
        }
    }

    async getAnalytics(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const analytics = await taskService.getAnalytics(
                req.user.userId
            );

            return res.status(200).json(analytics);
        } catch (error: any) {
            return res.status(500).json({
                error: error.message,
            });
        }
    }

    async addDependency(
        req: AuthRequest,
        res: Response
    ) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id } = req.params;
            const { blockingTaskId } = req.body;

            if (typeof id !== 'string') {
                return res.status(400).json({
                    error: 'Invalid task ID',
                });
            }

            if (
                !blockingTaskId ||
                typeof blockingTaskId !== 'string'
            ) {
                return res.status(400).json({
                    error: 'blockingTaskId is required',
                });
            }

            const dependency =
                await taskService.addDependency(
                    req.user.userId,
                    id,
                    blockingTaskId
                );

            return res.status(201).json(
                dependency
            );
        } catch (error: any) {
            return res.status(400).json({
                error: error.message,
            });
        }
    }

    async getDependencies(
        req: AuthRequest,
        res: Response
    ) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id } = req.params;

            if (typeof id !== 'string') {
                return res.status(400).json({
                    error: 'Invalid task ID',
                });
            }

            const dependencies =
                await taskService.getDependencies(
                    req.user.userId,
                    id
                );

            return res.status(200).json(dependencies);
        } catch (error: any) {
            return res.status(404).json({
                error: error.message,
            });
        }
    }

    async removeDependency(
        req: AuthRequest,
        res: Response
    ) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                });
            }

            const { id, dependencyId } = req.params;

            if (
                typeof id !== 'string' ||
                typeof dependencyId !== 'string'
            ) {
                return res.status(400).json({
                    error: 'Invalid ID',
                });
            }

            const result = await taskService.removeDependency(
                req.user.userId,
                id,
                dependencyId
            );

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(404).json({
                error: error.message,
            });
        }
    }
}