import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

const authController = new AuthController();
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Жаңа пайдаланушы тіркеу
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *               name:
 *                 type: string
 *                 example: Nurlybek
 *     responses:
 *       201:
 *         description: Пайдаланушы сәтті тіркелді
 *       400:
 *         description: Қате сұраныс
 */
router.post(
    '/register',
    authController.register.bind(authController)
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Пайдаланушы логині
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: nurlybek2@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login сәтті
 *       401:
 *         description: Email немесе пароль қате
 */
router.post(
    '/login',
    authController.login.bind(authController)
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Қазіргі пайдаланушы профилін алу
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Пайдаланушы профилі
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/me',
    authMiddleware,
    authController.me.bind(authController)
);

export default router;