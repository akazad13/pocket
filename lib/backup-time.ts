// Pure backup timing helpers (client and server safe, no database imports).
export function formatLastBackup(timestamp: number | null, now = Date.now()): { days: number; text: string; isOverdue: boolean } {
  if (timestamp === null || !Number.isFinite(timestamp)) {
    return { days: -1, text: 'Never backed up on this device', isOverdue: true };
  }
  const diffMs = Math.max(0, now - timestamp);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return { days: 0, text: 'Backed up today', isOverdue: false };
  }
  if (days === 1) {
    return { days: 1, text: 'Backed up yesterday', isOverdue: false };
  }
  return {
    days,
    text: `Backed up ${days} days ago`,
    isOverdue: days >= 30,
  };
}
