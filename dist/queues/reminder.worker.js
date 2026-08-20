"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = __importDefault(require("../config/redis"));
const prisma_1 = __importDefault(require("../database/prisma"));
const socket_1 = require("../config/socket");
const priority_util_1 = require("../utils/priority.util");
exports.reminderWorker = new bullmq_1.Worker('task-reminders', async (job) => {
    if (job.name === 'task-reminder') {
        console.log('🔔 TASK REMINDER');
        console.log('Task ID:', job.data.taskId);
        console.log('Title:', job.data.title);
        console.log('User ID:', job.data.userId);
        const io = (0, socket_1.getIO)();
        io.to(`user:${job.data.userId}`).emit('notification:reminder', {
            taskId: job.data.taskId,
            title: job.data.title,
            message: `Task "${job.data.title}" мерзімі келді`,
        });
        return;
    }
    if (job.name === 'check-overdue-tasks') {
        console.log('⏱️ Checking overdue tasks...');
        const now = new Date();
        const overdueTasks = await prisma_1.default.task.findMany({
            where: {
                dueDate: {
                    lt: now,
                },
                status: {
                    not: 'DONE',
                },
            },
        });
        console.log(`⚠️ Overdue tasks found: ${overdueTasks.length}`);
        for (const task of overdueTasks) {
            console.log(`⚠️ OVERDUE: ${task.title}`);
        }
        return;
    }
    if (job.name === 'recalculate-priorities') {
        console.log('🧠 Recalculating task priorities...');
        const tasks = await prisma_1.default.task.findMany({
            where: {
                status: {
                    not: 'DONE',
                },
            },
        });
        let changedCount = 0;
        for (const task of tasks) {
            const newPriority = (0, priority_util_1.calculatePriority)(task.dueDate);
            if (newPriority !== task.priority) {
                const updatedTask = await prisma_1.default.task.update({
                    where: {
                        id: task.id,
                    },
                    data: {
                        priority: newPriority,
                    },
                });
                changedCount++;
                const io = (0, socket_1.getIO)();
                io.to(`user:${task.creatorId}`).emit('task:priorityChanged', updatedTask);
                if (task.assigneeId &&
                    task.assigneeId !== task.creatorId) {
                    io.to(`user:${task.assigneeId}`).emit('task:priorityChanged', updatedTask);
                }
                console.log(`📌 ${task.title}: ${task.priority} → ${newPriority}`);
            }
        }
        console.log(`✅ Priority recalculation finished. Changed: ${changedCount}`);
        return;
    }
}, {
    connection: redis_1.default,
});
