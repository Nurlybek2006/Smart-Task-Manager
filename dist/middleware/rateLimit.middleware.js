"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
exports.apiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: 'Too many requests. Please try again later.',
    },
});
exports.authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts. Please try again later.',
    },
});
