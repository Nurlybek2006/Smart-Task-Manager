import { Worker } from 'bullmq';
import redisConnection from '../config/redis';
import prisma from '../database/prisma';
import { getIO } from '../config/socket';
import { calculatePriority } from '../utils/priority.util';

export const reminderWorker = new Worker(
  'task-reminders',

  async (job) => {
    if (job.name === 'task-reminder') {
      console.log('🔔 TASK REMINDER');
      console.log('Task ID:', job.data.taskId);
      console.log('Title:', job.data.title);
      console.log('User ID:', job.data.userId);

      const io = getIO();

      io.to(`user:${job.data.userId}`).emit(
        'notification:reminder',
        {
          taskId: job.data.taskId,
          title: job.data.title,
          message: `Task "${job.data.title}" мерзімі келді`,
        }
      );

      return;
    }

    if (job.name === 'check-overdue-tasks') {
      console.log('⏱️ Checking overdue tasks...');

      const now = new Date();

      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: {
            lt: now,
          },

          status: {
            not: 'DONE',
          },
        },
      });

      console.log(
        `⚠️ Overdue tasks found: ${overdueTasks.length}`
      );

      for (const task of overdueTasks) {
        console.log(
          `⚠️ OVERDUE: ${task.title}`
        );
      }

      return;
    }

    if (job.name === 'recalculate-priorities') {
      console.log('🧠 Recalculating task priorities...');

      const tasks = await prisma.task.findMany({
        where: {
          status: {
            not: 'DONE',
          },
        },
      });

      let changedCount = 0;

      for (const task of tasks) {
        const newPriority = calculatePriority(task.dueDate);

        if (newPriority !== task.priority) {
          const updatedTask = await prisma.task.update({
            where: {
              id: task.id,
            },
            data: {
              priority: newPriority,
            },
          });

          changedCount++;

          const io = getIO();

          io.to(`user:${task.creatorId}`).emit(
            'task:priorityChanged',
            updatedTask
          );

          if (
            task.assigneeId &&
            task.assigneeId !== task.creatorId
          ) {
            io.to(`user:${task.assigneeId}`).emit(
              'task:priorityChanged',
              updatedTask
            );
          }

          console.log(
            `📌 ${task.title}: ${task.priority} → ${newPriority}`
          );
        }
      }

      console.log(
        `✅ Priority recalculation finished. Changed: ${changedCount}`
      );

      return;
    }

  },

  {
    connection: redisConnection,
  }
);