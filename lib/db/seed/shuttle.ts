import { eq } from "drizzle-orm";
import { SHUTTLE_ROUTES } from "../../../data/harvested-inventory";
import { shuttleRoutes, shuttleStops } from "../schema/content/shuttle";
import { excludedSet, published, slugify, type Bi, type SeedDb } from "./util";

/**
 * Shuttle routes, ported from sanity/seed/seed.ts (`buildShuttleRouteDoc`).
 * Honesty decisions carried across unchanged: every stop's offset is 0 (the
 * timetable graphics publish no travel times; said in the route notes), the
 * term the timetable applies to is unknown (also in the notes), and nothing is
 * presented as live.
 */

const OFFSET_UNKNOWN_NOTE: Bi = {
  th: "เวลาแต่ละจุดจอดยังไม่มีข้อมูลระยะเวลาการเดินทางที่เผยแพร่อย่างเป็นทางการ จึงแสดงเป็นเวลาเดียวกับเวลาออกจากธรรมศาสตร์ท่าพระจันทร์ ไม่ใช่เวลาที่วัดจริง",
  en: "Travel time between stops has not been published, so every stop shows the same time as the departure from Thammasat Tha Prachan, not a measured travel time.",
};
const LAST_BUS_NOTE: Bi = {
  th: "รถเที่ยวสุดท้ายออกจากธรรมศาสตร์ท่าพระจันทร์เวลา 21:30 น.",
  en: "The last bus of the day leaves Thammasat Tha Prachan at 21:30.",
};
const TERM_UNKNOWN_NOTE: Bi = {
  th: "ตารางนี้ไม่ได้ระบุภาคการศึกษาหรือปีการศึกษาที่ใช้งาน ควรตรวจสอบกับ อมธ. ท่าพระจันทร์ก่อนถือว่าเป็นตารางปัจจุบัน",
  en: "This timetable does not state which term or academic year it applies to. Confirm with TUSU Tha Prachan before treating it as current.",
};
const SOURCE_NOTE: Bi = {
  th: "ถอดความจากภาพตารางเวลาอย่างเป็นทางการที่ อมธ. ท่าพระจันทร์จัดหาให้ 16 สิงหาคม 2569",
  en: "Transcribed from the official timetable graphic supplied by TUSU Tha Prachan, 16 August 2026.",
};

function joinNotes(...parts: Bi[]): Bi {
  return {
    th: parts.map((p) => p.th).filter(Boolean).join(" "),
    en: parts.map((p) => p.en).filter(Boolean).join(" "),
  };
}

/** One sentence per group of dormitory departures that share a note. */
function dormitoryNote(departures: ReadonlyArray<{ time: string; note: Bi }> | undefined): Bi {
  if (!departures || departures.length === 0) return { th: "", en: "" };
  const groups = new Map<string, { note: Bi; times: string[] }>();
  for (const d of departures) {
    const group = groups.get(d.note.en) ?? { note: d.note, times: [] };
    group.times.push(d.time);
    groups.set(d.note.en, group);
  }
  const th: string[] = [];
  const en: string[] = [];
  for (const { note, times } of groups.values()) {
    th.push(`รถรอบ ${times.map((t) => `${t} น.`).join(" และ ")} คือ${note.th}`);
    en.push(`The ${times.join(" and ")} departures are the ${note.en.charAt(0).toLowerCase()}${note.en.slice(1)}.`);
  }
  return { th: th.join(" "), en: en.join(" ") };
}

export async function seedShuttle(db: SeedDb): Promise<void> {
  for (const route of SHUTTLE_ROUTES) {
    const notes = joinNotes(
      OFFSET_UNKNOWN_NOTE,
      dormitoryNote("dormitoryDepartures" in route ? route.dormitoryDepartures : undefined),
      LAST_BUS_NOTE,
      TERM_UNKNOWN_NOTE,
    );
    const [row] = await db
      .insert(shuttleRoutes)
      .values({
        ...published(),
        slug: slugify(route.name.en),
        nameTh: route.name.th,
        nameEn: route.name.en,
        descriptionTh: route.description.th,
        descriptionEn: route.description.en,
        daysOfWeek: [...route.daysOfWeek],
        departures: [...route.departures],
        notesTh: notes.th,
        notesEn: notes.en,
        isActive: true,
        sourceNoteTh: SOURCE_NOTE.th,
        sourceNoteEn: SOURCE_NOTE.en,
        lastVerified: "2026-08-16",
      })
      .onConflictDoUpdate({ target: shuttleRoutes.slug, set: excludedSet(shuttleRoutes) })
      .returning({ id: shuttleRoutes.id });

    await db.delete(shuttleStops).where(eq(shuttleStops.routeId, row!.id));
    await db.insert(shuttleStops).values(
      route.stops.map((stop, position) => ({
        routeId: row!.id,
        position,
        nameTh: stop.name.th,
        nameEn: stop.name.en,
        offsetMinutes: 0,
      })),
    );
  }
}
