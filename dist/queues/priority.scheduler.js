"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPriorityScheduler = setupPriorityScheduler;
const reminder_queue_1 = require("./reminder.queue");
async function setupPriorityScheduler() {
    await reminder_queue_1.reminderQueue.upsertJobScheduler('priority-recalculator', {
        pattern: '*/5 * * * *',
    }, {
        name: 'recalculate-priorities',
        data: {},
    });
    console.log('🧠 Priority scheduler initialized');
}
