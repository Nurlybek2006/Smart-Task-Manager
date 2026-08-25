import { Request, Response, NextFunction } from 'express';
interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export {};
