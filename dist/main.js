"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./config/socket");
const env_1 = require("./config/env");
const prisma_1 = __importDefault(require("./database/prisma"));
const redis_1 = __importDefault(require("./config/redis"));
require("./queues/reminder.worker");
const overdue_scheduler_1 = require("./queues/overdue.scheduler");
const priority_scheduler_1 = require("./queues/priority.scheduler");
const PORT = env_1.env.PORT;
const httpServer = (0, http_1.createServer)(app_1.default);
(0, socket_1.initializeSocket)(httpServer);
(0, overdue_scheduler_1.setupOverdueScheduler)().catch(console.error);
(0, priority_scheduler_1.setupPriorityScheduler)().catch(console.error);
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log('⚡ Socket.io ready');
});
async function shutdown(signal) {
    console.log(`\n🛑 ${signal} received. Shutting down...`);
    httpServer.close(async () => {
        try {
            await prisma_1.default.$disconnect();
            if (redis_1.default.status !== 'end') {
                await redis_1.default.quit();
            }
            console.log('✅ Database disconnected');
            console.log('✅ Redis disconnected');
            console.log('✅ Server stopped');
            process.exit(0);
        }
        catch (error) {
            console.error('❌ Shutdown error:', error);
            process.exit(1);
        }
    });
    setTimeout(() => {
        console.error('❌ Forced shutdown');
        process.exit(1);
    }, 10000).unref();
}
process.on('SIGINT', () => {
    void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});
