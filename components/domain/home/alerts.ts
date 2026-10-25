import type { AlertSeverity, ServiceAlert } from "@/lib/content/types";

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1 };

function bySeverity(a: ServiceAlert, b: ServiceAlert): number {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.startsAt.localeCompare(a.startsAt);
}

function warrantsBanner(alert: ServiceAlert): boolean {
  return alert.severity === "critical" || (alert.affects?.includes("sitewide") ?? false);
}

export function splitAlerts(alerts: ServiceAlert[]): { banner: ServiceAlert | null; rows: ServiceAlert[] } {
  const sorted = [...alerts].sort(bySeverity);
  const banner = sorted.find(warrantsBanner) ?? null;
  return { banner, rows: sorted.filter((alert) => alert !== banner) };
}
