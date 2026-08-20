"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOverdueScheduler = setupOverdueScheduler;
const reminder_queue_1 = require("./reminder.queue");
async function setupOverdueScheduler() {
    await reminder_queue_1.reminderQueue.upsertJobScheduler('overdue-task-checker', {
        pattern: '* * * * *',
    }, {
        name: 'check-overdue-tasks',
        data: {},
    });
    console.log('⏱️ Overdue scheduler initialized');
}
