/**
 * Copy for Eat as a group, in Thai and English. Casual voice is allowed here.
 * No em dashes. Plain module (no "use client"): safe from server and client.
 */

import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

import type { Bilingual } from "../strings";

const n = (value: number, locale: Locale) => formatNumber(value, locale);

export const GROUP = {
  pageTitle: { th: "กินเป็นกลุ่ม", en: "Eat as a group" } satisfies Bilingual,
  pageIntro: {
    th: "หลายคน หลายข้อจำกัด บอกว่าแต่ละคนกินอะไรได้ แล้วเราจะหาร้านให้ ไม่ต้องเถียงกันหน้าโรงอาหาร",
    en: "Lots of people, lots of rules. Tell us what each person can eat and we will find where to go, so nobody argues in front of the canteen.",
  } satisfies Bilingual,
  emptyTitle: { th: "ยังไม่มีข้อมูลโรงอาหาร", en: "No canteen data yet" } satisfies Bilingual,
  emptyBody: {
    th: "ตอนนี้ยังไม่มีเมนูให้จับคู่ ลองกลับมาดูใหม่ภายหลัง",
    en: "There are no dishes to match yet. Please check back later.",
  } satisfies Bilingual,

  /* ---- How it works ---- */
  howTitle: { th: "สร้างกลุ่มได้สองแบบ", en: "Two ways to build the group" } satisfies Bilingual,
  passPhoneTitle: { th: "ส่งต่อมือถือ", en: "Pass the phone" } satisfies Bilingual,
  passPhoneBody: {
    th: "ทุกคนกรอกของตัวเองในหน้านี้ทีละคน แล้วกด \"ดูผลลัพธ์\"",
    en: "Everyone fills in their own part on this one screen, then you press Show results.",
  } satisfies Bilingual,
  shareLinkTitle: { th: "ส่งลิงก์ต่อ", en: "Share the link" } satisfies Bilingual,
  shareLinkBody: {
    th: "เพิ่มตัวเอง กด \"ดูผลลัพธ์\" แล้วส่งลิงก์ใหม่ต่อไป เพื่อนที่เปิดลิงก์จะเห็นทุกคนที่เพิ่มไว้แล้ว และเพิ่มตัวเองต่อได้",
    en: "Add yourself, press Show results, then send the new, longer link on. Each friend who opens it sees everyone so far and adds themselves.",
  } satisfies Bilingual,
  privacyNote: {
    th: "ทั้งกลุ่มอยู่ในลิงก์ ไม่มีการเก็บบนเซิร์ฟเวอร์ ชื่อและอาหารที่กินได้จะอยู่ในลิงก์ด้วย ส่งให้เฉพาะคนที่จะไปกินด้วยกัน",
    en: "The whole group lives in the link and nothing is saved on a server. Names and food preferences are in the link too, so only send it to the people you are eating with.",
  } satisfies Bilingual,

  /* ---- Builder ---- */
  builderTitle: { th: "ใครจะไปกินบ้าง", en: "Who is eating?" } satisfies Bilingual,
  nameLabel: { th: "ชื่อหรืออีโมจิ (ไม่ใส่ก็ได้)", en: "Name or emoji (optional)" } satisfies Bilingual,
  nameHint: { th: "ไม่เกิน 24 ตัวอักษร", en: "Up to 24 characters." } satisfies Bilingual,
  budgetLabel: { th: "งบต่อจาน (บาท)", en: "Budget per dish (baht)" } satisfies Bilingual,
  budgetHint: { th: "ว่างไว้ถ้าไม่จำกัด", en: "Leave empty for no limit." } satisfies Bilingual,
  dietLegend: { th: "อาหารที่กินได้", en: "Diet" } satisfies Bilingual,
  avoidLegend: { th: "ไม่เอา", en: "Skip these" } satisfies Bilingual,
  remove: { th: "เอาออก", en: "Remove" } satisfies Bilingual,
  addPerson: { th: "เพิ่มอีกคน", en: "Add another person" } satisfies Bilingual,
  showResults: { th: "ดูผลลัพธ์", en: "Show results" } satisfies Bilingual,
  limitReached: {
    th: "ครบ 8 คนแล้ว เอาคนออกก่อนถึงจะเพิ่มอีกคนได้",
    en: "That is the limit: 8 people. Remove someone to add another.",
  } satisfies Bilingual,
  dirtyNote: {
    th: "คุณแก้กลุ่มแล้ว กด \"ดูผลลัพธ์\" เพื่ออัปเดตร้านด้านล่าง",
    en: "You changed the group. Press Show results to update the stalls below.",
  } satisfies Bilingual,

  /* ---- Share ---- */
  shareTitle: { th: "ส่งกลุ่มนี้ให้เพื่อน", en: "Share this group" } satisfies Bilingual,
  shareHint: {
    th: "กด \"ดูผลลัพธ์\" ก่อน ลิงก์จะได้มีทุกคนครบ",
    en: "Press Show results first so the link has everyone in it.",
  } satisfies Bilingual,
  shareLabel: { th: "ลิงก์ของกลุ่มนี้", en: "Link to this group" } satisfies Bilingual,
  copy: { th: "คัดลอกลิงก์", en: "Copy link" } satisfies Bilingual,
  copied: { th: "คัดลอกลิงก์แล้ว", en: "Link copied" } satisfies Bilingual,
  copyFailed: {
    th: "คัดลอกไม่ได้ เลือกลิงก์แล้วคัดลอกเอง",
    en: "Could not copy. Select the link and copy it yourself.",
  } satisfies Bilingual,

  /* ---- Results ---- */
  resultsTitle: { th: "ผลลัพธ์", en: "Results" } satisfies Bilingual,
  strategyNav: { th: "วิธีเลือก", en: "How to choose" } satisfies Bilingual,
  tabOne: { th: "ร้านเดียวทุกคน", en: "One stall for everyone" } satisfies Bilingual,
  tabOwn: { th: "ต่างคนต่างเลือก นั่งด้วยกัน", en: "Everyone their own" } satisfies Bilingual,
  tabRandom: { th: "สุ่มให้ทุกคน", en: "Random for all" } satisfies Bilingual,

  oneIntro: {
    th: "ร้านที่ทุกคนมีอย่างน้อยหนึ่งเมนูที่กินได้ เรียงจากร้านที่คนมีตัวเลือกน้อยที่สุดยังมีให้เลือกมากที่สุด",
    en: "Stalls where everyone has at least one dish they can have. Best first: the stall where the most limited person still has the most choices.",
  } satisfies Bilingual,
  seeStall: { th: "ดูร้าน", en: "See the stall" } satisfies Bilingual,
  noneWorkTitle: { th: "ยังไม่มีร้านที่ทุกคนกินได้", en: "No single stall works for everyone yet" } satisfies Bilingual,

  ownIntro: {
    th: "ทุกคนได้เมนูของตัวเอง แต่ไปนั่งกินด้วยกัน กดสุ่มใหม่ได้ทีละคน",
    en: "Everyone gets their own pick, and you all sit together. Reroll one person at a time.",
  } satisfies Bilingual,
  randomIntro: {
    th: "ทุกคนได้เมนูที่สุ่มมา ใครไม่ถูกใจกดสุ่มใหม่เฉพาะคนนั้นได้ หรือหมุนใหม่ทั้งกลุ่ม",
    en: "A surprise for everyone. Reroll just one person if they are not feeling it, or spin the whole group again.",
  } satisfies Bilingual,
  reroll: { th: "สุ่มใหม่", en: "Reroll" } satisfies Bilingual,
  spinAgain: { th: "หมุนใหม่ทั้งกลุ่ม", en: "Spin everyone again" } satisfies Bilingual,
  revealTitle: { th: "ใครได้อะไร", en: "Who gets what" } satisfies Bilingual,
  pickedBy: { th: "เมนูของ", en: "Pick for" } satisfies Bilingual,
  seatingTitle: { th: "ที่นั่งที่ใกล้ที่สุด", en: "Where to sit" } satisfies Bilingual,
  seatingNote: {
    th: "โซนที่นั่งที่อยู่ใกล้ร้านที่ทุกคนได้ตามผังที่เราสำรวจ",
    en: "The seating zone closest to everyone's stalls, from our surveyed floor plan.",
  } satisfies Bilingual,
  noSeating: {
    th: "ยังไม่มีข้อมูลโซนที่นั่ง",
    en: "We have no seating zone data yet.",
  } satisfies Bilingual,
  mapTitle: { th: "ร้านของทุกคนบนผัง", en: "Everyone's stalls on the plan" } satisfies Bilingual,
  mapNote: {
    th: "ตัวเลขบนผังคือลำดับของคนแรกที่ได้ร้านนั้น เส้นที่ต่อกันบนผังไม่ใช่เส้นทางเดินที่แนะนำ",
    en: "On the plan, the number is the first person who got that stall. The line joining the stalls is not a suggested walk.",
  } satisfies Bilingual,
  stallPicksTitle: { th: "ใครอยู่ร้านไหน", en: "Who is at which stall" } satisfies Bilingual,

  /* ---- Binding constraint ---- */
  bindingTitle: { th: "ยังไม่มีร้านที่ทุกคนกินได้", en: "Nobody can share one stall yet" } satisfies Bilingual,
  applyChange: { th: "ใช้การเปลี่ยนนี้", en: "Apply this change" } satisfies Bilingual,
  noSmallFix: {
    th: "ไม่มีการปรับเล็กน้อยที่ช่วยได้ ลองลดข้อจำกัดของบางคน หรือเลือก \"ต่างคนต่างเลือก\"",
    en: "No small change fixes it. Try loosening someone's settings, or choose \"Everyone their own\".",
  } satisfies Bilingual,
  tryOwn: { th: "ลอง \"ต่างคนต่างเลือก\"", en: "Try \"Everyone their own\"" } satisfies Bilingual,
} as const;

export const group = {
  person(num: number, locale: Locale): string {
    return locale === "th" ? `คนที่ ${n(num, locale)}` : `Person ${n(num, locale)}`;
  },
  peopleCount(count: number, locale: Locale): string {
    return locale === "th" ? `${n(count, locale)} คน` : `${n(count, locale)} ${count === 1 ? "person" : "people"}`;
  },
  removeFull(label: string, locale: Locale): string {
    return locale === "th" ? `เอา ${label} ออก` : `Remove ${label}`;
  },
  removedStatus(label: string, count: number, locale: Locale): string {
    return locale === "th"
      ? `เอา ${label} ออกแล้ว ตอนนี้มี ${group.peopleCount(count, locale)}`
      : `Removed ${label}. ${group.peopleCount(count, locale)} in the group.`;
  },
  addedStatus(num: number, count: number, locale: Locale): string {
    return locale === "th"
      ? `เพิ่ม${group.person(num, locale)}แล้ว ตอนนี้มี ${group.peopleCount(count, locale)}`
      : `Added ${group.person(num, locale)}. ${group.peopleCount(count, locale)} in the group.`;
  },
  stallsWork(count: number, locale: Locale): string {
    return locale === "th"
      ? `${n(count, locale)} ร้านที่ทุกคนกินได้`
      : `${n(count, locale)} ${count === 1 ? "stall works" : "stalls work"} for everyone`;
  },
  fewest(name: string, count: number, locale: Locale): string {
    return locale === "th"
      ? `ตัวเลือกน้อยที่สุดที่ร้านนี้: ${name} มี ${n(count, locale)} เมนู`
      : `Fewest choices here: ${name}, with ${n(count, locale)}.`;
  },
  canHave(name: string, locale: Locale): string {
    return locale === "th" ? `${name} กินได้` : `${name} can have`;
  },
  andMore(count: number, locale: Locale): string {
    return locale === "th" ? `และอีก ${n(count, locale)} เมนูที่ร้านนี้` : `and ${n(count, locale)} more at this stall`;
  },
  rerollFor(name: string, locale: Locale): string {
    return locale === "th" ? `${group.reroll(locale)} ของ ${name}` : `${group.reroll(locale)} for ${name}`;
  },
  reroll(locale: Locale): string {
    return GROUP.reroll[locale];
  },
  nothingFits(name: string, locale: Locale): string {
    return locale === "th"
      ? `ไม่มีเมนูที่ตรงกับเงื่อนไขของ ${name}`
      : `Nothing at the canteen fits ${name}'s settings.`;
  },
  rerollCount(count: number, locale: Locale): string {
    return locale === "th" ? `สุ่มใหม่แล้ว ${n(count, locale)} ครั้ง` : `Rerolled ${n(count, locale)} ${count === 1 ? "time" : "times"}`;
  },
  seatNear(zone: string, locale: Locale): string {
    return locale === "th" ? `ไปนั่งแถว ${zone}` : `Sit near: ${zone}`;
  },
  stallPick(stall: string, names: string): string {
    return `${stall}: ${names}`;
  },
  closest(stall: string, locale: Locale): string {
    return locale === "th" ? `ร้านที่ใกล้เคียงที่สุดคือ ${stall}` : `The closest is ${stall}.`;
  },
  blockedBy(names: string, locale: Locale): string {
    return locale === "th" ? `ที่นั่นไม่มีเมนูสำหรับ ${names}` : `Nothing there for ${names}.`;
  },
  /** "If Mint's budget went to 55 and Ben dropped No pork, Stall 4 works for everyone." */
  ifChanges(parts: readonly string[], stall: string, locale: Locale): string {
    const joined = parts.join(locale === "th" ? " และ " : " and ");
    return locale === "th" ? `ถ้า${joined} ${stall} จะกินได้ทุกคน` : `If ${joined}, ${stall} works for everyone.`;
  },
  changeBudget(name: string, to: number, locale: Locale): string {
    return locale === "th" ? `งบของ ${name} เป็น ${n(to, locale)} บาท` : `${name}'s budget went to ${n(to, locale)} baht`;
  },
  changeDropDiet(name: string, diet: string, locale: Locale): string {
    return locale === "th" ? `${name} ไม่เลือก "${diet}"` : `${name} dropped "${diet}"`;
  },
  changeDropAvoid(name: string, avoid: string, locale: Locale): string {
    return locale === "th" ? `${name} เลิกเลือก "${avoid}"` : `${name} dropped "${avoid}"`;
  },
} as const;
