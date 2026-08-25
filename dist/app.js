"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const task_routes_1 = __importDefault(require("./modules/tasks/task.routes"));
const swagger_1 = require("./config/swagger");
const env_1 = require("./config/env");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.CLIENT_URL,
    credentials: true,
}));
app.use(express_1.default.json({
    limit: '100kb',
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '100kb',
}));
if (env_1.env.NODE_ENV === 'production') {
    app.use((0, morgan_1.default)('combined'));
}
else {
    app.use((0, morgan_1.default)('dev'));
}
if (env_1.env.NODE_ENV !== 'test') {
    app.use('/api', rateLimit_middleware_1.apiLimiter);
    app.use('/api/auth', rateLimit_middleware_1.authLimiter);
}
app.use('/api/auth', auth_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
if (env_1.env.ENABLE_SWAGGER) {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
}
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
    });
});
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
