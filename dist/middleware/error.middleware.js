"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const AppError_1 = require("../utils/AppError");
const env_1 = require("../config/env");
function errorMiddleware(err, _req, res, _next) {
    if (err instanceof AppError_1.AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }
    console.error(err);
    return res.status(500).json({
        error: 'Internal server error',
        ...(env_1.env.NODE_ENV !== 'production' && {
            details: err.message,
        }),
    });
}
