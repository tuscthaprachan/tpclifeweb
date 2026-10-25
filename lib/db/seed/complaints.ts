/**
 * The starting list of complaint categories. Targets are working days
 * (Monday to Friday, Bangkok) and are a first guess for desks to correct at
 * /admin/complaints/categories: nobody has tested them with users yet.
 *
 * Inserted by key and never overwritten, so a re-run (and `db:seed` on
 * production) adds a missing category but keeps every edit an admin made.
 * The two restricted categories start with nobody named, so their complaints
 * stay unseen until an admin names staff; the categories page says so.
 */

import type { AuditExecutor } from "../audit";
import { complaintCategories } from "../schema/complaints";

interface Seed {
  key: string;
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  acknowledgeDays: number;
  resolveDays: number;
  restricted: boolean;
  offerWellbeing: boolean;
}

export const COMPLAINT_CATEGORY_SEED: readonly Seed[] = [
  {
    key: "facilities",
    nameTh: "อาคารและสิ่งอำนวยความสะดวก",
    nameEn: "Facilities and buildings",
    hintTh: "ห้องเรียน ห้องน้ำ ทางเดิน ไฟฟ้า น้ำ หรือสิ่งอำนวยความสะดวกอื่นในมหาวิทยาลัย",
    hintEn: "Classrooms, toilets, walkways, power, water or other campus facilities",
    acknowledgeDays: 2,
    resolveDays: 10,
    restricted: false,
    offerWellbeing: false,
  },
  {
    key: "canteen",
    nameTh: "โรงอาหารและอาหาร",
    nameEn: "Canteen and food",
    hintTh: "ความสะอาด คุณภาพอาหาร ราคา หรือการให้บริการของร้านค้า",
    hintEn: "Cleanliness, food quality, prices or how a stall treats customers",
    acknowledgeDays: 2,
    resolveDays: 10,
    restricted: false,
    offerWellbeing: false,
  },
  {
    key: "events",
    nameTh: "กิจกรรม",
    nameEn: "Events and activities",
    hintTh: "กิจกรรมที่จัดโดยองค์การนักศึกษา สภานักศึกษา ชมรม หรือคณะ",
    hintEn: "An event run by the student union, the student council, a club or a faculty",
    acknowledgeDays: 2,
    resolveDays: 10,
    restricted: false,
    offerWellbeing: false,
  },
  {
    key: "student-union-services",
    nameTh: "บริการขององค์การนักศึกษาและสภานักศึกษา",
    nameEn: "Student union services",
    hintTh: "บริการที่ อมธ. หรือ สภานักศึกษา จัดให้ เช่น ของหาย รถรับส่ง หรือการให้ข้อมูล",
    hintEn: "A service run by TUSU or TUSC, such as lost and found, the shuttle or information",
    acknowledgeDays: 2,
    resolveDays: 10,
    restricted: false,
    offerWellbeing: false,
  },
  {
    key: "conduct",
    nameTh: "ความประพฤติของสมาชิกองค์การหรือสภานักศึกษา",
    nameEn: "Conduct of a student union member",
    hintTh: "พฤติกรรมของสมาชิกหรือเจ้าหน้าที่ของ อมธ. หรือ สภานักศึกษา",
    hintEn: "How a member or officer of TUSU or TUSC has behaved",
    acknowledgeDays: 2,
    resolveDays: 15,
    restricted: false,
    offerWellbeing: false,
  },
  {
    key: "harassment",
    nameTh: "การคุกคามหรือการเลือกปฏิบัติ (อ่อนไหว)",
    nameEn: "Harassment or discrimination (sensitive)",
    hintTh: "เจ้าหน้าที่ที่ได้รับมอบหมายเท่านั้นที่เห็นเรื่องประเภทนี้ และเราจะเสนอช่องทางสุขภาวะให้คุณ",
    hintEn: "Only named staff can see these. We will also show you where to find support",
    acknowledgeDays: 1,
    resolveDays: 15,
    restricted: true,
    offerWellbeing: true,
  },
  {
    key: "safety",
    nameTh: "ความปลอดภัย (อ่อนไหว)",
    nameEn: "Safety (sensitive)",
    hintTh: "ความกังวลเรื่องความปลอดภัยที่ไม่ใช่เหตุฉุกเฉิน เจ้าหน้าที่ที่ได้รับมอบหมายเท่านั้นที่เห็นเรื่องประเภทนี้",
    hintEn: "A safety concern that is not an emergency. Only named staff can see these",
    acknowledgeDays: 1,
    resolveDays: 10,
    restricted: true,
    offerWellbeing: true,
  },
  {
    key: "other",
    nameTh: "เรื่องอื่น ๆ",
    nameEn: "Something else",
    hintTh: "ถ้าไม่มีหัวข้อไหนตรงกับเรื่องของคุณ",
    hintEn: "If none of the others fit",
    acknowledgeDays: 3,
    resolveDays: 15,
    restricted: false,
    offerWellbeing: false,
  },
];

/** Inserts the categories that are missing, in display order. Safe to run any number of times. */
export async function seedComplaintCategories(db: AuditExecutor): Promise<number> {
  const inserted = await db
    .insert(complaintCategories)
    .values(COMPLAINT_CATEGORY_SEED.map((c, i) => ({ ...c, position: (i + 1) * 10 })))
    .onConflictDoNothing({ target: complaintCategories.key })
    .returning({ id: complaintCategories.id });
  return inserted.length;
}
