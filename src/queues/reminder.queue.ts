import { Queue } from 'bullmq';
import redisConnection from '../config/redis';

export const reminderQueue = new Queue('task-reminders', {
  connection: redisConnection,
});