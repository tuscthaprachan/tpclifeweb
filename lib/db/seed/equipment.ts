/**
 * The equipment TUSU Tha Prachan lends, from the item lists on its Google Form
 * (captured 29 October 2026) and the rules on its four paper request forms.
 *
 * QUANTITIES ARE UNCONFIRMED. Neither source says how many of anything the
 * desk holds, so every item starts at the count below, a placeholder for the
 * desk to correct at /admin/borrowing/items before the service opens. The
 * radio cap of 13 and two cards' deposit, the 7 days' notice for radios and
 * the red and black network rule come from the radio page of the form.
 *
 * Inserted by key or slug and never overwritten, as for complaint categories,
 * so a re-run keeps every edit the desk has made.
 */

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "../audit";
import { equipmentCategories, equipmentItems } from "../schema/borrowing";

interface CategorySeed {
  key: string;
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  noticeWorkingDays: number;
  maxPerRequest: number | null;
  depositCards: number;
  termsTh: string;
  termsEn: string;
  items: Array<{ slug: string; nameTh: string; nameEn: string; unitTh: string; unitEn: string; total: number; hintTh?: string; hintEn?: string }>;
}

export const EQUIPMENT_SEED: readonly CategorySeed[] = [
  {
    key: "sport",
    nameTh: "อุปกรณ์กีฬา",
    nameEn: "Sports equipment",
    hintTh: "ลูกบอล ตาข่าย อุปกรณ์ปิงปอง และอุปกรณ์จัดการแข่งขัน",
    hintEn: "Balls, nets, table tennis kit and equipment for running a match",
    noticeWorkingDays: 3,
    maxPerRequest: null,
    depositCards: 1,
    termsTh: "ศึกษาวิธีใช้อุปกรณ์กีฬาแต่ละชนิดก่อนใช้งาน",
    termsEn: "Learn how to use each piece of sports equipment before you use it",
    items: [
      { slug: "football", nameTh: "ลูกฟุตบอล", nameEn: "Football", unitTh: "ลูก", unitEn: "ball", total: 4 },
      { slug: "basketball-7", nameTh: "ลูกบาสเกตบอล เบอร์ 7", nameEn: "Basketball, size 7", unitTh: "ลูก", unitEn: "ball", total: 4 },
      { slug: "basketball-6", nameTh: "ลูกบาสเกตบอล เบอร์ 6", nameEn: "Basketball, size 6", unitTh: "ลูก", unitEn: "ball", total: 4 },
      { slug: "basketball-5", nameTh: "ลูกบาสเกตบอล เบอร์ 5", nameEn: "Basketball, size 5", unitTh: "ลูก", unitEn: "ball", total: 4 },
      { slug: "volleyball", nameTh: "ลูกวอลเลย์บอล", nameEn: "Volleyball", unitTh: "ลูก", unitEn: "ball", total: 4 },
      { slug: "table-tennis-bat", nameTh: "ไม้ปิงปอง", nameEn: "Table tennis bat", unitTh: "อัน", unitEn: "bat", total: 8 },
      { slug: "table-tennis-ball", nameTh: "ลูกปิงปอง", nameEn: "Table tennis ball", unitTh: "ลูก", unitEn: "ball", total: 20 },
      { slug: "table-tennis-net", nameTh: "เน็ตปิงปอง Butterfly", nameEn: "Table tennis net (Butterfly)", unitTh: "อัน", unitEn: "net", total: 2 },
      { slug: "table-tennis-net-clamp", nameTh: "ที่หนีบเน็ตปิงปอง Butterfly", nameEn: "Table tennis net clamp (Butterfly)", unitTh: "คู่", unitEn: "pair", total: 2 },
      { slug: "basketball-net", nameTh: "ตาข่ายบาสเกตบอล", nameEn: "Basketball hoop net", unitTh: "อัน", unitEn: "net", total: 2 },
      { slug: "football-net", nameTh: "ตาข่ายฟุตบอล", nameEn: "Football goal net", unitTh: "อัน", unitEn: "net", total: 2 },
      { slug: "substitution-board", nameTh: "ป้ายเปลี่ยนตัวนักกีฬา", nameEn: "Substitution board", unitTh: "อัน", unitEn: "board", total: 1 },
      { slug: "relay-baton", nameTh: "ไม้วิ่งผลัด", nameEn: "Relay baton", unitTh: "อัน", unitEn: "baton", total: 8 },
      { slug: "stopwatch", nameTh: "นาฬิกาจับเวลา", nameEn: "Stopwatch", unitTh: "เรือน", unitEn: "stopwatch", total: 2 },
      { slug: "red-flag", nameTh: "ธงแดง", nameEn: "Red flag", unitTh: "ผืน", unitEn: "flag", total: 4 },
      { slug: "marker-cone", nameTh: "มาร์คเกอร์", nameEn: "Marker", unitTh: "อัน", unitEn: "marker", total: 20 },
    ],
  },
  {
    key: "recreation",
    nameTh: "อุปกรณ์สันทนาการ",
    nameEn: "Recreation equipment",
    hintTh: "กลองและไม้กลองสำหรับกิจกรรมสันทนาการ",
    hintEn: "Drums and drumsticks for group activities",
    noticeWorkingDays: 3,
    maxPerRequest: null,
    depositCards: 1,
    termsTh: "ศึกษาวิธีใช้อุปกรณ์สันทนาการก่อนใช้งาน",
    termsEn: "Learn how to use the recreation equipment before you use it",
    items: [
      { slug: "recreation-drum", nameTh: "กลองสันทนาการ", nameEn: "Recreation drum", unitTh: "ใบ", unitEn: "drum", total: 2 },
      { slug: "drumsticks", nameTh: "ไม้กลอง", nameEn: "Drumsticks", unitTh: "คู่", unitEn: "pair", total: 4 },
    ],
  },
  {
    key: "radio",
    nameTh: "วิทยุสื่อสาร",
    nameEn: "Two-way radios",
    hintTh: "วิทยุสีแดงและสีดำ แต่ละสีใช้ร่วมกับสีเดียวกันเท่านั้น",
    hintEn: "Red and black sets. Each works only with radios of its own colour",
    noticeWorkingDays: 7,
    maxPerRequest: 13,
    depositCards: 2,
    termsTh:
      "ใช้เฉพาะความถี่ที่ได้รับอนุญาต ไม่ปรับแต่งเครื่อง และปฏิบัติตามประกาศของสำนักงาน กสทช. ว่าด้วยการใช้เครื่องวิทยุคมนาคม\nห้ามนำวิทยุสีแดงและสีดำมาเชื่อมในข่ายสัญญาณเดียวกัน เพราะสัญญาณจะขัดข้องและเครื่องอาจเสียหาย",
    termsEn:
      "Use only the permitted frequencies, do not adjust the radios, and follow the NBTC rules on using two-way radios\nNever put red and black radios on the same network. It disrupts the signal and can damage the radios",
    items: [
      { slug: "radio-red", nameTh: "วิทยุสื่อสาร สีแดง", nameEn: "Two-way radio, red", unitTh: "เครื่อง", unitEn: "radio", total: 13, hintTh: "ใช้ร่วมกับเครื่องสีแดงเท่านั้น", hintEn: "Works only with other red radios" },
      { slug: "radio-black", nameTh: "วิทยุสื่อสาร สีดำ", nameEn: "Two-way radio, black", unitTh: "เครื่อง", unitEn: "radio", total: 13, hintTh: "ใช้ร่วมกับเครื่องสีดำเท่านั้น", hintEn: "Works only with other black radios" },
    ],
  },
  {
    key: "first-aid",
    nameTh: "ชุดปฐมพยาบาลเบื้องต้น",
    nameEn: "First aid",
    hintTh: "ชุดปฐมพยาบาลเบื้องต้นสำหรับกิจกรรม",
    hintEn: "Basic first aid kits for activities",
    noticeWorkingDays: 3,
    maxPerRequest: null,
    depositCards: 1,
    termsTh: "ศึกษาวิธีใช้อุปกรณ์ปฐมพยาบาลแต่ละชนิดก่อนปฐมพยาบาล",
    termsEn: "Learn how to use each item in the kit before giving first aid",
    items: [{ slug: "first-aid-kit", nameTh: "ชุดปฐมพยาบาลเบื้องต้น", nameEn: "First aid kit", unitTh: "ชุด", unitEn: "kit", total: 3 }],
  },
];

/** Adds missing categories and items. Returns how many rows were added. */
export async function seedEquipment(db: AuditExecutor): Promise<number> {
  let added = 0;
  for (const [ci, cat] of EQUIPMENT_SEED.entries()) {
    const { items, ...fields } = cat;
    const inserted = await db
      .insert(equipmentCategories)
      .values({ ...fields, position: ci })
      .onConflictDoNothing({ target: equipmentCategories.key })
      .returning({ id: equipmentCategories.id });
    added += inserted.length;
    const [row] = await db.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.key, cat.key));
    if (!row) continue;
    for (const [ii, item] of items.entries()) {
      const done = await db
        .insert(equipmentItems)
        .values({
          categoryId: row.id,
          slug: item.slug,
          nameTh: item.nameTh,
          nameEn: item.nameEn,
          hintTh: item.hintTh ?? "",
          hintEn: item.hintEn ?? "",
          unitTh: item.unitTh,
          unitEn: item.unitEn,
          totalQuantity: item.total,
          position: ii,
        })
        .onConflictDoNothing({ target: equipmentItems.slug })
        .returning({ id: equipmentItems.id });
      added += done.length;
    }
  }
  return added;
}
