"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("./task.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(new Error('Only .xlsx Excel files are allowed'));
        }
        callback(null, true);
    },
});
const router = (0, express_1.Router)();
const taskController = new task_controller_1.TaskController();
router.post('/', auth_middleware_1.authMiddleware, taskController.create.bind(taskController));
router.get('/', auth_middleware_1.authMiddleware, taskController.getAll.bind(taskController));
router.get('/export/excel', auth_middleware_1.authMiddleware, taskController.exportExcel.bind(taskController));
router.post('/import/excel', auth_middleware_1.authMiddleware, upload.single('file'), taskController.importExcel.bind(taskController));
router.get('/analytics/summary', auth_middleware_1.authMiddleware, taskController.getAnalytics.bind(taskController));
router.get('/:id/dependencies', auth_middleware_1.authMiddleware, taskController.getDependencies.bind(taskController));
router.delete('/:id/dependencies/:dependencyId', auth_middleware_1.authMiddleware, taskController.removeDependency.bind(taskController));
router.get('/:id', auth_middleware_1.authMiddleware, taskController.getOne.bind(taskController));
router.put('/:id', auth_middleware_1.authMiddleware, taskController.update.bind(taskController));
router.delete('/:id', auth_middleware_1.authMiddleware, taskController.delete.bind(taskController));
router.patch('/:id/assign', auth_middleware_1.authMiddleware, taskController.assign.bind(taskController));
router.post('/:id/dependencies', auth_middleware_1.authMiddleware, taskController.addDependency.bind(taskController));
exports.default = router;
