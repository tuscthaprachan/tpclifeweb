const STALE_AFTER_DAYS = 365;

export function isStale(lastReviewed: string | undefined, now: Date): boolean {
  if (!lastReviewed) return true;
  const reviewedAt = new Date(lastReviewed).getTime();
  if (Number.isNaN(reviewedAt)) return true;
  return (now.getTime() - reviewedAt) / (1000 * 60 * 60 * 24) > STALE_AFTER_DAYS;
}
