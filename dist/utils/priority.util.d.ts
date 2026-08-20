export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export declare function calculatePriority(dueDate?: Date | null): TaskPriority;
