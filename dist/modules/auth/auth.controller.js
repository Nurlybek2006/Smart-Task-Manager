"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const prisma_1 = __importDefault(require("../../database/prisma"));
const AppError_1 = require("../../utils/AppError");
const authService = new auth_service_1.AuthService();
class AuthController {
    async register(req, res, next) {
        try {
            const { email, password, name } = req.body;
            if (!email || !password || !name) {
                throw new AppError_1.AppError('Email, password and name are required', 400);
            }
            const result = await authService.register(email, password, name);
            return res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                throw new AppError_1.AppError('Email and password are required', 400);
            }
            const result = await authService.login(email, password);
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async me(req, res, next) {
        try {
            if (!req.user) {
                throw new AppError_1.AppError('Unauthorized', 401);
            }
            const user = await prisma_1.default.user.findUnique({
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
                throw new AppError_1.AppError('User not found', 404);
            }
            return res.status(200).json(user);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
