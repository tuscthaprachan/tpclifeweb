import type { LocaleString } from "../config";

/** The Today settings page: the home page's Today block and the pages its rows open. */
export const TODAY_STRINGS = {
  typeTodaySettings: { th: "ส่วน \"วันนี้\" ในหน้าแรก", en: "Today on the home page" },
  typeTodaySettingsOne: { th: "การตั้งค่าส่วน \"วันนี้\"", en: "Today settings" },
  typeTodaySettingsDesc: {
    th: "ลำดับและการแสดงแถว คำแนะนำเรื่องความร้อนและฝุ่น และข้อความในหน้าห้องสมุดและหน้าอากาศ",
    en: "Row order and visibility, heat and PM2.5 advice, and the text on the libraries and weather pages",
  },
  tdsIntro: {
    th: "ข้อมูลในแต่ละแถวมาจากเนื้อหาอื่น: รถรับส่งจากเส้นทางรถรับส่ง ห้องสมุดและสถานที่จากสถานที่ ประกาศจากประกาศแจ้งเตือน หน้านี้กำหนดว่าแถวใดแสดง ลำดับ และข้อความประกอบ",
    en: "Each row's facts come from other content: shuttles from shuttle routes, libraries and places from places, alerts from service alerts. This page sets which rows show, their order, and the words around them",
  },
  tdsGroupRows: { th: "แถวในส่วน \"วันนี้\"", en: "Rows in Today" },
  tdsHintRows: {
    th: "เลือกลำดับ 1 ถึง 5 โดยไม่ซ้ำกัน แถวที่ซ่อนจะไม่แสดงในหน้าแรก แต่หน้าของแถวนั้นยังเปิดได้",
    en: "Give each row a different position from 1 to 5. A hidden row leaves the home page, but its own page stays open",
  },
  tdsRowShuttle: { th: "รถรับส่ง (และประกาศเกี่ยวกับรถรับส่ง)", en: "Shuttles (and alerts about them)" },
  tdsRowLibraries: { th: "ห้องสมุด", en: "Libraries" },
  tdsRowPlaces: { th: "สถานที่สำคัญ", en: "Key places" },
  tdsRowWeather: { th: "ความร้อนและฝุ่น", en: "Heat and PM2.5" },
  tdsRowAlerts: { th: "ประกาศอื่น", en: "Other alerts" },
  tdsFieldPosition: { th: "ลำดับ", en: "Position" },
  tdsFieldShow: { th: "แสดงในหน้าแรก", en: "Show on the home page" },
  tdsErrPositionTaken: { th: "แถวอื่นใช้ลำดับนี้แล้ว เลือกลำดับอื่น", en: "Another row has this position. Choose a different one" },
  tdsGroupHeat: { th: "คำแนะนำตามระดับดัชนีความร้อน", en: "Heat index advice" },
  tdsHintHeat: {
    th: "เกณฑ์ของแต่ละระดับเป็นของกรมอนามัยและแก้ไขที่นี่ไม่ได้ หน้าแรกแสดงคำแนะนำตั้งแต่ระดับอันตรายขึ้นไป หน้าอากาศแสดงทุกระดับ",
    en: "The Department of Health sets each level's range, so it cannot be changed here. The home page shows the advice from Danger up; the weather page shows every level",
  },
  tdsGroupPm25: { th: "คำแนะนำตามระดับฝุ่น PM2.5", en: "PM2.5 advice" },
  tdsHintPm25: {
    th: "เกณฑ์ของแต่ละระดับเป็นของกรมควบคุมมลพิษและแก้ไขที่นี่ไม่ได้ หน้าแรกแสดงคำแนะนำตั้งแต่ระดับเริ่มมีผลต่อสุขภาพขึ้นไป",
    en: "The Pollution Control Department sets each band, so it cannot be changed here. The home page shows the advice from Starting to affect health up",
  },
  tdsHeatNormal: { th: "ปกติ (ต่ำกว่า 27°C)", en: "Normal (below 27°C)" },
  tdsHeatWatch: { th: "เฝ้าระวัง (27 ถึง 32°C)", en: "Caution (27 to 32°C)" },
  tdsHeatWarning: { th: "เตือนภัย (33 ถึง 41°C)", en: "Warning (33 to 41°C)" },
  tdsHeatDanger: { th: "อันตราย (42 ถึง 51°C)", en: "Danger (42 to 51°C)" },
  tdsHeatExtremeDanger: { th: "อันตรายมาก (52°C ขึ้นไป)", en: "Extreme danger (52°C and above)" },
  tdsPm25VeryGood: { th: "ดีมาก (ไม่เกิน 15)", en: "Very good (up to 15)" },
  tdsPm25Good: { th: "ดี (15.1 ถึง 25)", en: "Good (15.1 to 25)" },
  tdsPm25Moderate: { th: "ปานกลาง (25.1 ถึง 37.5)", en: "Moderate (25.1 to 37.5)" },
  tdsPm25StartingToAffect: { th: "เริ่มมีผลต่อสุขภาพ (37.6 ถึง 75)", en: "Starting to affect health (37.6 to 75)" },
  tdsPm25AffectsHealth: { th: "มีผลต่อสุขภาพ (มากกว่า 75)", en: "Affects health (above 75)" },
  tdsGroupPages: { th: "ข้อความในหน้าที่แถวเปิด", en: "Text on the pages the rows open" },
  tdsFieldWeatherNote: { th: "หมายเหตุในหน้าอากาศ", en: "Weather page note" },
  tdsHintWeatherNote: {
    th: "ไม่บังคับ แสดงใต้ที่มาของข้อมูล เช่น จุดน้ำดื่มหรือห้องปรับอากาศที่เปิดให้ใช้",
    en: "Optional. Shown under where the readings come from, for example where to find drinking water or a cool room",
  },
  tdsFieldLibrariesIntro: { th: "คำนำในหน้าห้องสมุด", en: "Libraries page introduction" },
  tdsHintLibrariesIntro: { th: "ไม่บังคับ เว้นว่างเพื่อใช้ข้อความมาตรฐาน", en: "Optional. Leave empty to use the standard text" },
  tdsFieldLibrariesGuide: { th: "ลิงก์คู่มือห้องสมุด", en: "Library guide link" },
  tdsHintLibrariesGuide: {
    th: "หน้าในเว็บไซต์นี้ (เช่น /guide/tu-library) หรือที่อยู่เว็บเต็ม แสดงในหน้าห้องสมุดและหน้าของห้องสมุดแต่ละแห่ง",
    en: "A page on this site (such as /guide/tu-library) or a full web address. Shown on the libraries page and on each library's own page",
  },
} as const satisfies Record<string, LocaleString>;
