import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import prisma from '../../database/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      // Қарапайым валидация
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password and name are required' });
      }

      const result = await authService.register(email, password, name);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const result = await authService.login(email, password);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({
        error: error.message,
      });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
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
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.status(200).json(user);
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
}