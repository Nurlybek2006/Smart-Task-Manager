"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Smart Task Manager API',
            version: '1.0.0',
            description: 'Jira/Trello стиліндегі тапсырмаларды басқару жүйесінің API документациясы',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: [
        './src/modules/**/*.routes.ts',
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
