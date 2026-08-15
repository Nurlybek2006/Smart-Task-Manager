import { reminderQueue } from './reminder.queue';

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  userId: string,
  dueDate: Date
) {
  const jobId = `reminder-${taskId}`;

  // Бұрынғы reminder бар болса өшіреміз
  const existingJob = await reminderQueue.getJob(jobId);

  if (existingJob) {
    await existingJob.remove();
  }

  const delay = dueDate.getTime() - Date.now();

  // Мерзімі өтіп кеткен болса reminder жасамаймыз
  if (delay <= 0) {
    return;
  }

  await reminderQueue.add(
    'task-reminder',
    {
      taskId,
      title,
      userId,
    },
    {
      delay,
      jobId,
    }
  );

  console.log(
    `⏰ Reminder scheduled for task "${title}"`
  );
}

export async function removeTaskReminder(
  taskId: string
) {
  const jobId = `reminder-${taskId}`;

  const job = await reminderQueue.getJob(jobId);

  if (job) {
    await job.remove();

    console.log(
      `🗑️ Reminder removed for task ${taskId}`
    );
  }
}