import type { BodyRow, DocumentSummary, MembershipRow } from "@/lib/open-data/read";

export const EXECUTIVE_SLUG = "executive-committee";
export const COUNCIL_SLUG = "council";

const MARKER = /^\[[^\]]*\]$/;

/** True for a spelled-out marker such as "[not stated]", which the data uses where a document is silent. */
export function isMarkerText(value: string | null | undefined): boolean {
  return value === null || value === undefined || MARKER.test(value.trim());
}

/** The value as printed, or null where it is blank or a marker. */
export function printedOrNull(value: string | null | undefined): string | null {
  return isMarkerText(value) ? null : (value as string);
}

/** Source document numbers as printed ("02;45"). */
export function sourceNumbers(printed: string | null): string[] {
  if (!printed) return [];
  return printed
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part !== "" && !MARKER.test(part));
}

/** Where a post sits when posts are listed: chair first, then vice-chairs, secretaries, assistants and members. */
export function roleRank(roleTh: string): number {
  if (roleTh.startsWith("ประธาน")) return 0;
  if (roleTh.startsWith("รองประธาน")) return 1;
  if (roleTh.startsWith("เลขาธิการ")) return 2;
  if (roleTh.startsWith("รองเลขาธิการ")) return 3;
  if (roleTh.startsWith("เลขานุการ")) return 4;
  if (roleTh.startsWith("ผู้ช่วย")) return 5;
  if (roleTh.startsWith("ที่ปรึกษา")) return 6;
  return 7;
}

export function compareMemberships(a: MembershipRow, b: MembershipRow): number {
  const rank = roleRank(a.roleTh) - roleRank(b.roleTh);
  if (rank !== 0) return rank;
  if (a.roleTh !== b.roleTh) return a.roleTh < b.roleTh ? -1 : 1;
  const from = (a.fromDate ?? "").localeCompare(b.fromDate ?? "");
  if (from !== 0) return from;
  return a.personNameTh.localeCompare(b.personNameTh, "th");
}

export function membershipsOfBody(memberships: readonly MembershipRow[], bodySlug: string): MembershipRow[] {
  return memberships.filter((m) => m.bodySlug === bodySlug).sort(compareMemberships);
}

/** Bodies that have at least one member in the data, in the order the data gives them. */
export function bodiesWithMembers(bodies: readonly BodyRow[], memberships: readonly MembershipRow[]): BodyRow[] {
  const slugs = new Set(memberships.map((m) => m.bodySlug));
  return bodies.filter((body) => body.slug !== COUNCIL_SLUG && slugs.has(body.slug));
}

export interface PartySeats {
  party: string;
  seats: number;
}

/** Seats per party among the council's members, most seats first. A member with no printed party counts under "". */
export function seatsByParty(members: readonly Pick<MembershipRow, "party">[]): PartySeats[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    const party = printedOrNull(m.party) ?? "";
    counts.set(party, (counts.get(party) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([party, seats]) => ({ party, seats }))
    .sort((a, b) => b.seats - a.seats || a.party.localeCompare(b.party));
}

export interface PersonEntry {
  personId: string;
  nameTh: string;
  nameLatin: string | null;
  faculty: string | null;
  party: string | null;
  memberships: MembershipRow[];
}

/** One entry per person, by Thai name, each with their memberships by start date. */
export function groupByPerson(memberships: readonly MembershipRow[]): PersonEntry[] {
  const people = new Map<string, PersonEntry>();
  for (const m of memberships) {
    const entry = people.get(m.personId) ?? {
      personId: m.personId,
      nameTh: m.personNameTh,
      nameLatin: m.personNameLatin,
      faculty: m.faculty,
      party: m.party,
      memberships: [],
    };
    entry.memberships.push(m);
    people.set(m.personId, entry);
  }
  const list = [...people.values()];
  for (const entry of list) {
    entry.memberships.sort((a, b) => (a.fromDate ?? "").localeCompare(b.fromDate ?? "") || a.bodySlug.localeCompare(b.bodySlug));
  }
  return list.sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th"));
}

/** The documents a set of memberships cite, once each, by file number. */
export function citedDocuments(
  memberships: readonly Pick<MembershipRow, "sourceDocuments" | "sourceDocumentSlug">[],
  documents: readonly DocumentSummary[],
): DocumentSummary[] {
  const byNumber = new Map(documents.map((d) => [d.number, d]));
  const bySlug = new Map(documents.map((d) => [d.slug, d]));
  const found = new Map<string, DocumentSummary>();
  for (const m of memberships) {
    for (const number of sourceNumbers(m.sourceDocuments)) {
      const doc = byNumber.get(number);
      if (doc) found.set(doc.id, doc);
    }
    const first = m.sourceDocumentSlug ? bySlug.get(m.sourceDocumentSlug) : undefined;
    if (first) found.set(first.id, first);
  }
  return [...found.values()].sort((a, b) => a.number.localeCompare(b.number));
}

/** The latest date any membership starts or ends, or null. */
export function latestDate(dates: readonly (string | null | undefined)[]): string | null {
  return dates.reduce<string | null>((latest, d) => (d && (latest === null || d > latest) ? d : latest), null);
}
