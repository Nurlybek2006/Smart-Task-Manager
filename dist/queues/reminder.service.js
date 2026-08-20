"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleTaskReminder = scheduleTaskReminder;
exports.removeTaskReminder = removeTaskReminder;
const reminder_queue_1 = require("./reminder.queue");
async function scheduleTaskReminder(taskId, title, userId, dueDate) {
    const jobId = `reminder-${taskId}`;
    const existingJob = await reminder_queue_1.reminderQueue.getJob(jobId);
    if (existingJob) {
        await existingJob.remove();
    }
    const delay = dueDate.getTime() - Date.now();
    if (delay <= 0) {
        return;
    }
    await reminder_queue_1.reminderQueue.add('task-reminder', {
        taskId,
        title,
        userId,
    }, {
        delay,
        jobId,
    });
    console.log(`⏰ Reminder scheduled for task "${title}"`);
}
async function removeTaskReminder(taskId) {
    const jobId = `reminder-${taskId}`;
    const job = await reminder_queue_1.reminderQueue.getJob(jobId);
    if (job) {
        await job.remove();
        console.log(`🗑️ Reminder removed for task ${taskId}`);
    }
}
