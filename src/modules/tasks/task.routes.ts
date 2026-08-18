import { Router } from 'express';
import { TaskController } from './task.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = Router();

const taskController = new TaskController();

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Жаңа тапсырма жасау
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Backend API жасау
 *               description:
 *                 type: string
 *                 example: Express және Prisma арқылы API жасау
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-08-20T10:00:00Z
 *     responses:
 *       201:
 *         description: Тапсырма сәтті жасалды
 *       400:
 *         description: Қате сұраныс
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authMiddleware,
  taskController.create.bind(taskController)
);

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Пайдаланушының тапсырмаларын алу
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, REVIEW, DONE]
 *       - in: query
 *         name: dueDate
 *         schema:
 *           type: string
 *           enum: [today, overdue]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Тапсырмалар тізімі
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authMiddleware,
  taskController.getAll.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/export/excel:
 *   get:
 *     tags:
 *       - Excel
 *     summary: Task-тарды Excel файл ретінде экспорттау
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel файл
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
  '/export/excel',
  authMiddleware,
  taskController.exportExcel.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/import/excel:
 *   post:
 *     tags:
 *       - Excel
 *     summary: Excel файлдан Task импорттау
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Task-тар импортталды
 *       400:
 *         description: Excel файл қажет
 */
router.post(
  '/import/excel',
  authMiddleware,
  upload.single('file'),
  taskController.importExcel.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/analytics/summary:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Пайдаланушының Task статистикасын алу
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 todo:
 *                   type: integer
 *                 inProgress:
 *                   type: integer
 *                 review:
 *                   type: integer
 *                 done:
 *                   type: integer
 *                 overdue:
 *                   type: integer
 *                 completionRate:
 *                   type: number
 */
router.get(
  '/analytics/summary',
  authMiddleware,
  taskController.getAnalytics.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/{id}/dependencies:
 *   get:
 *     tags:
 *       - Dependencies
 *     summary: Task dependency-лерін алу
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dependency тізімі
 *       404:
 *         description: Task not found
 */
router.get(
  '/:id/dependencies',
  authMiddleware,
  taskController.getDependencies.bind(
    taskController
  )
);

/**
 * @openapi
 * /api/tasks/{id}/dependencies/{dependencyId}:
 *   delete:
 *     tags:
 *       - Dependencies
 *     summary: Dependency-ді жою
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: dependencyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dependency жойылды
 *       404:
 *         description: Dependency not found
 */
router.delete(
  '/:id/dependencies/:dependencyId',
  authMiddleware,
  taskController.removeDependency.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Бір тапсырманы ID арқылы алу
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Тапсырма табылды
 *       404:
 *         description: Task not found
 */
router.get(
  '/:id',
  authMiddleware,
  taskController.getOne.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/{id}:
 *   put:
 *     tags:
 *       - Tasks
 *     summary: Тапсырманы өзгерту
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, REVIEW, DONE]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Тапсырма жаңартылды
 *       400:
 *         description: Қате сұраныс
 *       404:
 *         description: Task not found
 */
router.put(
  '/:id',
  authMiddleware,
  taskController.update.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Тапсырманы жою
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Тапсырма жойылды
 *       404:
 *         description: Task not found
 */
router.delete(
  '/:id',
  authMiddleware,
  taskController.delete.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/{id}/assign:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Тапсырманы басқа пайдаланушыға тағайындау
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigneeId
 *             properties:
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Тапсырма пайдаланушыға тағайындалды
 *       400:
 *         description: Assignee немесе Task қате
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/:id/assign',
  authMiddleware,
  taskController.assign.bind(taskController)
);

/**
 * @openapi
 * /api/tasks/{id}/dependencies:
 *   post:
 *     tags:
 *       - Dependencies
 *     summary: Task-қа dependency қосу
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Blocked Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockingTaskId
 *             properties:
 *               blockingTaskId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Dependency қосылды
 *       400:
 *         description: Dependency қосу мүмкін емес
 */
router.post(
  '/:id/dependencies',
  authMiddleware,
  taskController.addDependency.bind(
    taskController
  )
);



export default router;