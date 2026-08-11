import { Router } from 'express';
import { TaskController } from './task.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

const taskController = new TaskController();

router.post(
  '/',
  authMiddleware,
  taskController.create.bind(taskController)
);

router.get(
  '/',
  authMiddleware,
  taskController.getAll.bind(taskController)
);

router.get(
  '/:id',
  authMiddleware,
  taskController.getOne.bind(taskController)
);

router.put(
  '/:id',
  authMiddleware,
  taskController.update.bind(taskController)
);

router.delete(
  '/:id',
  authMiddleware,
  taskController.delete.bind(taskController)
);

export default router;