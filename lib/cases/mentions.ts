/**
 * @mentions in internal notes. A person typing `@Name` (the note form offers
 * an autocomplete, but the plain text works too) is turned into a stored
 * token `@[userId]` when the note is saved, so the note keeps pointing at the
 * person if their name changes and is shown as their current name. Only staff
 * who may work the case's service and see the case can be mentioned; anything
 * else stays as typed. The parsing is pure and tested without a database.
 */

import { asc, and, eq, inArray, isNull } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { SERVICES, type CaseService } from "./services";
import { canSeeCase } from "./restrictions";

export interface Mentionable {
  id: string;
  name: string;
}

const TOKEN = /@\[([A-Za-z0-9_-]{1,64})\]/g;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces `@Name` with `@[id]` for each candidate whose name follows an `@`
 * and ends at a word break. A name shared by two people is left alone unless
 * `chosen` (the ids the autocomplete picked) says which. Returns the stored
 * text and the distinct ids in order of appearance.
 */
export function parseMentions(body: string, candidates: readonly Mentionable[], chosen: readonly string[] = []): { text: string; ids: string[] } {
  const byName = new Map<string, Mentionable[]>();
  for (const c of candidates) {
    const name = c.name.trim();
    if (!name) continue;
    byName.set(name.toLowerCase(), [...(byName.get(name.toLowerCase()) ?? []), c]);
  }
  const names = [...byName.keys()].sort((x, y) => y.length - x.length);
  if (names.length === 0) return { text: body, ids: [] };
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_@\\[])@(${names.map(escape).join("|")})(?![\\p{L}\\p{N}_])`, "giu");
  const ids: string[] = [];
  const text = body.replace(pattern, (whole, before: string, name: string) => {
    const matches = byName.get(name.toLowerCase()) ?? [];
    const pick = matches.length === 1 ? matches[0] : matches.filter((m) => chosen.includes(m.id)).length === 1 ? matches.find((m) => chosen.includes(m.id)) : undefined;
    if (!pick) return whole;
    if (!ids.includes(pick.id)) ids.push(pick.id);
    return `${before}@[${pick.id}]`;
  });
  return { text, ids };
}

/** The ids named by tokens in stored text. */
export function mentionedIds(text: string): string[] {
  return [...new Set([...text.matchAll(TOKEN)].map((m) => m[1]!))];
}

export type MentionPart = { text: string } | { mention: string };

/** Splits stored text into plain parts and mentions, for rendering names. */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ mention: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Stored text as plain text, each token as `@Name`, for places that cannot render parts. */
export function plainMentions(text: string, names: ReadonlyMap<string, string>): string {
  return text.replace(TOKEN, (_m, id: string) => `@${names.get(id) ?? "?"}`);
}

/** Staff who may be mentioned on a case: they hold a role for its service and may see it. */
export async function listMentionable(db: AuditExecutor, caseId: string, service: CaseService): Promise<Mentionable[]> {
  const rows = await db
    .selectDistinct({ id: user.id, name: user.name })
    .from(staffRoles)
    .innerJoin(user, eq(user.id, staffRoles.userId))
    .where(and(isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...SERVICES[service].roles])))
    .orderBy(asc(user.name));
  const visible: Mentionable[] = [];
  for (const r of rows) if (r.name.trim() && (await canSeeCase(db, caseId, r.id))) visible.push(r);
  return visible;
}

/** Names for the ids found in notes, for display. Names only; no access is granted by this. */
export async function mentionNames(db: AuditExecutor, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r.name]));
}
