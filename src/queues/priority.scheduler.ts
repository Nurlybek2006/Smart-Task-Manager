import { reminderQueue } from './reminder.queue';

export async function setupPriorityScheduler() {
  await reminderQueue.upsertJobScheduler(
    'priority-recalculator',
    {
      pattern: '*/5 * * * *',
    },
    {
      name: 'recalculate-priorities',
      data: {},
    }
  );

  console.log('🧠 Priority scheduler initialized');
}