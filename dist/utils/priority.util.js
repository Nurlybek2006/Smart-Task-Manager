"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePriority = calculatePriority;
function calculatePriority(dueDate) {
    if (!dueDate) {
        return 'MEDIUM';
    }
    const now = new Date();
    const differenceMs = dueDate.getTime() - now.getTime();
    const differenceDays = differenceMs / (1000 * 60 * 60 * 24);
    if (differenceDays <= 0) {
        return 'CRITICAL';
    }
    if (differenceDays <= 1) {
        return 'CRITICAL';
    }
    if (differenceDays <= 3) {
        return 'HIGH';
    }
    if (differenceDays <= 7) {
        return 'MEDIUM';
    }
    return 'LOW';
}
