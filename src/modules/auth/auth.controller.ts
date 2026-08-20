import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import prisma from '../../database/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';

const authService = new AuthService();

export class AuthController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        throw new AppError(
          'Email, password and name are required',
          400
        );
      }

      const result = await authService.register(
        email,
        password,
        name
      );

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(
          'Email and password are required',
          400
        );
      }

      const result = await authService.login(
        email,
        password
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async me(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError(
          'Unauthorized',
          401
        );
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError(
          'User not found',
          404
        );
      }

      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}