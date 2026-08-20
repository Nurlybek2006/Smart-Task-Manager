import 'dotenv/config';

import { createServer } from 'http';

import app from './app';
import { initializeSocket } from './config/socket';
import { env } from './config/env';

import prisma from './database/prisma';
import redisConnection from './config/redis';

import './queues/reminder.worker';
import { setupOverdueScheduler } from './queues/overdue.scheduler';
import { setupPriorityScheduler } from './queues/priority.scheduler';

const PORT = env.PORT;

const httpServer = createServer(app);

initializeSocket(httpServer);

setupOverdueScheduler().catch(console.error);
setupPriorityScheduler().catch(console.error);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('⚡ Socket.io ready');
});

async function shutdown(signal: string) {
  console.log(`\n🛑 ${signal} received. Shutting down...`);

  httpServer.close(async () => {
    try {
      await prisma.$disconnect();

      if (redisConnection.status !== 'end') {
        await redisConnection.quit();
      }

      console.log('✅ Database disconnected');
      console.log('✅ Redis disconnected');
      console.log('✅ Server stopped');

      process.exit(0);
    } catch (error) {
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