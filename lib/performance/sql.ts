import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import type { Range } from "./period";

/** `col` falls inside the range. Dates go in as ISO strings with a cast, which both drivers accept. */
export function within(col: SQLWrapper, range: Range): SQL {
  const to = sql`${col} <= ${range.to.toISOString()}::timestamptz`;
  return range.from ? sql`(${col} >= ${range.from.toISOString()}::timestamptz and ${to})` : to;
}

/** The rows of a raw `db.execute`, which Neon and PGlite both return as `{ rows }`. */
export async function queryRows<T>(db: AuditExecutor, query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return (result as unknown as { rows: T[] }).rows;
}

/** The first row, or an empty object, so an aggregate with no rows reads as zeros and nulls. */
export async function queryOne<T extends object>(db: AuditExecutor, query: SQL): Promise<Partial<T>> {
  return (await queryRows<T>(db, query))[0] ?? {};
}

/** An aggregate comes back as a number or, from some drivers, a numeric string. */
export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
