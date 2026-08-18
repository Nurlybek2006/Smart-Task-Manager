export type TaskPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export function calculatePriority(
  dueDate?: Date | null
): TaskPriority {
  if (!dueDate) {
    return 'MEDIUM';
  }

  const now = new Date();

  const differenceMs =
    dueDate.getTime() - now.getTime();

  const differenceDays =
    differenceMs / (1000 * 60 * 60 * 24);

  // Мерзімі өтіп кеткен
  if (differenceDays <= 0) {
    return 'CRITICAL';
  }

  // 1 күннен аз
  if (differenceDays <= 1) {
    return 'CRITICAL';
  }

  // 3 күнге дейін
  if (differenceDays <= 3) {
    return 'HIGH';
  }

  // 7 күнге дейін
  if (differenceDays <= 7) {
    return 'MEDIUM';
  }

  return 'LOW';
}