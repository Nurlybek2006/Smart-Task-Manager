import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';

import authRoutes from './modules/auth/auth.routes';
import taskRoutes from './modules/tasks/task.routes';
import './queues/reminder.worker';
import { reminderQueue } from './queues/reminder.queue';
import { setupOverdueScheduler } from './queues/overdue.scheduler';
import { initializeSocket } from './config/socket';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// BullMQ test
app.get('/test-reminder', async (_req, res) => {
  await reminderQueue.add(
    'test-reminder',
    {
      taskId: '123',
      title: 'BullMQ тест',
      userId: '456',
    },
    {
      delay: 5000,
    }
  );

  res.json({
    message: 'Reminder 5 секундтан кейін іске қосылады',
  });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err.stack);

  res.status(500).json({
    error: 'Something went wrong!',
  });
});

const httpServer = createServer(app);

initializeSocket(httpServer);


// Серверді іске қосу — ең соңында
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ Socket.io ready`);
});

setupOverdueScheduler().catch(console.error);
