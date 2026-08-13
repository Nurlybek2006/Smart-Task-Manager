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
}