import { reminderQueue } from './reminder.queue';

export async function setupOverdueScheduler() {
  await reminderQueue.upsertJobScheduler(
    'overdue-task-checker',
    {
      pattern: '* * * * *',
    },
    {
      name: 'check-overdue-tasks',
      data: {},
    }
  );

  console.log('⏱️ Overdue scheduler initialized');
}