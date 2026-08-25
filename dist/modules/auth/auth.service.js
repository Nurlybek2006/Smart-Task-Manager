"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../database/prisma"));
const AppError_1 = require("../../utils/AppError");
const env_1 = require("../../config/env");
class AuthService {
    async register(email, password, name) {
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new AppError_1.AppError('User already exists', 409);
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return { user: { id: user.id, email: user.email, name: user.name }, token };
    }
    async login(email, password) {
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new AppError_1.AppError('Invalid email or password', 401);
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
        }, env_1.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token,
        };
    }
}
exports.AuthService = AuthService;
