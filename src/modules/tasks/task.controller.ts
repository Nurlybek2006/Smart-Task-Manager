import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { TaskService } from './task.service';
import { AppError } from '../../utils/AppError';

const taskService = new TaskService();

export class TaskController {
  async create(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const {
        title,
        description,
        priority,
        dueDate,
      } = req.body;

      if (!title) {
        throw new AppError(
          'Title is required',
          400
        );
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
    } catch (error) {
      next(error);
    }
  }

  async getAll(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const {
        status,
        dueDate,
        page,
        limit,
      } = req.query;

      const parsedPage =
        typeof page === 'string'
          ? parseInt(page, 10)
          : 1;

      const parsedLimit =
        typeof limit === 'string'
          ? parseInt(limit, 10)
          : 10;

      if (
        Number.isNaN(parsedPage) ||
        parsedPage < 1
      ) {
        throw new AppError(
          'Page must be a positive number',
          400
        );
      }

      if (
        Number.isNaN(parsedLimit) ||
        parsedLimit < 1
      ) {
        throw new AppError(
          'Limit must be a positive number',
          400
        );
      }

      const validStatuses = [
        'TODO',
        'IN_PROGRESS',
        'REVIEW',
        'DONE',
      ];

      const parsedStatus =
        typeof status === 'string'
          ? status
          : undefined;

      if (
        parsedStatus &&
        !validStatuses.includes(parsedStatus)
      ) {
        throw new AppError(
          'Invalid status',
          400
        );
      }

      const validDueDateFilters = [
        'today',
        'overdue',
      ];

      const parsedDueDate =
        typeof dueDate === 'string'
          ? dueDate
          : undefined;

      if (
        parsedDueDate &&
        !validDueDateFilters.includes(
          parsedDueDate
        )
      ) {
        throw new AppError(
          'Invalid dueDate filter',
          400
        );
      }

      const result = await taskService.getTasks(
        req.user.userId,
        parsedStatus as
          | 'TODO'
          | 'IN_PROGRESS'
          | 'REVIEW'
          | 'DONE'
          | undefined,
        parsedDueDate as
          | 'today'
          | 'overdue'
          | undefined,
        parsedPage,
        parsedLimit
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getOne(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;

      if (typeof id !== 'string') {
        throw new AppError(
          'Invalid task ID',
          400
        );
      }

      const task =
        await taskService.getTaskById(
          req.user.userId,
          id
        );

      return res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;

      if (typeof id !== 'string') {
        throw new AppError(
          'Invalid task ID',
          400
        );
      }

      const {
        title,
        description,
        status,
        priority,
        dueDate,
      } = req.body;

      const validStatuses = [
        'TODO',
        'IN_PROGRESS',
        'REVIEW',
        'DONE',
      ];

      if (
        status &&
        !validStatuses.includes(status)
      ) {
        throw new AppError(
          'Invalid status',
          400
        );
      }

      const validPriorities = [
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL',
      ];

      if (
        priority &&
        !validPriorities.includes(priority)
      ) {
        throw new AppError(
          'Invalid priority',
          400
        );
      }

      const task =
        await taskService.updateTask(
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
    } catch (error) {
      next(error);
    }
  }

  async delete(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;

      if (typeof id !== 'string') {
        throw new AppError(
          'Invalid task ID',
          400
        );
      }

      const result =
        await taskService.deleteTask(
          req.user.userId,
          id
        );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async assign(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { assigneeId } = req.body;

      if (typeof id !== 'string') {
        throw new AppError(
          'Invalid task ID',
          400
        );
      }

      if (
        !assigneeId ||
        typeof assigneeId !== 'string'
      ) {
        throw new AppError(
          'assigneeId is required',
          400
        );
      }

      const task =
        await taskService.assignTask(
          req.user.userId,
          id,
          assigneeId
        );

      return res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async addDependency(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { blockingTaskId } = req.body;

      if (typeof id !== 'string') {
        throw new AppError(
          'Invalid task ID',
          400
        );
      }

      if (
        !blockingTaskId ||
        typeof blockingTaskId !== 'string'
      ) {
        throw new AppError(
          'blockingTaskId is required',
          400
        );
      }

      const dependency =
        await taskService.addDependency(
          req.user.userId,
          id,
          blockingTaskId
        );

      return res
        .status(201)
        .json(dependency);
    } catch (error) {
      next(error);
    }
  }

  async getDependencies(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;

      if (typeof id !== 'string') {
        throw new AppError(
          'Invalid task ID',
          400
        );
      }

      const dependencies =
        await taskService.getDependencies(
          req.user.userId,
          id
        );

      return res
        .status(200)
        .json(dependencies);
    } catch (error) {
      next(error);
    }
  }

  async removeDependency(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const {
        id,
        dependencyId,
      } = req.params;

      if (
        typeof id !== 'string' ||
        typeof dependencyId !== 'string'
      ) {
        throw new AppError(
          'Invalid ID',
          400
        );
      }

      const result =
        await taskService.removeDependency(
          req.user.userId,
          id,
          dependencyId
        );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const buffer =
        await taskService.exportTasks(
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

      return res.send(
        Buffer.from(buffer)
      );
    } catch (error) {
      next(error);
    }
  }

  async importExcel(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      if (!req.file) {
        throw new AppError(
          'Excel file is required',
          400
        );
      }

      const result =
        await taskService.importTasks(
          req.user.userId,
          req.file.buffer
        );

      return res
        .status(201)
        .json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const analytics =
        await taskService.getAnalytics(
          req.user.userId
        );

      return res
        .status(200)
        .json(analytics);
    } catch (error) {
      next(error);
    }
  }
}