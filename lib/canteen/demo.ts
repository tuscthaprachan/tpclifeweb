/**
 * A FICTIONAL canteen, for previews only.
 *
 * Turned on with `CANTEEN_DEMO=1`. Every stall, dish, price and date in this
 * file is made up so the owner can see the What to eat service working with a
 * realistic amount of data. None of it is a survey of the real canteen, and
 * the site says so: `app/[locale]/eat/layout.tsx` shows a banner on every
 * /eat page, search and the home page label the records as demo data, the
 * /eat pages are set to noindex and the sitemap leaves them out.
 *
 * Names are plain about it ("Demo stall 1"). Ids start with "demo-".
 *
 * Floor plan (12 columns by 8 rows, river on the east side):
 *
 *   row 0-1:  stall 1 (0-2)   stall 2 (3-5)   stall 3 (6-8)   stall 4 (9-11)
 *   row 3-4:  zone A (1-3)    zone B (5-7)    zone C (8-10)
 *   row 6-7:  stall 5 (0-2)   stall 6 (3-5)   stall 7 (6-8)   stall 8 (9-11)
 *
 * with the main road entrance on the west edge and the river side entrance on
 * the east edge, both on row 4.
 *
 * Price history. Four survey dates, one in each of four semesters (1/2025,
 * 2/2025, summer 2025 and 1/2026), so the price tracker has a line to draw.
 * About three dishes in four went up by 5 baht at some point.
 */

import type {
  CanonicalDish,
  CanteenCuisine,
  CanteenData,
  CanteenDish,
  CanteenEntrance,
  CanteenSeatingZone,
  CanteenSettings,
  CanteenStall,
  DietAvailability,
  DishType,
  DishVariant,
  HalalStatus,
  HowToOrderPhrase,
  Protein,
  SpiceLevel,
  CookingStyle,
  Temperature,
  DishCourse,
} from "@/lib/sanity/types";

/** True when the fictional dataset is switched on. Read on the server, in any NODE_ENV. */
export function isCanteenDemo(): boolean {
  return process.env.CANTEEN_DEMO === "1";
}

/** The wording that marks demo data wherever it appears. Both languages, no em dashes. */
export const DEMO_NOTICE = {
  title: { th: "ข้อมูลตัวอย่าง", en: "Demo data" },
  body: {
    th: "ร้านค้า เมนูและราคาในส่วนนี้สมมติขึ้นเพื่อแสดงการทำงานของบริการ ไม่ใช่ข้อมูลของโรงอาหารจริง",
    en: "These stalls, dishes and prices are made up to show how this works. They are not the real canteen.",
  },
  /** Appended to a line that would otherwise read as a real record. */
  label: { th: "(ข้อมูลตัวอย่าง)", en: "(demo data)" },
} as const;

/** Survey dates, one per semester. The last one is every dish's "checked on". */
const CHECKED_ON = "2026-09-08";
const SURVEYS = ["2025-09-15", "2026-02-10", "2026-06-20", CHECKED_ON] as const;

/** Which survey a 5 baht rise first shows in, by dish position. Every fourth dish never rose. */
const RISE_AT = [Number.POSITIVE_INFINITY, 1, 2, 3];

const slug = (current: string) => ({ _type: "slug" as const, current });
const ref = (id: string) => ({ _type: "reference" as const, _ref: id });

/* ------------------------------------------------------------------ *
 * Stalls
 * ------------------------------------------------------------------ */

interface StallSpec {
  number: number;
  th: string;
  en: string;
  cuisine: CanteenCuisine[];
  halal: HalalStatus;
  halalCheckedOn?: string;
  vegetarianStall?: boolean;
  col: number;
  row: number;
  wayfinding: { th: string; en: string };
  ownHours?: boolean;
}

const STALL_SPECS: StallSpec[] = [
  {
    number: 1,
    th: "ร้านตัวอย่าง 1 ข้าวราดแกง",
    en: "Demo stall 1, curry over rice",
    cuisine: ["curryOverRice", "thaiRice"],
    halal: "none",
    col: 0,
    row: 0,
    wayfinding: {
      th: "ร้านแรกริมผนังด้านเหนือ อยู่ใกล้ทางเข้าถนนใหญ่",
      en: "First stall along the north wall, close to the main road entrance.",
    },
  },
  {
    number: 2,
    th: "ร้านตัวอย่าง 2 อาหารตามสั่ง",
    en: "Demo stall 2, made to order",
    cuisine: ["madeToOrder"],
    halal: "none",
    col: 3,
    row: 0,
    wayfinding: {
      th: "ร้านที่สองริมผนังด้านเหนือ ถัดจากร้านข้าวราดแกง",
      en: "Second stall along the north wall, right after the curry over rice stall.",
    },
  },
  {
    number: 3,
    th: "ร้านตัวอย่าง 3 ก๋วยเตี๋ยว",
    en: "Demo stall 3, noodles",
    cuisine: ["noodles"],
    halal: "none",
    col: 6,
    row: 0,
    ownHours: true,
    wayfinding: {
      th: "ร้านที่สามริมผนังด้านเหนือ มองหาหม้อน้ำซุปหน้าร้าน",
      en: "Third stall along the north wall. Look for the broth pots at the front.",
    },
  },
  {
    number: 4,
    th: "ร้านตัวอย่าง 4 ข้าวมันไก่",
    en: "Demo stall 4, chicken rice",
    cuisine: ["chickenRice"],
    halal: "stallDeclared",
    halalCheckedOn: "2026-08-20",
    col: 9,
    row: 0,
    wayfinding: {
      th: "ร้านสุดท้ายริมผนังด้านเหนือ ใกล้ทางเข้าฝั่งแม่น้ำ",
      en: "Last stall along the north wall, nearest the river side entrance.",
    },
  },
  {
    number: 5,
    th: "ร้านตัวอย่าง 5 อาหารอีสาน",
    en: "Demo stall 5, Isan food",
    cuisine: ["isan"],
    halal: "none",
    col: 0,
    row: 6,
    wayfinding: {
      th: "ร้านแรกริมผนังด้านใต้ เดินเข้าจากทางเข้าถนนใหญ่แล้วเลี้ยวซ้าย",
      en: "First stall along the south wall. Come in from the main road entrance and turn left.",
    },
  },
  {
    number: 6,
    th: "ร้านตัวอย่าง 6 อาหารมุสลิม",
    en: "Demo stall 6, Muslim food (halal certified)",
    cuisine: ["muslim"],
    halal: "certified",
    halalCheckedOn: "2026-08-20",
    col: 3,
    row: 6,
    wayfinding: {
      th: "ร้านที่สองริมผนังด้านใต้ ตรงข้ามร้านตามสั่ง",
      en: "Second stall along the south wall, across the hall from the made to order stall.",
    },
  },
  {
    number: 7,
    th: "ร้านตัวอย่าง 7 อาหารเจและมังสวิรัติ",
    en: "Demo stall 7, jay and vegetarian",
    cuisine: ["thaiRice", "madeToOrder"],
    halal: "none",
    vegetarianStall: true,
    col: 6,
    row: 6,
    wayfinding: {
      th: "ร้านที่สามริมผนังด้านใต้ มีธงเจสีเหลืองหน้าร้าน",
      en: "Third stall along the south wall, with the yellow jay flag at the front.",
    },
  },
  {
    number: 8,
    th: "ร้านตัวอย่าง 8 เครื่องดื่มและของหวาน",
    en: "Demo stall 8, drinks and desserts",
    cuisine: ["drinks", "desserts", "fruit"],
    halal: "none",
    col: 9,
    row: 6,
    wayfinding: {
      th: "ร้านสุดท้ายริมผนังด้านใต้ ใกล้ทางเข้าฝั่งแม่น้ำ",
      en: "Last stall along the south wall, nearest the river side entrance.",
    },
  },
];

function buildStalls(stamp: string): CanteenStall[] {
  return STALL_SPECS.map((spec) => ({
    _id: `demo-stall-${spec.number}`,
    _type: "canteenStall" as const,
    _createdAt: stamp,
    _updatedAt: stamp,
    name: { th: spec.th, en: spec.en },
    slug: slug(`demo-stall-${spec.number}`),
    number: spec.number,
    cuisine: spec.cuisine,
    halal: spec.halal,
    ...(spec.halalCheckedOn ? { halalCheckedOn: spec.halalCheckedOn } : {}),
    ...(spec.vegetarianStall ? { vegetarianStall: true } : {}),
    ...(spec.ownHours
      ? { hours: [{ _key: "own", daysOfWeek: [1, 2, 3, 4, 5], opens: "09:00", closes: "14:00" }] }
      : {}),
    mapCell: { col: spec.col, row: spec.row, w: 3, h: 2 },
    wayfinding: spec.wayfinding,
  }));
}

/* ------------------------------------------------------------------ *
 * Canonical dishes
 * ------------------------------------------------------------------ */

const phrase = (th: string, romanised: string, en: string): Omit<HowToOrderPhrase, "_key"> => ({ th, romanised, en });

const NOT_SPICY = phrase("ไม่เผ็ด", "mai phet", "not spicy");
const A_LITTLE_SPICY = phrase("เผ็ดน้อย", "phet noi", "a little spicy");
const EGG = phrase("ไข่ดาว", "khai dao", "add a fried egg");
const LARGE = phrase("พิเศษ", "phiset", "large portion");
const TAKE_AWAY = phrase("ใส่ถุง", "sai thung", "to take away");
const NO_MEAT = phrase("ไม่ใส่เนื้อสัตว์", "mai sai nuea sat", "no meat");

interface CanonicalSpec {
  id: string;
  slug: string;
  th: string;
  en: string;
  aliases: string[];
  explainer: { th: string; en: string };
  phrases: Array<Omit<HowToOrderPhrase, "_key">>;
}

const CANONICAL_SPECS: CanonicalSpec[] = [
  {
    id: "pad-kra-pao",
    slug: "pad-kra-pao",
    th: "ข้าวกะเพรา",
    en: "Holy basil stir-fry over rice",
    aliases: ["krapow", "kaprao", "gaprao", "kra pao", "pad kaprao", "กะเพา", "กระเพรา"],
    explainer: {
      th: "ผัดกะเพราคือเนื้อสัตว์สับผัดกับใบกะเพรา พริกและกระเทียม ราดบนข้าวสวย มักเสิร์ฟพร้อมไข่ดาวกรอบ เป็นเมนูตามสั่งที่คนสั่งมากที่สุด และรสเผ็ดกว่าที่คิดเสมอ",
      en: "Minced meat stir-fried with holy basil, chilli and garlic, served over rice and usually topped with a crispy fried egg. It is the most ordered made to order dish, and it is spicier than you expect.",
    },
    phrases: [NOT_SPICY, A_LITTLE_SPICY, EGG, LARGE, TAKE_AWAY],
  },
  {
    id: "khao-man-gai",
    slug: "khao-man-gai",
    th: "ข้าวมันไก่",
    en: "Hainanese chicken rice",
    aliases: ["khao man kai", "khaomangai", "chicken rice", "ข้าวมัน"],
    explainer: {
      th: "ไก่ต้มหรือไก่ทอดเสิร์ฟกับข้าวที่หุงในน้ำมันไก่ น้ำจิ้มเต้าเจี้ยวรสเค็มหวานเผ็ดเล็กน้อย และน้ำซุปใส ไม่เผ็ดและกินง่าย เหมาะกับคนที่เพิ่งมาลองอาหารไทย",
      en: "Poached or fried chicken over rice cooked in chicken fat, with a salty-sweet fermented bean dipping sauce and a clear broth. It is mild and easy, a good first Thai meal.",
    },
    phrases: [phrase("ไม่เอาหนัง", "mai ao nang", "without the skin"), LARGE, TAKE_AWAY],
  },
  {
    id: "khao-mok-gai",
    slug: "khao-mok-gai",
    th: "ข้าวหมกไก่",
    en: "Chicken biryani, Thai style",
    aliases: ["khao mok kai", "khaomokgai", "biryani", "ข้าวหมก"],
    explainer: {
      th: "ข้าวหุงกับเครื่องเทศและขมิ้น วางไก่ทอดหรือไก่ต้มไว้ด้านบน กินกับน้ำจิ้มรสเปรี้ยวและน้ำซุป เป็นอาหารมุสลิมที่พบได้ทั่วไป",
      en: "Rice cooked with spices and turmeric, topped with fried or poached chicken, eaten with a sour dipping sauce and a small bowl of broth. A staple of Thai Muslim cooking.",
    },
    phrases: [LARGE, phrase("ไม่เอาน้ำจิ้ม", "mai ao nam chim", "without the dipping sauce"), TAKE_AWAY],
  },
  {
    id: "som-tam",
    slug: "som-tam",
    th: "ส้มตำ",
    en: "Green papaya salad",
    aliases: ["som tum", "somtam", "papaya salad", "ตำไทย"],
    explainer: {
      th: "สลัดมะละกอดิบตำกับพริก กระเทียม มะนาว น้ำปลาและน้ำตาลปี๊บ รสเปรี้ยว เค็ม หวานและเผ็ดจัด กินคู่กับข้าวเหนียวและไก่ย่าง",
      en: "Shredded unripe papaya pounded with chilli, garlic, lime, fish sauce and palm sugar. Sour, salty, sweet and very hot, eaten with sticky rice and grilled chicken.",
    },
    phrases: [
      NOT_SPICY,
      A_LITTLE_SPICY,
      phrase("ไม่ใส่ปลาร้า", "mai sai pla ra", "without fermented fish"),
      phrase("ไม่ใส่น้ำปลา", "mai sai nam pla", "without fish sauce"),
    ],
  },
  {
    id: "larb",
    slug: "larb",
    th: "ลาบ",
    en: "Larb, minced meat salad",
    aliases: ["laab", "larp", "lahb"],
    explainer: {
      th: "เนื้อสับปรุงรสด้วยน้ำมะนาว น้ำปลา พริกป่นและข้าวคั่ว โรยสะระแหน่และต้นหอม เป็นอาหารอีสานที่กินกับข้าวเหนียวหรือผักสด",
      en: "Minced meat dressed with lime juice, fish sauce, chilli flakes and toasted rice powder, topped with mint and spring onion. An Isan dish eaten with sticky rice or fresh vegetables.",
    },
    phrases: [NOT_SPICY, A_LITTLE_SPICY, phrase("ข้าวเหนียวด้วย", "khao niao duai", "with sticky rice")],
  },
  {
    id: "khao-pad",
    slug: "khao-pad",
    th: "ข้าวผัด",
    en: "Fried rice",
    aliases: ["khao phat", "khaopad", "fried rice"],
    explainer: {
      th: "ข้าวสวยผัดกับไข่และเนื้อสัตว์ปรุงด้วยซีอิ๊วและน้ำมันหอย เสิร์ฟพร้อมแตงกวา มะนาวและพริกน้ำปลา ไม่เผ็ด",
      en: "Rice stir-fried with egg and your choice of meat, seasoned with soy and oyster sauce, served with cucumber, a lime wedge and chilli in fish sauce on the side. Not spicy.",
    },
    phrases: [EGG, LARGE, NO_MEAT, TAKE_AWAY],
  },
  {
    id: "pad-see-ew",
    slug: "pad-see-ew",
    th: "ผัดซีอิ๊ว",
    en: "Stir-fried wide noodles in soy sauce",
    aliases: ["pad si ew", "pad siew", "phat si io", "ผัดซีอิ้ว"],
    explainer: {
      th: "เส้นใหญ่ผัดกับซีอิ๊วดำ ไข่ และผักคะน้า ได้กลิ่นไหม้อ่อนจากกระทะร้อน รสหวานเค็ม ไม่เผ็ด",
      en: "Wide rice noodles fried with dark soy sauce, egg and Chinese broccoli. Smoky from a very hot wok, sweet and salty, not spicy.",
    },
    phrases: [LARGE, NO_MEAT, phrase("ไม่ใส่ไข่", "mai sai khai", "without egg")],
  },
  {
    id: "rad-na",
    slug: "rad-na",
    th: "ราดหน้า",
    en: "Noodles in thick gravy",
    aliases: ["rat na", "lad na", "rad nah"],
    explainer: {
      th: "เส้นใหญ่ผัดหรือเส้นหมี่กรอบราดน้ำเกรวี่ข้นจากแป้งมัน ใส่ผักคะน้าและเนื้อสัตว์ รสออกหวานมัน กินแล้วอุ่นท้อง",
      en: "Pan-fried wide noodles or crispy noodles under a thick, glossy gravy with Chinese broccoli and meat. Savoury and comforting, not spicy.",
    },
    phrases: [LARGE, NO_MEAT, phrase("เส้นหมี่กรอบ", "sen mi krop", "crispy noodles")],
  },
  {
    id: "tom-yum",
    slug: "tom-yum",
    th: "ต้มยำ",
    en: "Tom yum, hot and sour soup",
    aliases: ["tom yam", "tomyum", "tom yum goong"],
    explainer: {
      th: "ซุปเปรี้ยวเผ็ดหอมตะไคร้ ข่าและใบมะกรูด จะเป็นน้ำใสหรือน้ำข้นก็ได้ ใส่เป็นซุปถ้วยเดียว หรือใส่ในก๋วยเตี๋ยว",
      en: "A hot and sour soup scented with lemongrass, galangal and makrut lime leaf, clear or creamy. Ordered as a bowl of soup or as the broth for noodles.",
    },
    phrases: [NOT_SPICY, A_LITTLE_SPICY, phrase("น้ำใส", "nam sai", "clear broth"), phrase("น้ำข้น", "nam khon", "creamy broth")],
  },
  {
    id: "khao-gaeng",
    slug: "khao-gaeng",
    th: "ข้าวราดแกง",
    en: "Curry over rice",
    aliases: ["khao raad gaeng", "khao rad kaeng", "curry rice", "ข้าวแกง"],
    explainer: {
      th: "ข้าวสวยหนึ่งจานราดแกงที่เลือกเองหนึ่งหรือสองอย่างจากหม้อหน้าร้าน ชี้เลือกได้เลย ไม่ต้องรู้ชื่อเมนู ราคาขึ้นอยู่กับจำนวนอย่าง",
      en: "A plate of rice with one or two curries or dishes of your choice from the pots at the counter. You can simply point. The price depends on how many toppings you take.",
    },
    phrases: [phrase("ราดสองอย่าง", "rat song yang", "two toppings"), phrase("เอาอันนี้", "ao an ni", "this one, please"), EGG, TAKE_AWAY],
  },
  {
    id: "jok",
    slug: "jok",
    th: "โจ๊ก",
    en: "Rice porridge",
    aliases: ["joke", "jook", "congee"],
    explainer: {
      th: "ข้าวต้มเละร้อน ๆ กินกับขิง ต้นหอมและไข่ลวก อาหารเช้าที่ย่อยง่าย ไม่เผ็ด",
      en: "Hot, smooth rice porridge with ginger, spring onion and a soft egg. A gentle breakfast that is not spicy.",
    },
    phrases: [phrase("ใส่ไข่", "sai khai", "add an egg"), LARGE, TAKE_AWAY],
  },
  {
    id: "kuay-teow",
    slug: "kuay-teow",
    th: "ก๋วยเตี๋ยว",
    en: "Rice noodle soup",
    aliases: ["guay teow", "kuaitiao", "kway teow", "noodle soup", "ก๊วยเตี๋ยว"],
    explainer: {
      th: "เส้นข้าวในน้ำซุปร้อน เลือกเส้นได้ ได้แก่ เส้นเล็ก เส้นใหญ่ หมี่ขาว และบะหมี่ กินแบบน้ำหรือแบบแห้งก็ได้ ปรุงรสเองที่โต๊ะ",
      en: "Rice noodles in hot broth. You choose the noodle: thin, wide, vermicelli or egg noodle, soup or dry. You season it yourself at the table.",
    },
    phrases: [
      phrase("เส้นเล็ก", "sen lek", "thin noodles"),
      phrase("เส้นใหญ่", "sen yai", "wide noodles"),
      phrase("แห้ง", "haeng", "dry, without soup"),
      LARGE,
    ],
  },
  {
    id: "pad-thai",
    slug: "pad-thai",
    th: "ผัดไทย",
    en: "Pad Thai",
    aliases: ["phat thai", "padthai"],
    explainer: {
      th: "เส้นจันท์ผัดกับซอสมะขาม ไข่ เต้าหู้และถั่วงอก โรยถั่วลิสงป่น กินกับมะนาวและกุยช่าย รสเปรี้ยวหวานเค็ม",
      en: "Rice noodles fried in a tamarind sauce with egg, tofu and bean sprouts, topped with crushed peanuts and served with lime and garlic chives. Sweet, sour and salty.",
    },
    phrases: [phrase("ห่อไข่", "ho khai", "wrapped in an omelette"), NO_MEAT, LARGE],
  },
  {
    id: "cha-yen",
    slug: "cha-yen",
    th: "ชาเย็น",
    en: "Thai iced tea",
    aliases: ["cha yen", "thai tea", "chaa yen"],
    explainer: {
      th: "ชาอัสสัมเข้มข้นผสมนมข้นหวานและนมสด เสิร์ฟเย็นจัดบนน้ำแข็ง หวานมากตามมาตรฐาน",
      en: "Strong Assam tea sweetened with condensed milk and finished with milk, served over ice. Very sweet by default.",
    },
    phrases: [phrase("หวานน้อย", "wan noi", "less sweet"), phrase("ไม่ใส่น้ำแข็ง", "mai sai nam khaeng", "without ice"), LARGE],
  },
  {
    id: "bua-loy",
    slug: "bua-loy",
    th: "บัวลอย",
    en: "Rice balls in coconut milk",
    aliases: ["bua loi", "bualoy"],
    explainer: {
      th: "ลูกแป้งข้าวเหนียวเคี้ยวหนึบในน้ำกะทิอุ่นรสหวานเค็ม ใส่ไข่หวานได้ เป็นของหวานไทยแบบดั้งเดิม",
      en: "Chewy glutinous rice balls in warm, lightly salted sweet coconut milk, with an optional sweet egg. A traditional Thai dessert.",
    },
    phrases: [phrase("ใส่ไข่หวาน", "sai khai wan", "add the sweet egg"), phrase("หวานน้อย", "wan noi", "less sweet")],
  },
  {
    id: "khai-jiao",
    slug: "khai-jiao",
    th: "ไข่เจียว",
    en: "Thai omelette",
    aliases: ["kai jiew", "khai jeow", "thai omelet"],
    explainer: {
      th: "ไข่ตีแล้วทอดในน้ำมันร้อนจนฟูกรอบ กินกับข้าวสวยและน้ำพริกหรือซอสพริก ใส่หมูสับได้ ไม่เผ็ด",
      en: "Beaten eggs fried in plenty of hot oil until puffed and crispy at the edges, eaten over rice with chilli sauce. Often made with minced pork. Not spicy.",
    },
    phrases: [phrase("ใส่หมูสับ", "sai mu sap", "with minced pork"), phrase("ไม่ใส่หมู", "mai sai mu", "without pork"), TAKE_AWAY],
  },
];

function buildCanonicals(stamp: string): CanonicalDish[] {
  return CANONICAL_SPECS.map((spec) => ({
    _id: `demo-canonical-${spec.id}`,
    _type: "canonicalDish" as const,
    _createdAt: stamp,
    _updatedAt: stamp,
    name: { th: spec.th, en: spec.en },
    slug: slug(spec.slug),
    aliases: spec.aliases,
    explainer: spec.explainer,
    howToOrder: spec.phrases.map((p, i) => ({ _key: `${spec.id}-${i}`, ...p })),
  }));
}

/* ------------------------------------------------------------------ *
 * Dishes
 * ------------------------------------------------------------------ */

const SPECIAL: DishVariant = { _key: "special", label: { th: "พิเศษ", en: "Large portion" }, delta: 10 };
const FRIED_EGG: DishVariant = { _key: "egg", label: { th: "ไข่ดาว", en: "Fried egg" }, delta: 10 };
const BIG_CUP: DishVariant = { _key: "big", label: { th: "แก้วใหญ่", en: "Large cup" }, delta: 10 };
const EXTRA_TOPPING: DishVariant = { _key: "topping", label: { th: "เพิ่มท็อปปิ้ง", en: "Extra topping" }, delta: 10 };

interface DishOptions {
  canonical?: string;
  type?: DishType;
  course?: DishCourse;
  protein?: Protein[];
  style?: CookingStyle;
  spice?: SpiceLevel;
  temperature?: Temperature;
  wet?: boolean;
  vegetarian?: DietAvailability;
  vegan?: DietAvailability;
  jay?: DietAvailability;
  variants?: DishVariant[];
}

interface DishSpec extends DishOptions {
  slug: string;
  stall: number;
  th: string;
  en: string;
  price: number;
}

const specs: DishSpec[] = [];

/** Adds one dish to the list. Defaults describe a dry, hot, mildly spiced rice plate. */
function d(stall: number, slugText: string, th: string, en: string, price: number, options: DishOptions = {}): void {
  specs.push({ stall, slug: slugText, th, en, price, ...options });
}

/* Stall 1: curry over rice. */
const CURRY: DishOptions = { type: "curryOverRice", style: "curry", wet: true, canonical: "khao-gaeng", variants: [EXTRA_TOPPING] };
d(1, "green-curry-chicken-rice", "ข้าวราดแกงเขียวหวานไก่", "Green curry chicken over rice", 45, { ...CURRY, protein: ["chicken"], spice: 2 });
d(1, "panang-pork-rice", "ข้าวราดพะแนงหมู", "Panang pork curry over rice", 45, { ...CURRY, protein: ["pork"], spice: 1 });
d(1, "massaman-chicken-rice", "ข้าวราดมัสมั่นไก่", "Massaman chicken curry over rice", 45, { ...CURRY, protein: ["chicken"], spice: 1 });
d(1, "curry-one-topping", "ข้าวราดแกง 1 อย่าง", "Curry over rice, one topping", 35, { ...CURRY, protein: ["pork"], spice: 1 });
d(1, "curry-two-toppings", "ข้าวราดแกง 2 อย่าง", "Curry over rice, two toppings", 50, { ...CURRY, protein: ["pork", "chicken"], spice: 1 });
d(1, "stewed-egg-rice", "ข้าวไข่พะโล้", "Five-spice stewed egg and pork over rice", 40, { type: "curryOverRice", style: "boiled", wet: true, protein: ["pork", "egg"], spice: 0, variants: [SPECIAL] });
d(1, "pad-prik-king-pork", "ข้าวผัดพริกขิงหมู", "Pork stir-fried with chilli paste and beans, over rice", 45, { protein: ["pork"], spice: 2, variants: [FRIED_EGG] });
d(1, "omelette-rice-curry", "ข้าวไข่เจียวราดแกง", "Omelette over rice", 30, { canonical: "khai-jiao", protein: ["egg"], style: "deepFried", spice: 0, vegetarian: "canAsk", variants: [SPECIAL] });
d(1, "morning-glory-rice", "ข้าวผัดผักบุ้งไฟแดง", "Morning glory stir-fried with garlic, over rice", 40, { protein: ["pork"], spice: 2, vegetarian: "canAsk", vegan: "canAsk", jay: "canAsk" });

/* Stall 2: made to order. */
const ORDER: DishOptions = { type: "madeToOrder", variants: [SPECIAL, FRIED_EGG] };
d(2, "kra-pao-pork", "กะเพราหมูสับ", "Holy basil minced pork", 50, { ...ORDER, canonical: "pad-kra-pao", protein: ["pork"], spice: 3 });
d(2, "kra-pao-chicken", "กะเพราไก่", "Holy basil chicken", 50, { ...ORDER, canonical: "pad-kra-pao", protein: ["chicken"], spice: 3 });
d(2, "kra-pao-crispy-pork", "กะเพราหมูกรอบ", "Holy basil crispy pork belly", 60, { ...ORDER, canonical: "pad-kra-pao", protein: ["pork"], spice: 3 });
d(2, "kra-pao-seafood", "กะเพราทะเล", "Holy basil mixed seafood", 65, { ...ORDER, canonical: "pad-kra-pao", protein: ["seafood"], spice: 3 });
d(2, "khao-pad-pork", "ข้าวผัดหมู", "Fried rice with pork", 45, { ...ORDER, canonical: "khao-pad", protein: ["pork", "egg"], spice: 0, vegetarian: "canAsk" });
d(2, "khao-pad-shrimp", "ข้าวผัดกุ้ง", "Fried rice with shrimp", 60, { ...ORDER, canonical: "khao-pad", protein: ["seafood", "egg"], spice: 0 });
d(2, "pad-see-ew-pork", "ผัดซีอิ๊วหมู", "Wide noodles in soy sauce with pork", 50, { ...ORDER, type: "noodles", canonical: "pad-see-ew", protein: ["pork", "egg"], spice: 0 });
d(2, "rad-na-pork", "ราดหน้าหมู", "Noodles in gravy with pork", 55, { ...ORDER, type: "noodles", canonical: "rad-na", protein: ["pork"], spice: 0, wet: true });
d(2, "khai-jiao-pork", "ไข่เจียวหมูสับ", "Omelette with minced pork over rice", 40, { ...ORDER, canonical: "khai-jiao", protein: ["pork", "egg"], style: "deepFried", spice: 0 });
d(2, "jok-pork", "โจ๊กหมู", "Rice porridge with pork", 35, { type: "soup", canonical: "jok", protein: ["pork"], style: "boiled", spice: 0, wet: true, variants: [SPECIAL] });
d(2, "pad-thai-shrimp", "ผัดไทยกุ้งสด", "Pad Thai with fresh shrimp", 55, { ...ORDER, type: "noodles", canonical: "pad-thai", protein: ["seafood", "egg"], spice: 0 });

/* Stall 3: noodles. */
const NOODLE: DishOptions = { type: "noodles", style: "boiled", wet: true, variants: [SPECIAL] };
d(3, "noodle-soup-pork", "ก๋วยเตี๋ยวหมูน้ำใส", "Pork noodle soup, clear broth", 45, { ...NOODLE, canonical: "kuay-teow", protein: ["pork"], spice: 0 });
d(3, "noodle-tom-yum-pork", "ก๋วยเตี๋ยวต้มยำหมู", "Pork noodles in tom yum broth", 50, { ...NOODLE, canonical: "tom-yum", protein: ["pork"], spice: 2 });
d(3, "boat-noodles", "ก๋วยเตี๋ยวเรือ", "Boat noodles", 40, { ...NOODLE, canonical: "kuay-teow", protein: ["pork", "beef"], spice: 2 });
d(3, "yen-ta-fo", "เย็นตาโฟ", "Pink noodle soup with fish balls and squid", 50, { ...NOODLE, protein: ["fish", "seafood"], spice: 1 });
d(3, "egg-noodle-dry-pork", "บะหมี่แห้งหมูแดง", "Dry egg noodles with roast pork", 45, { ...NOODLE, wet: false, style: "stirFried", protein: ["pork"], spice: 0 });
d(3, "wonton-noodle", "บะหมี่เกี๊ยวหมู", "Egg noodles with pork wontons", 50, { ...NOODLE, protein: ["pork"], spice: 0 });
d(3, "kuay-teow-kua-gai", "ก๋วยเตี๋ยวคั่วไก่", "Fried wide noodles with chicken and egg", 45, { ...NOODLE, wet: false, style: "stirFried", protein: ["chicken", "egg"], spice: 0 });
d(3, "pad-see-ew-chicken", "ผัดซีอิ๊วไก่", "Wide noodles in soy sauce with chicken", 50, { ...NOODLE, wet: false, style: "stirFried", canonical: "pad-see-ew", protein: ["chicken", "egg"], spice: 0 });
d(3, "rad-na-seafood", "ราดหน้าทะเล", "Noodles in gravy with seafood", 65, { ...NOODLE, canonical: "rad-na", style: "stirFried", protein: ["seafood"], spice: 0 });
d(3, "pad-thai-chicken", "ผัดไทยไก่", "Pad Thai with chicken", 50, { ...NOODLE, wet: false, style: "stirFried", canonical: "pad-thai", protein: ["chicken", "egg"], spice: 0 });

/* Stall 4: chicken rice. */
const CHICKEN_RICE: DishOptions = { canonical: "khao-man-gai", protein: ["chicken"], style: "steamed", spice: 0, variants: [SPECIAL] };
d(4, "khao-man-gai", "ข้าวมันไก่ต้ม", "Chicken rice, poached", 45, CHICKEN_RICE);
d(4, "khao-man-gai-fried", "ข้าวมันไก่ทอด", "Chicken rice, fried chicken", 50, { ...CHICKEN_RICE, style: "deepFried" });
d(4, "khao-man-gai-mixed", "ข้าวมันไก่รวม", "Chicken rice, poached and fried", 55, { ...CHICKEN_RICE, style: "deepFried" });
d(4, "khao-man-gai-breast", "ข้าวมันไก่อกไก่", "Chicken rice, breast meat only", 50, CHICKEN_RICE);
d(4, "khao-na-gai-yang", "ข้าวหน้าไก่ย่าง", "Grilled chicken over rice", 50, { protein: ["chicken"], style: "grilled", spice: 1, variants: [SPECIAL] });
d(4, "chicken-broth-bowl", "น้ำซุปไก่ถ้วย", "Chicken broth, one bowl", 20, { type: "soup", course: "side", protein: ["chicken"], style: "boiled", spice: 0, wet: true });

/* Stall 5: Isan. */
d(5, "som-tam-thai", "ตำไทย", "Som tam Thai, sweet and sour", 40, { type: "singlePlate", canonical: "som-tam", protein: ["seafood"], style: "salad", spice: 3, temperature: "cold", vegetarian: "canAsk" });
d(5, "som-tam-poo-pla-ra", "ตำปูปลาร้า", "Som tam with salted crab and fermented fish", 45, { type: "singlePlate", canonical: "som-tam", protein: ["seafood", "fish"], style: "salad", spice: 3, temperature: "cold" });
d(5, "larb-pork", "ลาบหมู", "Pork larb", 55, { type: "singlePlate", canonical: "larb", protein: ["pork"], style: "salad", spice: 3 });
d(5, "nam-tok-pork", "น้ำตกหมู", "Grilled pork neck salad", 60, { type: "singlePlate", protein: ["pork"], style: "grilled", spice: 3 });
d(5, "grilled-chicken-isan", "ไก่ย่างอีสาน", "Isan grilled chicken", 55, { type: "singlePlate", protein: ["chicken"], style: "grilled", spice: 1, variants: [SPECIAL] });
d(5, "sai-krok-isan", "ไส้กรอกอีสาน", "Isan sausage, four pieces", 35, { type: "snack", course: "side", protein: ["pork"], style: "grilled", spice: 1 });
d(5, "sticky-rice", "ข้าวเหนียว", "Sticky rice, one bag", 10, { type: "rice", course: "side", protein: ["none"], style: "steamed", spice: 0, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(5, "tom-saep-pork", "ต้มแซ่บกระดูกหมู", "Spicy pork rib soup", 55, { type: "soup", canonical: "tom-yum", protein: ["pork"], style: "boiled", spice: 3, wet: true });

/* Stall 6: Muslim food, halal certified. */
d(6, "khao-mok-gai", "ข้าวหมกไก่", "Chicken biryani", 55, { canonical: "khao-mok-gai", protein: ["chicken"], style: "steamed", spice: 1, variants: [SPECIAL] });
d(6, "khao-mok-beef", "ข้าวหมกเนื้อ", "Beef biryani", 65, { canonical: "khao-mok-gai", protein: ["beef"], style: "steamed", spice: 1, variants: [SPECIAL] });
d(6, "kra-pao-chicken-halal", "กะเพราไก่ฮาลาล", "Holy basil chicken", 50, { type: "madeToOrder", canonical: "pad-kra-pao", protein: ["chicken"], spice: 3, variants: [SPECIAL, FRIED_EGG] });
d(6, "khao-pad-chicken-halal", "ข้าวผัดไก่", "Fried rice with chicken", 50, { type: "madeToOrder", canonical: "khao-pad", protein: ["chicken", "egg"], spice: 0, variants: [SPECIAL, FRIED_EGG] });
d(6, "larb-beef", "ลาบเนื้อ", "Beef larb", 60, { type: "singlePlate", canonical: "larb", protein: ["beef"], style: "salad", spice: 3 });
d(6, "massaman-beef-rice", "ข้าวราดมัสมั่นเนื้อ", "Massaman beef curry over rice", 60, { type: "curryOverRice", canonical: "khao-gaeng", protein: ["beef"], style: "curry", spice: 1, wet: true });
d(6, "roti-gaeng", "โรตีแกงไก่", "Roti with chicken curry", 40, { type: "snack", protein: ["chicken"], style: "curry", spice: 1, wet: true });
d(6, "tom-yum-chicken", "ต้มยำไก่", "Tom yum chicken soup", 55, { type: "soup", canonical: "tom-yum", protein: ["chicken"], style: "boiled", spice: 2, wet: true });
d(6, "satay-chicken", "สะเต๊ะไก่", "Chicken satay, five sticks", 45, { type: "snack", course: "side", protein: ["chicken"], style: "grilled", spice: 1 });

/* Stall 7: jay and vegetarian. Jay food has no egg, so the omelette is vegetarian only. */
const JAY: DishOptions = { protein: ["tofu"], vegetarian: "yes", vegan: "yes", jay: "yes" };
d(7, "jay-kra-pao-tofu", "กะเพราเต้าหู้เจ", "Holy basil tofu, jay", 40, { ...JAY, type: "madeToOrder", canonical: "pad-kra-pao", spice: 2, variants: [SPECIAL] });
d(7, "jay-khao-pad", "ข้าวผัดเจ", "Fried rice, jay", 40, { ...JAY, type: "madeToOrder", canonical: "khao-pad", spice: 0, variants: [SPECIAL] });
d(7, "jay-pad-see-ew", "ผัดซีอิ๊วเจ", "Wide noodles in soy sauce, jay", 45, { ...JAY, type: "noodles", canonical: "pad-see-ew", spice: 0 });
d(7, "jay-rad-na", "ราดหน้าเจ", "Noodles in gravy, jay", 45, { ...JAY, type: "noodles", canonical: "rad-na", spice: 0, wet: true });
d(7, "jay-som-tam", "ตำเจ", "Som tam without fish sauce, jay", 40, { ...JAY, type: "singlePlate", canonical: "som-tam", protein: ["none"], style: "salad", spice: 3, temperature: "cold" });
d(7, "jay-jok", "โจ๊กเจ", "Rice porridge, jay", 30, { ...JAY, type: "soup", canonical: "jok", protein: ["none"], style: "boiled", spice: 0, wet: true });
d(7, "jay-tom-yum", "ต้มยำเห็ดเจ", "Mushroom tom yum, jay", 45, { ...JAY, type: "soup", canonical: "tom-yum", protein: ["none"], style: "boiled", spice: 2, wet: true });
d(7, "jay-green-curry-rice", "ข้าวราดแกงเขียวหวานเต้าหู้เจ", "Green curry tofu over rice, jay", 40, { ...JAY, type: "curryOverRice", canonical: "khao-gaeng", style: "curry", spice: 2, wet: true });
d(7, "veg-omelette-rice", "ข้าวไข่เจียวผัก", "Vegetable omelette over rice", 35, { type: "madeToOrder", canonical: "khai-jiao", protein: ["egg"], style: "deepFried", spice: 0, vegetarian: "yes", vegan: "no", jay: "no" });

/* Stall 8: drinks, desserts and fruit. */
const DRINK: DishOptions = { type: "drink", course: "drink", protein: ["none"], style: "steamed", spice: 0, temperature: "cold", wet: true, variants: [BIG_CUP] };
const DESSERT: DishOptions = { type: "dessert", course: "dessert", protein: ["none"], style: "steamed", spice: 0, vegetarian: "yes" };
d(8, "thai-iced-tea", "ชาเย็น", "Thai iced tea", 25, { ...DRINK, canonical: "cha-yen", vegetarian: "yes" });
d(8, "iced-lime-tea", "ชามะนาวเย็น", "Iced lime tea", 25, { ...DRINK, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(8, "iced-coffee", "กาแฟเย็น", "Iced coffee", 30, { ...DRINK, vegetarian: "yes" });
d(8, "hot-coffee", "กาแฟร้อน", "Hot coffee", 25, { ...DRINK, temperature: "hot", variants: [], vegetarian: "yes" });
d(8, "watermelon-shake", "แตงโมปั่น", "Watermelon shake", 30, { ...DRINK, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(8, "mango-shake", "มะม่วงปั่น", "Mango shake", 35, { ...DRINK, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(8, "drinking-water", "น้ำดื่มขวด", "Bottled water", 15, { ...DRINK, variants: [], wet: false, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(8, "bua-loy-sweet-egg", "บัวลอยไข่หวาน", "Rice balls in coconut milk with sweet egg", 30, { ...DESSERT, canonical: "bua-loy", style: "boiled", temperature: "hot", wet: true, protein: ["egg"] });
d(8, "mango-sticky-rice", "ข้าวเหนียวมะม่วง", "Mango with sticky rice", 35, { ...DESSERT, vegan: "yes", jay: "yes" });
d(8, "khanom-krok", "ขนมครก 5 ชิ้น", "Coconut pancakes, a box of five", 25, { ...DESSERT, style: "grilled", temperature: "hot", vegan: "canAsk", jay: "canAsk" });
d(8, "ruam-mit", "รวมมิตร", "Mixed sweets in iced coconut milk", 30, { ...DESSERT, style: "boiled", wet: true, vegan: "yes", jay: "yes" });
d(8, "cut-fruit", "ผลไม้รวมตัดแต่ง", "Cut fruit cup", 25, { ...DESSERT, vegan: "yes", jay: "yes" });

function buildDishes(stamp: string): CanteenDish[] {
  return specs.map((spec, position) => {
    const rise = RISE_AT[position % RISE_AT.length] ?? Number.POSITIVE_INFINITY;
    const history = SURVEYS.map((checkedOn, k) => ({
      _key: `${spec.slug}-p${k}`,
      price: k >= rise ? spec.price : Math.max(10, spec.price - (Number.isFinite(rise) ? 5 : 0)),
      checkedOn,
    }));
    return {
      _id: `demo-dish-${spec.slug}`,
      _type: "canteenDish" as const,
      _createdAt: stamp,
      _updatedAt: stamp,
      name: { th: spec.th, en: spec.en },
      slug: slug(spec.slug),
      stall: ref(`demo-stall-${spec.stall}`),
      ...(spec.canonical ? { canonical: ref(`demo-canonical-${spec.canonical}`) } : {}),
      price: spec.price,
      variants: spec.variants ?? [],
      type: spec.type ?? "rice",
      course: spec.course ?? "main",
      protein: spec.protein ?? [],
      style: spec.style ?? "stirFried",
      spice: spec.spice ?? 1,
      temperature: spec.temperature ?? "hot",
      wet: spec.wet ?? false,
      vegetarian: spec.vegetarian ?? "no",
      vegan: spec.vegan ?? "no",
      jay: spec.jay ?? "no",
      priceHistory: history,
      checkedOn: CHECKED_ON,
      lastReviewed: CHECKED_ON,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

const ENTRANCES: CanteenEntrance[] = [
  { _key: "river", label: { th: "ทางเข้าฝั่งแม่น้ำ", en: "River side entrance" }, col: 11, row: 4, side: "east" },
  { _key: "road", label: { th: "ทางเข้าถนนใหญ่", en: "Main road entrance" }, col: 0, row: 4, side: "west" },
];

const SEATING: CanteenSeatingZone[] = [
  { _key: "zone-a", label: { th: "โซนที่นั่ง A ฝั่งถนนใหญ่", en: "Seating zone A, main road side" }, col: 1, row: 3, w: 3, h: 2 },
  { _key: "zone-b", label: { th: "โซนที่นั่ง B กลางโรงอาหาร", en: "Seating zone B, middle of the hall" }, col: 5, row: 3, w: 3, h: 2 },
  { _key: "zone-c", label: { th: "โซนที่นั่ง C ฝั่งแม่น้ำ", en: "Seating zone C, river side" }, col: 8, row: 3, w: 3, h: 2 },
];

function buildSettings(stamp: string): CanteenSettings {
  return {
    _id: "demo-canteen-settings",
    _type: "canteenSettings",
    _createdAt: stamp,
    _updatedAt: stamp,
    canteen: {
      _id: "demo-place-canteen",
      _type: "place",
      _createdAt: stamp,
      _updatedAt: stamp,
      name: { th: "โรงอาหารตัวอย่าง", en: "Demo canteen" },
      slug: slug("demo-canteen"),
      category: "welfare",
      openingHours: [
        { _key: "weekdays", daysOfWeek: [1, 2, 3, 4, 5], opens: "07:00", closes: "16:00" },
        { _key: "saturday", daysOfWeek: [6], opens: "08:00", closes: "14:00" },
      ],
    },
    gridCols: 12,
    gridRows: 8,
    entrances: ENTRANCES,
    seatingZones: SEATING,
    riverSide: "east",
    jayFestivalStart: "2026-10-10",
    jayFestivalEnd: "2026-10-18",
  };
}

/* ------------------------------------------------------------------ *
 * The dataset
 * ------------------------------------------------------------------ */

/**
 * The whole fictional canteen. `now` only stamps the document metadata; every
 * survey date is fixed so the price history reads the same on every request.
 */
export function demoCanteenData(now: Date = new Date()): CanteenData {
  const stamp = now.toISOString();
  return {
    settings: buildSettings(stamp),
    stalls: buildStalls(stamp),
    dishes: buildDishes(stamp),
    canonicals: buildCanonicals(stamp),
  };
}
