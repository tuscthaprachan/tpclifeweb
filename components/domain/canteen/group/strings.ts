/**
 * Copy for Eat as a group, in Thai and English. Casual voice is allowed here.
 * No em dashes. Plain module (no "use client"): safe from server and client.
 */

import type { Locale } from "@/lib/i18n/config";
import { editableStrings, fillText } from "@/lib/i18n/editable";
import { formatNumber } from "@/lib/i18n/format";

import type { Bilingual } from "../strings";

const n = (value: number, locale: Locale) => formatNumber(value, locale);

export const GROUP = editableStrings(
  "canteen-group",
  {
    pageTitle: { th: "กินเป็นกลุ่ม", en: "Eat as a group" } satisfies Bilingual,
    pageIntro: {
      th: "บอกว่าแต่ละคนกินอะไรได้ แล้วเราจะหาร้านให้ ไม่ต้องเถียงกันหน้าโรงอาหาร",
      en: "Tell us what each person can eat and we will find where to go, so nobody argues in front of the canteen.",
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
      th: "ข้อมูลกลุ่มเก็บไว้ในลิงก์เท่านั้น ไม่ได้เก็บบนเซิร์ฟเวอร์ ส่งลิงก์ให้เฉพาะคนที่จะไปกินด้วยกัน",
      en: "The group is stored in the link only and is not saved on a server. Send the link only to the people you are eating with.",
    } satisfies Bilingual,

    /* ---- Builder ---- */
    builderTitle: { th: "ใครจะไปกินบ้าง", en: "Who is eating?" } satisfies Bilingual,
    nameLabel: { th: "ชื่อหรืออีโมจิ (ไม่ใส่ก็ได้)", en: "Name or emoji (optional)" } satisfies Bilingual,
    nameHint: { th: "ไม่เกิน 24 ตัวอักษร", en: "Up to 24 characters." } satisfies Bilingual,
    budgetLabel: { th: "งบต่อจาน (บาท)", en: "Budget per dish (baht)" } satisfies Bilingual,
    budgetHint: { th: "ว่างไว้ถ้าไม่จำกัด", en: "Leave empty for no limit." } satisfies Bilingual,
    dietLegend: { th: "อาหารที่กินได้", en: "Diet" } satisfies Bilingual,
    avoidLegend: { th: "ไม่เอา", en: "Leave out" } satisfies Bilingual,
    remove: { th: "เอาออก", en: "Remove" } satisfies Bilingual,
    addPerson: { th: "เพิ่มอีกคน", en: "Add another person" } satisfies Bilingual,
    showResults: { th: "ดูผลลัพธ์", en: "Show results" } satisfies Bilingual,
    limitReached: {
      th: "ครบ 8 คนแล้ว เอาคนออกก่อนถึงจะเพิ่มอีกคนได้",
      en: "A group can have up to 8 people. Remove someone to add another.",
    } satisfies Bilingual,
    dirtyNote: {
      th: "แก้กลุ่มแล้ว กด \"ดูผลลัพธ์\" เพื่ออัปเดตร้านด้านล่าง",
      en: "You changed the group. Press Show results to update the stalls below.",
    } satisfies Bilingual,

    /* ---- Share ---- */
    shareTitle: { th: "ส่งกลุ่มนี้ให้เพื่อน", en: "Share this group" } satisfies Bilingual,
    shareHint: {
      th: "ใครเปิดลิงก์นี้จะเห็นทุกคนในกลุ่ม และเพิ่มตัวเองต่อได้",
      en: "Anyone who opens this link sees the whole group and can add themselves.",
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
      en: "Everyone gets their own pick, and you all sit together. Spin again for one person at a time.",
    } satisfies Bilingual,
    randomIntro: {
      th: "ทุกคนได้เมนูที่สุ่มมา ใครไม่ถูกใจกดสุ่มใหม่เฉพาะคนนั้นได้ หรือสุ่มใหม่ให้ทุกคน",
      en: "Everyone gets a random dish. If someone does not like theirs, spin again for just that person, or for everyone.",
    } satisfies Bilingual,
    reroll: { th: "สุ่มใหม่ให้คนนี้", en: "Spin again for this person" } satisfies Bilingual,
    spinAgain: { th: "สุ่มใหม่ให้ทุกคน", en: "Spin again for everyone" } satisfies Bilingual,
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
  },
  { th: "โรงอาหาร: กินเป็นกลุ่ม", en: "Canteen: Eat as a group" },
);

const PHRASE = editableStrings(
  "canteen-group-phrases",
  {
    person: { th: "คนที่ {num}", en: "Person {num}" },
    peopleCountOne: { th: "{count} คน", en: "{count} person" },
    peopleCountMany: { th: "{count} คน", en: "{count} people" },
    removeFull: { th: "เอา {label} ออก", en: "Remove {label}" },
    removedStatus: { th: "เอา {label} ออกแล้ว ตอนนี้มี {people}", en: "Removed {label}. {people} in the group." },
    addedStatus: { th: "เพิ่ม{person}แล้ว ตอนนี้มี {people}", en: "Added {person}. {people} in the group." },
    stallsWorkOne: { th: "{count} ร้านที่ทุกคนกินได้", en: "{count} stall works for everyone" },
    stallsWorkMany: { th: "{count} ร้านที่ทุกคนกินได้", en: "{count} stalls work for everyone" },
    fewest: { th: "ตัวเลือกน้อยที่สุดที่ร้านนี้: {name} มี {count} เมนู", en: "Fewest choices here: {name}, with {count}." },
    canHave: { th: "{name} กินได้", en: "{name} can have" },
    andMore: { th: "และอีก {count} เมนูที่ร้านนี้", en: "and {count} more at this stall" },
    rerollFor: { th: "สุ่มใหม่ให้ {name}", en: "Spin again for {name}" },
    nothingFits: { th: "ไม่มีเมนูที่ตรงกับเงื่อนไขของ {name}", en: "Nothing at the canteen fits {name}'s settings." },
    rerollCountOne: { th: "สุ่มใหม่แล้ว {count} ครั้ง", en: "Spun again {count} time" },
    rerollCountMany: { th: "สุ่มใหม่แล้ว {count} ครั้ง", en: "Spun again {count} times" },
    seatNear: { th: "ไปนั่งแถว {zone}", en: "Sit near: {zone}" },
    closest: { th: "ร้านที่ใกล้เคียงที่สุดคือ {stall}", en: "The closest is {stall}." },
    blockedBy: { th: "ที่นั่นไม่มีเมนูสำหรับ {names}", en: "Nothing there for {names}." },
    joinNames: { th: " และ ", en: ", " },
    joinChanges: { th: " และ ", en: " and " },
    ifChanges: { th: "ถ้า{joined} {stall} จะกินได้ทุกคน", en: "If {joined}, {stall} works for everyone." },
    changeBudget: { th: "งบของ {name} เป็น {amount} บาท", en: "{name}'s budget went to {amount} baht" },
    changeDropDiet: { th: '{name} ไม่เลือก "{diet}"', en: '{name} dropped "{diet}"' },
    changeDropAvoid: { th: '{name} เลิกเลือก "{avoid}"', en: '{name} dropped "{avoid}"' },
  },
  { th: "โรงอาหาร: กินเป็นกลุ่ม ข้อความที่มีตัวเลขและชื่อแทรก", en: "Canteen: Eat as a group, texts with numbers and names in them" },
);

export const group = {
  person(num: number, locale: Locale): string {
    return fillText(PHRASE.person[locale], { num: n(num, locale) });
  },
  peopleCount(count: number, locale: Locale): string {
    return fillText((count === 1 ? PHRASE.peopleCountOne : PHRASE.peopleCountMany)[locale], { count: n(count, locale) });
  },
  removeFull(label: string, locale: Locale): string {
    return fillText(PHRASE.removeFull[locale], { label });
  },
  removedStatus(label: string, count: number, locale: Locale): string {
    return fillText(PHRASE.removedStatus[locale], { label, people: group.peopleCount(count, locale) });
  },
  addedStatus(num: number, count: number, locale: Locale): string {
    return fillText(PHRASE.addedStatus[locale], { person: group.person(num, locale), people: group.peopleCount(count, locale) });
  },
  stallsWork(count: number, locale: Locale): string {
    return fillText((count === 1 ? PHRASE.stallsWorkOne : PHRASE.stallsWorkMany)[locale], { count: n(count, locale) });
  },
  fewest(name: string, count: number, locale: Locale): string {
    return fillText(PHRASE.fewest[locale], { name, count: n(count, locale) });
  },
  canHave(name: string, locale: Locale): string {
    return fillText(PHRASE.canHave[locale], { name });
  },
  andMore(count: number, locale: Locale): string {
    return fillText(PHRASE.andMore[locale], { count: n(count, locale) });
  },
  rerollFor(name: string, locale: Locale): string {
    return fillText(PHRASE.rerollFor[locale], { name });
  },
  reroll(locale: Locale): string {
    return GROUP.reroll[locale];
  },
  nothingFits(name: string, locale: Locale): string {
    return fillText(PHRASE.nothingFits[locale], { name });
  },
  rerollCount(count: number, locale: Locale): string {
    return fillText((count === 1 ? PHRASE.rerollCountOne : PHRASE.rerollCountMany)[locale], { count: n(count, locale) });
  },
  seatNear(zone: string, locale: Locale): string {
    return fillText(PHRASE.seatNear[locale], { zone });
  },
  stallPick(stall: string, names: string): string {
    return `${stall}: ${names}`;
  },
  closest(stall: string, locale: Locale): string {
    return fillText(PHRASE.closest[locale], { stall });
  },
  blockedBy(names: string, locale: Locale): string {
    return fillText(PHRASE.blockedBy[locale], { names });
  },
  /** What joins the names of several people in a sentence. */
  joinNames(names: readonly string[], locale: Locale): string {
    return names.join(PHRASE.joinNames[locale]);
  },
  /** "If Mint's budget went to 55 and Ben dropped No pork, Stall 4 works for everyone." */
  ifChanges(parts: readonly string[], stall: string, locale: Locale): string {
    const joined = parts.join(PHRASE.joinChanges[locale]);
    return fillText(PHRASE.ifChanges[locale], { joined, stall });
  },
  changeBudget(name: string, to: number, locale: Locale): string {
    return fillText(PHRASE.changeBudget[locale], { name, amount: n(to, locale) });
  },
  changeDropDiet(name: string, diet: string, locale: Locale): string {
    return fillText(PHRASE.changeDropDiet[locale], { name, diet });
  },
  changeDropAvoid(name: string, avoid: string, locale: Locale): string {
    return fillText(PHRASE.changeDropAvoid[locale], { name, avoid });
  },
} as const;
