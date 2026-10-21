/**
 * The canteen demo: a REAL structure with EXAMPLE menus. Previews only.
 *
 * Turned on with `CANTEEN_DEMO=1`. Two things are mixed here and the site
 * says so (`app/[locale]/eat/layout.tsx` shows a banner on every /eat page,
 * search and the home page label the records "example menus", the /eat pages
 * are set to noindex and the sitemap leaves them out):
 *
 * REAL, from the university's canteen documents:
 *   - memo อว 67.06.1/ส177 dated 27 August 2569 (2026), which carries the
 *     floor plan of the ground floor canteen in the Thammasat 60th
 *     Anniversary Building, and
 *   - the selection results of Wednesday 2 September 2569, contract period
 *     1 October 2569 to 30 September 2570 (2026-27).
 *   From these: the shop names, the stall numbers, the trading hours (Monday
 *   to Friday 07:00 to 16:00, closed Saturday, Sunday and public holidays)
 *   and the layout of the hall. Stall 10 is not let: it is zoned for curry
 *   over rice and has no shop.
 *
 * ASSUMED: for types with several slots (made to order 1 and 12, noodles 2
 * and 13, international 4 and 16, snacks 5, 8 and 18, rice plates 6 and 15,
 * general drinks 11 and 17) the pairing of shop to stall number was worked
 * out from the committee score ranking and is not confirmed on site. Those
 * stalls say so in their wayfinding. Stalls 3, 7, 9 and 14 are certain by
 * type; the shop at 7 is the owner's decision.
 *
 * MADE UP: every dish, price, diet tag and price. The shops' real
 * menus have not been surveyed. Dish ids start with "demo-". The jay festival
 * window in the settings is NOT made up: it is the real 2569 dates.
 *
 * Floor plan (17 columns by 7 rows, top = north, landscape). Stalls are
 * 2 cells wide. The hall is read from the drawing; lifts, toilets, stairs and
 * the ATM cannot be drawn by the map, so they appear in the wayfinding text.
 *
 *   col:  0-1   2-6          7-9      10-11   12-14      15-16
 *   row 0 [ 1 ] . . [17 ] .. [18 ]    [ 8  ]  [east  ]   [ 12 ]
 *   row 1 [ 2 ]     [17 ]    [18 ]    [ 9  ]  [seating]  [ 13 ]
 *   row 2 [ 3 ] [west seating] (gap)  [ 10 ]             [ 14 ]
 *   row 3 [ 4 ]                       [ 11 ]             [ 15 ]
 *   row 4 [ 5 ]                                          [ 16 ]
 *   row 5 [ 6 ]
 *   row 6 [ 7 ]               [south tables, cols 9-16]
 *
 * (17 and 18 are triangular kiosks on the north wall, each in 2 by 2 cells,
 * at cols 4-5 and cols 8-9, either side of the central north lobby at
 * cols 6-7. 17 has its right angle at the bottom right of its cells, 18 at
 * the bottom left. Stall numbers follow the hall: 1 to 7 the west column,
 * 8 to 11 the middle block, 12 to 16 the east column, then the two kiosks.) Entrances: the main entrance on the south
 * wall, and the courtyard doors on the north wall, one set in each half.
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
  MapShape,
  Protein,
  SpiceLevel,
  CookingStyle,
  Temperature,
  DishCourse,
} from "@/lib/sanity/types";

/** True when the demo dataset is switched on. Read on the server, in any NODE_ENV. */
export function isCanteenDemo(): boolean {
  return process.env.CANTEEN_DEMO === "1";
}

/** The wording that marks the example menus wherever they appear. Both languages, no em dashes. */
export const DEMO_NOTICE = {
  title: { th: "เมนูตัวอย่าง", en: "Example menus" },
  body: {
    th: "ชื่อร้าน เลขร้าน เวลาทำการและผังโรงอาหารมาจากเอกสารการคัดเลือกผู้ประกอบการโรงอาหารของมหาวิทยาลัย ปี 2569 (สัญญา 1 ตุลาคม 2569 ถึง 30 กันยายน 2570) ส่วนการจับคู่ร้านกับเลขร้านในประเภทที่มีหลายแผงเป็นการสันนิษฐานจากลำดับคะแนนการคัดเลือก ยังไม่ได้ยืนยันหน้างาน เมนู ราคา ป้ายอาหารพิเศษและประวัติราคาเป็นตัวอย่างที่สมมติขึ้น จนกว่าจะสำรวจเมนูจริง",
    en: "Shop names, stall numbers, opening hours and the floor plan come from the university's canteen selection documents for 2026-27 (B.E. 2569), contract period 1 October 2026 to 30 September 2027. Where several stalls share a type, which shop has which number is assumed from the selection ranking and is not yet confirmed on site. The dishes, prices, diet tags and prices are made-up examples until the menus are surveyed.",
  },
  /** Appended to a line that would otherwise read as a real record. */
  label: { th: "(เมนูตัวอย่าง)", en: "(example menus)" },
} as const;

/** Every dish's "checked on". */
const CHECKED_ON = "2026-09-08";


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
  col: number;
  row: number;
  /** Cells wide and tall. */
  w: number;
  h: number;
  /** Defaults to a rectangle. */
  shape?: MapShape;
  wayfinding: { th: string; en: string };
}

/** Appended to the wayfinding of every stall whose number was assumed from the ranking. */
const ASSUMED = {
  th: " เลขร้านนี้สันนิษฐานจากลำดับคะแนนการคัดเลือก ยังไม่ได้ยืนยันหน้างาน",
  en: " Stall number assumed from the selection ranking, not yet confirmed on site.",
} as const;

const assumed = (text: { th: string; en: string }) => ({ th: text.th + ASSUMED.th, en: text.en + ASSUMED.en });

const STALL_SPECS: StallSpec[] = [
  /* West column, stalls 1 to 7, facing east into the hall. */
  {
    number: 1,
    th: "ร้านแม่พิมพ์อาหารตามสั่ง",
    en: "Mae Phim, made to order",
    cuisine: ["madeToOrder"],
    halal: "none",
    col: 0, row: 0, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านแรกที่ปลายด้านเหนือของแถวร้านฝั่งตะวันตก หันหน้าเข้าหาโถงโรงอาหาร",
      en: "First stall at the north end of the west column, facing east into the hall.",
    }),
  },
  {
    number: 2,
    th: "ร้านก๋วยเตี๋ยวสองพี่น้อง",
    en: "Song Phi Nong Noodles",
    cuisine: ["noodles"],
    halal: "none",
    col: 0, row: 1, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านที่สองจากทางเหนือในแถวร้านฝั่งตะวันตก หันหน้าเข้าหาโถง",
      en: "Second stall from the north in the west column, facing the hall.",
    }),
  },
  {
    number: 3,
    th: "ร้านลุงกับป้าไดนับ",
    en: "Lung Kap Pa Dainap",
    cuisine: ["drinks"],
    halal: "none",
    col: 0, row: 2, w: 2, h: 1,
    wayfinding: {
      th: "ร้านที่สามจากทางเหนือในแถวร้านฝั่งตะวันตก ขายเครื่องดื่มทำสด หันหน้าเข้าหาโถง",
      en: "Third stall from the north in the west column. Made-to-order drinks, facing the hall.",
    },
  },
  {
    number: 4,
    th: "ร้าน Steck Project",
    en: "Steck Project",
    cuisine: ["international"],
    halal: "none",
    col: 0, row: 3, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านกลางแถวฝั่งตะวันตก ขายอาหารนานาชาติ ด้านหลังแถวร้านฝั่งตะวันตกเป็นห้องน้ำ บันไดและทางหนีไฟ",
      en: "Middle of the west column. International food. Behind the west column are toilets, stairs and a fire exit.",
    }),
  },
  {
    number: 5,
    th: "ร้าน Yum Yum Snakie",
    en: "Yum Yum Snakie",
    cuisine: ["desserts", "fruit"],
    halal: "none",
    col: 0, row: 4, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านที่ห้าจากทางเหนือในแถวร้านฝั่งตะวันตก ขายขนม ของหวานและผลไม้ หันหน้าเข้าหาโถง",
      en: "Fifth stall from the north in the west column. Snacks, desserts and fruit, facing the hall.",
    }),
  },
  {
    number: 6,
    th: "ร้านแม่ปราณีต",
    en: "Mae Pranit",
    cuisine: ["thaiRice", "chickenRice"],
    halal: "none",
    col: 0, row: 5, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านที่หกจากทางเหนือในแถวร้านฝั่งตะวันตก ขายข้าวหน้าต่าง ๆ หันหน้าเข้าหาโถง",
      en: "Sixth stall from the north in the west column. Rice plates, facing the hall.",
    }),
  },
  {
    number: 7,
    th: "ร้านคงคา GaNGa",
    en: "Khongkha GaNGa",
    cuisine: ["drinks"],
    halal: "none",
    col: 0, row: 6, w: 2, h: 1,
    wayfinding: {
      th: "ร้านสุดท้ายที่ปลายด้านใต้ของแถวร้านฝั่งตะวันตก ขายเครื่องดื่มทำสด ตู้เอทีเอ็มอยู่ใกล้ผนังด้านใต้ในครึ่งซ้ายของโรงอาหาร",
      en: "Last stall at the south end of the west column. Made-to-order drinks. The ATM is near the south wall in the left half of the hall.",
    },
  },

  /* Middle block, stalls 8 to 11, backing onto the lifts, facing east. */
  {
    number: 8,
    th: "ร้านกัลยาผลไม้ปอกพร้อมทาน",
    en: "Kanlaya Peeled Fruit",
    cuisine: ["fruit", "desserts"],
    halal: "none",
    col: 10, row: 0, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านบนสุดของกลุ่มร้านกลางโถง ด้านหลังเป็นลิฟต์สองตัวทางฝั่งตะวันตก หันหน้าไปทางทิศตะวันออก ขายผลไม้ปอกพร้อมทาน",
      en: "Top stall of the middle block, with the two lifts behind it on the west side, facing east. Peeled fruit.",
    }),
  },
  {
    number: 9,
    th: "ร้านอีสาน",
    en: "Isan Shop",
    cuisine: ["isan"],
    halal: "none",
    col: 10, row: 1, w: 2, h: 1,
    wayfinding: {
      th: "ร้านที่สองจากทางเหนือในกลุ่มร้านกลางโถง ด้านหลังเป็นลิฟต์ หันหน้าไปทางทิศตะวันออก",
      en: "Second stall from the north in the middle block, with the lifts behind it, facing east.",
    },
  },
  {
    number: 10,
    th: "ยังไม่มีร้าน",
    en: "No shop yet",
    cuisine: [],
    halal: "none",
    col: 10, row: 2, w: 2, h: 1,
    wayfinding: {
      th: "ยังไม่มีร้านในแผงนี้ กำหนดไว้สำหรับข้าวราดแกง อยู่ที่สามจากทางเหนือในกลุ่มร้านกลางโถง",
      en: "No shop yet. Zoned for curry over rice. Third stall from the north in the middle block.",
    },
  },
  {
    number: 11,
    th: "ร้าน BM HEALTH CLUB",
    en: "BM HEALTH CLUB",
    cuisine: ["drinks"],
    halal: "none",
    col: 10, row: 3, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านล่างสุดของกลุ่มร้านกลางโถง ด้านหลังเป็นลิฟต์ หันหน้าไปทางทิศตะวันออก ขายเครื่องดื่มทั่วไป",
      en: "Bottom stall of the middle block, with the lifts behind it, facing east. General drinks.",
    }),
  },

  /* East column, stalls 12 to 16, facing west into the hall. */
  {
    number: 12,
    th: "ร้านเทียนทองอาหารตามสั่ง",
    en: "Thian Thong, made to order",
    cuisine: ["madeToOrder"],
    halal: "none",
    col: 15, row: 0, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านแรกที่ปลายด้านเหนือของแถวร้านฝั่งตะวันออก หันหน้าไปทางทิศตะวันตกเข้าหาโถง",
      en: "First stall at the north end of the east column, facing west into the hall.",
    }),
  },
  {
    number: 13,
    th: "ร้านก๋วยเตี๋ยวหมี่ไก่ฉีก",
    en: "Mi Kai Chik Noodles",
    cuisine: ["noodles"],
    halal: "none",
    col: 15, row: 1, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านที่สองจากทางเหนือในแถวร้านฝั่งตะวันออก หันหน้าไปทางทิศตะวันตก",
      en: "Second stall from the north in the east column, facing west.",
    }),
  },
  {
    number: 14,
    th: "ร้านมุมกินฮาลาล",
    en: "Mum Kin Halal",
    cuisine: ["muslim"],
    halal: "stallDeclared",
    col: 15, row: 2, w: 2, h: 1,
    wayfinding: {
      th: "ร้านกลางแถวฝั่งตะวันออก หันหน้าไปทางทิศตะวันตก ได้รับคัดเลือกในประเภทอาหารฮาลาลของมหาวิทยาลัย ป้ายฮาลาลนี้อิงตามประเภทดังกล่าว ไม่ใช่ใบรับรอง",
      en: "Middle of the east column, facing west. Selected for the university's halal food slot. The halal tag follows that category and is not a certificate.",
    },
  },
  {
    number: 15,
    th: "ร้านข้าวมันไก่-ขาหมู TU",
    en: "TU Khao Man Kai, Khao Kha Mu",
    cuisine: ["chickenRice", "thaiRice"],
    halal: "none",
    col: 15, row: 3, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านที่สี่จากทางเหนือในแถวร้านฝั่งตะวันออก หันหน้าไปทางทิศตะวันตก ขายข้าวมันไก่และข้าวขาหมู",
      en: "Fourth stall from the north in the east column, facing west. Chicken rice and pork leg rice.",
    }),
  },
  {
    number: 16,
    th: "ร้าน Tamasato ราเม็ง",
    en: "Tamasato Ramen",
    cuisine: ["international"],
    halal: "none",
    col: 15, row: 4, w: 2, h: 1,
    wayfinding: assumed({
      th: "ร้านสุดท้ายที่ปลายด้านใต้ของแถวร้านฝั่งตะวันออก หันหน้าไปทางทิศตะวันตก ขายราเม็ง ด้านหลังแถวร้านฝั่งตะวันออกเป็นห้องน้ำและบันได",
      en: "Last stall at the south end of the east column, facing west. Ramen. Behind the east column are toilets and stairs.",
    }),
  },

  /* Corner kiosks on the north wall, either side of the central north lobby. */
  {
    number: 17,
    th: "ร้านแอมที สาขาท่าพระจันทร์",
    en: "Aem Thi, Tha Phra Chan branch",
    cuisine: ["drinks"],
    halal: "none",
    col: 4, row: 0, w: 2, h: 2, shape: "triangleBottomRight",
    wayfinding: assumed({
      th: "แผงสามเหลี่ยมมุมผนังด้านเหนือ อยู่ทางซ้ายของทางเข้ากลางด้านเหนือ ขายเครื่องดื่มทั่วไป",
      en: "Triangular corner kiosk on the north wall, left of the central north entrance. General drinks.",
    }),
  },
  {
    number: 18,
    th: "ร้านขนมหวานป้าหมู",
    en: "Pa Mu Desserts",
    cuisine: ["desserts", "fruit"],
    halal: "none",
    col: 8, row: 0, w: 2, h: 2, shape: "triangleBottomLeft",
    wayfinding: assumed({
      th: "แผงสามเหลี่ยมมุมผนังด้านเหนือ อยู่ทางขวาของทางเข้ากลางด้านเหนือ ทางตะวันตกของยอดกลุ่มร้านกลางโถง ขายขนมหวาน",
      en: "Triangular corner kiosk on the north wall, right of the central north entrance and just west of the top of the middle block. Desserts.",
    }),
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
    mapCell: { col: spec.col, row: spec.row, w: spec.w, h: spec.h, ...(spec.shape ? { shape: spec.shape } : {}) },
    wayfinding: spec.wayfinding,
  }));
}

/* ------------------------------------------------------------------ *
 * Canonical dishes
 * ------------------------------------------------------------------ */

interface CanonicalSpec {
  id: string;
  slug: string;
  th: string;
  en: string;
  aliases: string[];
  explainer: { th: string; en: string };
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
  }));
}


/* ------------------------------------------------------------------ *
 * Dishes
 * ------------------------------------------------------------------ */

const SPECIAL: DishVariant = { _key: "special", label: { th: "พิเศษ", en: "Large portion" }, delta: 10 };
const FRIED_EGG: DishVariant = { _key: "egg", label: { th: "ไข่ดาว", en: "Fried egg" }, delta: 10 };
const BIG_CUP: DishVariant = { _key: "big", label: { th: "แก้วใหญ่", en: "Large cup" }, delta: 10 };

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


/* Stall 1: made to order (Mae Phim). */
const ORDER: DishOptions = { type: "madeToOrder", variants: [SPECIAL, FRIED_EGG] };
d(1, "kra-pao-pork", "กะเพราหมูสับ", "Holy basil minced pork", 50, { ...ORDER, canonical: "pad-kra-pao", protein: ["pork"], spice: 3 });
d(1, "kra-pao-chicken", "กะเพราไก่", "Holy basil chicken", 50, { ...ORDER, canonical: "pad-kra-pao", protein: ["chicken"], spice: 3 });
d(1, "khao-pad-pork", "ข้าวผัดหมู", "Fried rice with pork", 45, { ...ORDER, canonical: "khao-pad", protein: ["pork", "egg"], spice: 0, vegetarian: "canAsk" });
d(1, "khai-jiao-pork", "ไข่เจียวหมูสับ", "Omelette with minced pork over rice", 40, { ...ORDER, canonical: "khai-jiao", protein: ["pork", "egg"], style: "deepFried", spice: 0 });
d(1, "pad-see-ew-pork", "ผัดซีอิ๊วหมู", "Wide noodles in soy sauce with pork", 50, { ...ORDER, type: "noodles", canonical: "pad-see-ew", protein: ["pork", "egg"], spice: 0 });
d(1, "pad-thai-chicken", "ผัดไทยไก่", "Pad Thai with chicken", 50, { ...ORDER, type: "noodles", canonical: "pad-thai", protein: ["chicken", "egg"], spice: 0 });

/* Stall 12: made to order (Thian Thong). */
d(12, "kra-pao-crispy-pork", "กะเพราหมูกรอบ", "Holy basil crispy pork belly", 60, { ...ORDER, canonical: "pad-kra-pao", protein: ["pork"], spice: 3 });
d(12, "kra-pao-seafood", "กะเพราทะเล", "Holy basil mixed seafood", 65, { ...ORDER, canonical: "pad-kra-pao", protein: ["seafood"], spice: 3 });
d(12, "khao-pad-shrimp", "ข้าวผัดกุ้ง", "Fried rice with shrimp", 60, { ...ORDER, canonical: "khao-pad", protein: ["seafood", "egg"], spice: 0 });
d(12, "omelette-rice", "ข้าวไข่เจียว", "Plain omelette over rice", 30, { ...ORDER, canonical: "khai-jiao", protein: ["egg"], style: "deepFried", spice: 0, vegetarian: "canAsk" });
d(12, "pad-see-ew-chicken", "ผัดซีอิ๊วไก่", "Wide noodles in soy sauce with chicken", 50, { ...ORDER, type: "noodles", canonical: "pad-see-ew", protein: ["chicken", "egg"], spice: 0 });
d(12, "pad-thai-shrimp", "ผัดไทยกุ้งสด", "Pad Thai with fresh shrimp", 60, { ...ORDER, type: "noodles", canonical: "pad-thai", protein: ["seafood", "egg"], spice: 0 });

/* Stall 2: noodles (Song Phi Nong). Its sign lists noodles, kuay jub, rad na, khanom jeen, blood tom and porridge. */
const NOODLE: DishOptions = { type: "noodles", style: "boiled", wet: true, variants: [SPECIAL] };
d(2, "noodle-soup-pork", "ก๋วยเตี๋ยวหมูน้ำใส", "Pork noodle soup, clear broth", 45, { ...NOODLE, canonical: "kuay-teow", protein: ["pork"], spice: 0 });
d(2, "noodle-tom-yum-pork", "ก๋วยเตี๋ยวต้มยำหมู", "Pork noodles in tom yum broth", 50, { ...NOODLE, canonical: "tom-yum", protein: ["pork"], spice: 2 });
d(2, "kuay-jub", "ก๋วยจั๊บน้ำข้น", "Rolled rice noodles in peppery broth", 50, { ...NOODLE, protein: ["pork"], spice: 1 });
d(2, "rad-na-pork", "ราดหน้าหมู", "Noodles in gravy with pork", 55, { ...NOODLE, canonical: "rad-na", style: "stirFried", protein: ["pork"], spice: 0 });
d(2, "khanom-jeen-nam-ya", "ขนมจีนน้ำยา", "Rice vermicelli with fish curry sauce", 40, { ...NOODLE, protein: ["fish"], style: "curry", spice: 2 });
d(2, "jok-pork", "โจ๊กหมู", "Rice porridge with pork", 35, { type: "soup", canonical: "jok", protein: ["pork"], style: "boiled", spice: 0, wet: true, variants: [SPECIAL] });

/* Stall 13: noodles, shredded chicken (Mi Kai Chik). */
d(13, "mi-gai-chi", "หมี่ไก่ฉีก", "Egg noodles with shredded chicken", 50, { ...NOODLE, wet: false, protein: ["chicken"], spice: 0 });
d(13, "mi-gai-chi-soup", "หมี่ไก่ฉีกน้ำ", "Egg noodle soup with shredded chicken", 50, { ...NOODLE, protein: ["chicken"], spice: 0 });
d(13, "noodle-soup-chicken", "ก๋วยเตี๋ยวไก่น้ำใส", "Chicken noodle soup, clear broth", 45, { ...NOODLE, canonical: "kuay-teow", protein: ["chicken"], spice: 0 });
d(13, "rad-na-chicken", "ราดหน้าไก่", "Noodles in gravy with chicken", 55, { ...NOODLE, canonical: "rad-na", style: "stirFried", protein: ["chicken"], spice: 0 });
d(13, "noodle-tom-yum-chicken", "ก๋วยเตี๋ยวต้มยำไก่", "Chicken noodles in tom yum broth", 50, { ...NOODLE, canonical: "tom-yum", protein: ["chicken"], spice: 2 });

/* Drinks. */
const DRINK: DishOptions = { type: "drink", course: "drink", protein: ["none"], style: "steamed", spice: 0, temperature: "cold", wet: true, variants: [BIG_CUP] };
const DESSERT: DishOptions = { type: "dessert", course: "dessert", protein: ["none"], style: "steamed", spice: 0, vegetarian: "yes" };
const PLANT_DRINK: DishOptions = { ...DRINK, vegetarian: "yes", vegan: "yes", jay: "yes" };

/* Stall 3: made-to-order drinks (Lung Kap Pa Dainap): oliang, iced black tea, old-style coffee, roselle. */
d(3, "oliang", "โอเลี้ยง", "Iced black coffee, oliang", 20, { ...DRINK, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(3, "black-tea-iced", "ชาดำเย็น", "Iced black tea", 20, PLANT_DRINK);
d(3, "kafae-boran", "กาแฟโบราณ", "Old-style coffee", 25, { ...DRINK, vegetarian: "yes" });
d(3, "krachiap", "กระเจี๊ยบ", "Roselle drink", 20, PLANT_DRINK);

/* Stall 7: made-to-order drinks (Khongkha GaNGa). */
d(7, "thai-iced-tea", "ชาเย็น", "Thai iced tea", 25, { ...DRINK, canonical: "cha-yen", vegetarian: "yes" });
d(7, "iced-lime-tea", "ชามะนาวเย็น", "Iced lime tea", 25, PLANT_DRINK);
d(7, "iced-coffee", "กาแฟเย็น", "Iced coffee", 30, { ...DRINK, vegetarian: "yes" });
d(7, "hot-coffee", "กาแฟร้อน", "Hot coffee", 25, { ...DRINK, temperature: "hot", variants: [], vegetarian: "yes" });

/* Stall 11: general drinks (BM HEALTH CLUB): smoothies, green tea, bubble tea, soft drinks. */
d(11, "mango-smoothie", "มะม่วงปั่น", "Mango smoothie", 35, PLANT_DRINK);
d(11, "strawberry-smoothie", "สตรอว์เบอร์รีปั่น", "Strawberry smoothie", 35, PLANT_DRINK);
d(11, "iced-green-tea", "ชาเขียวเย็น", "Iced green tea", 30, { ...DRINK, vegetarian: "yes" });
d(11, "bubble-milk-tea", "ชานมไข่มุก", "Bubble milk tea", 35, { ...DRINK, vegetarian: "yes" });
d(11, "soft-drink-can", "น้ำอัดลมกระป๋อง", "Soft drink, can", 20, { ...PLANT_DRINK, variants: [], wet: false });

/* Stall 17: general drinks (kiosk). */
d(17, "thai-iced-tea-kiosk", "ชาเย็น", "Thai iced tea", 30, { ...DRINK, canonical: "cha-yen", vegetarian: "yes" });
d(17, "lemon-soda", "เลมอนโซดา", "Lemon soda", 25, PLANT_DRINK);
d(17, "drinking-water", "น้ำดื่มขวด", "Bottled water", 15, { ...PLANT_DRINK, variants: [], wet: false });

/* Stall 4: international (Steck Project): steak and pasta. */
const WESTERN: DishOptions = { type: "singlePlate", style: "grilled", spice: 0, variants: [SPECIAL] };
d(4, "pork-steak", "สเต็กหมู", "Pork steak with fries and salad", 65, { ...WESTERN, protein: ["pork"] });
d(4, "chicken-steak", "สเต็กไก่", "Chicken steak with fries and salad", 60, { ...WESTERN, protein: ["chicken"] });
d(4, "beef-steak", "สเต็กเนื้อ", "Beef steak with fries and salad", 70, { ...WESTERN, protein: ["beef"] });
d(4, "spaghetti-carbonara", "สปาเกตตีคาโบนาร่า", "Spaghetti carbonara", 55, { ...WESTERN, type: "noodles", style: "stirFried", protein: ["pork", "egg"] });

/* Stall 16: international (Tamasato Ramen). */
const RAMEN: DishOptions = { type: "noodles", style: "boiled", wet: true, spice: 1, variants: [SPECIAL] };
d(16, "tonkotsu-ramen", "ราเม็งทงคตสึ", "Tonkotsu ramen", 70, { ...RAMEN, protein: ["pork", "egg"] });
d(16, "shoyu-chicken-ramen", "ราเม็งโชยุไก่", "Chicken shoyu ramen", 65, { ...RAMEN, protein: ["chicken", "egg"], spice: 0 });
d(16, "gyoza", "เกี๊ยวซ่าทอด 5 ชิ้น", "Fried gyoza, five pieces", 40, { type: "snack", course: "side", protein: ["pork"], style: "deepFried", spice: 0 });

/* Stall 5: snacks, desserts, fruit (Yum Yum Snakie). */
d(5, "french-fries", "เฟรนช์ฟรายส์", "French fries", 30, { type: "snack", course: "side", protein: ["none"], style: "deepFried", spice: 0, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(5, "chicken-nuggets", "นักเก็ตไก่", "Chicken nuggets", 35, { type: "snack", course: "side", protein: ["chicken"], style: "deepFried", spice: 0 });
d(5, "bua-loy-sweet-egg", "บัวลอยไข่หวาน", "Rice balls in coconut milk with sweet egg", 30, { ...DESSERT, canonical: "bua-loy", style: "boiled", temperature: "hot", wet: true, protein: ["egg"] });
d(5, "honey-toast", "ขนมปังปิ้งน้ำผึ้ง", "Honey toast", 45, { ...DESSERT, style: "grilled", temperature: "hot" });

/* Stall 8: peeled fruit (Kanlaya). */
const FRUIT: DishOptions = { ...DESSERT, course: "dessert", temperature: "cold", style: "salad", vegan: "yes", jay: "yes" };
d(8, "cut-watermelon", "แตงโมปอกพร้อมทาน", "Peeled watermelon cup", 20, FRUIT);
d(8, "cut-pineapple", "สับปะรดปอกพร้อมทาน", "Peeled pineapple cup", 20, FRUIT);
d(8, "cut-fruit", "ผลไม้รวมตัดแต่ง", "Mixed cut fruit cup", 25, FRUIT);
d(8, "cut-guava", "ฝรั่งปอกพร้อมทาน", "Peeled guava cup", 20, FRUIT);

/* Stall 18: desserts kiosk (Pa Mu). */
d(18, "bua-loy-kiosk", "บัวลอยน้ำขิง", "Rice balls in ginger syrup", 30, { ...DESSERT, canonical: "bua-loy", style: "boiled", temperature: "hot", wet: true, protein: ["none"], vegan: "yes", jay: "yes" });
d(18, "ruam-mit", "รวมมิตร", "Mixed sweets in iced coconut milk", 30, { ...DESSERT, style: "boiled", wet: true, vegan: "yes", jay: "yes" });
d(18, "mango-sticky-rice", "ข้าวเหนียวมะม่วง", "Mango with sticky rice", 35, { ...DESSERT, vegan: "yes", jay: "yes" });
d(18, "khanom-krok", "ขนมครก 5 ชิ้น", "Coconut pancakes, a box of five", 25, { ...DESSERT, style: "grilled", temperature: "hot", vegan: "canAsk", jay: "canAsk" });

/* Stall 6: rice plates (Mae Pranit): red pork, crispy pork, pork leg, chicken rice, khao mok gai. */
d(6, "khao-mu-daeng", "ข้าวหมูแดง", "Red roast pork over rice", 50, { protein: ["pork"], style: "grilled", spice: 0, variants: [SPECIAL] });
d(6, "khao-mu-krop", "ข้าวหมูกรอบ", "Crispy pork belly over rice", 55, { protein: ["pork"], style: "deepFried", spice: 0, variants: [SPECIAL] });
d(6, "khao-kha-mu", "ข้าวขาหมู", "Stewed pork leg over rice", 60, { protein: ["pork", "egg"], style: "boiled", spice: 0, wet: true, variants: [SPECIAL] });
d(6, "khao-man-gai-mae", "ข้าวมันไก่", "Chicken rice", 50, { canonical: "khao-man-gai", protein: ["chicken"], style: "steamed", spice: 0, variants: [SPECIAL] });
d(6, "khao-mok-gai-mae", "ข้าวหมกไก่", "Chicken biryani", 55, { canonical: "khao-mok-gai", protein: ["chicken"], style: "steamed", spice: 1, variants: [SPECIAL] });

/* Stall 15: rice plates (TU chicken rice and pork leg). */
const CHICKEN_RICE: DishOptions = { canonical: "khao-man-gai", protein: ["chicken"], style: "steamed", spice: 0, variants: [SPECIAL] };
d(15, "khao-man-gai", "ข้าวมันไก่ต้ม", "Chicken rice, poached", 45, CHICKEN_RICE);
d(15, "khao-man-gai-fried", "ข้าวมันไก่ทอด", "Chicken rice, fried chicken", 50, { ...CHICKEN_RICE, style: "deepFried" });
d(15, "khao-man-gai-mixed", "ข้าวมันไก่รวม", "Chicken rice, poached and fried", 55, { ...CHICKEN_RICE, style: "deepFried" });
d(15, "khao-kha-mu-tu", "ข้าวขาหมู", "Stewed pork leg over rice", 55, { protein: ["pork", "egg"], style: "boiled", spice: 0, wet: true, variants: [SPECIAL] });

/* Stall 14: halal food. No pork anywhere on this menu. */
d(14, "khao-mok-gai", "ข้าวหมกไก่", "Chicken biryani", 55, { canonical: "khao-mok-gai", protein: ["chicken"], style: "steamed", spice: 1, variants: [SPECIAL] });
d(14, "khao-mok-beef", "ข้าวหมกเนื้อ", "Beef biryani", 65, { canonical: "khao-mok-gai", protein: ["beef"], style: "steamed", spice: 1, variants: [SPECIAL] });
d(14, "kra-pao-chicken-halal", "กะเพราไก่", "Holy basil chicken", 50, { type: "madeToOrder", canonical: "pad-kra-pao", protein: ["chicken"], spice: 3, variants: [SPECIAL, FRIED_EGG] });
d(14, "khao-pad-chicken-halal", "ข้าวผัดไก่", "Fried rice with chicken", 50, { type: "madeToOrder", canonical: "khao-pad", protein: ["chicken", "egg"], spice: 0, variants: [SPECIAL, FRIED_EGG] });
d(14, "khai-jiao-halal", "ข้าวไข่เจียว", "Omelette over rice", 30, { type: "madeToOrder", canonical: "khai-jiao", protein: ["egg"], style: "deepFried", spice: 0, vegetarian: "canAsk", variants: [SPECIAL] });
d(14, "tom-yum-chicken", "ต้มยำไก่", "Tom yum chicken soup", 55, { type: "soup", canonical: "tom-yum", protein: ["chicken"], style: "boiled", spice: 2, wet: true });
d(14, "massaman-beef-rice", "ข้าวราดมัสมั่นเนื้อ", "Massaman beef curry over rice", 60, { type: "curryOverRice", protein: ["beef"], style: "curry", spice: 1, wet: true });

/* Stall 9: Isan. */
d(9, "som-tam-thai", "ตำไทย", "Som tam Thai, sweet and sour", 40, { type: "singlePlate", canonical: "som-tam", protein: ["seafood"], style: "salad", spice: 3, temperature: "cold", vegetarian: "canAsk" });
d(9, "som-tam-poo-pla-ra", "ตำปูปลาร้า", "Som tam with salted crab and fermented fish", 45, { type: "singlePlate", canonical: "som-tam", protein: ["seafood", "fish"], style: "salad", spice: 3, temperature: "cold" });
d(9, "larb-pork", "ลาบหมู", "Pork larb", 55, { type: "singlePlate", canonical: "larb", protein: ["pork"], style: "salad", spice: 3 });
d(9, "grilled-chicken-isan", "ไก่ย่างอีสาน", "Isan grilled chicken", 55, { type: "singlePlate", protein: ["chicken"], style: "grilled", spice: 1, variants: [SPECIAL] });
d(9, "sticky-rice", "ข้าวเหนียว", "Sticky rice, one bag", 10, { type: "rice", course: "side", protein: ["none"], style: "steamed", spice: 0, vegetarian: "yes", vegan: "yes", jay: "yes" });
d(9, "tom-saep-pork", "ต้มแซ่บกระดูกหมู", "Spicy pork rib soup", 55, { type: "soup", canonical: "tom-yum", protein: ["pork"], style: "boiled", spice: 3, wet: true });

function buildDishes(stamp: string): CanteenDish[] {
  return specs.map((spec) => {
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
      checkedOn: CHECKED_ON,
      lastReviewed: CHECKED_ON,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

/** Main entrance on the south wall, south of the central staircase; courtyard doors on the north wall, one set in each half. */
const ENTRANCES: CanteenEntrance[] = [
  { _key: "main", label: { th: "ทางเข้าหลัก", en: "Main entrance" }, col: 7, row: 6, side: "south" },
  { _key: "north-left", label: { th: "ประตูลานอเนกประสงค์ ซ้าย", en: "North courtyard doors, left" }, col: 3, row: 0, side: "north" },
  { _key: "north-right", label: { th: "ประตูลานอเนกประสงค์ ขวา", en: "North courtyard doors, right" }, col: 13, row: 0, side: "north" },
];

const SEATING: CanteenSeatingZone[] = [
  { _key: "west", label: { th: "ที่นั่งฝั่งตะวันตก ข้างร้าน 1 ถึง 7", en: "West seating, by stalls 1 to 7" }, col: 2, row: 2, w: 5, h: 5 },
  { _key: "east", label: { th: "ที่นั่งฝั่งตะวันออก ร้าน 8 ถึง 16", en: "East seating, stalls 8 to 16" }, col: 12, row: 0, w: 3, h: 5 },
  { _key: "south", label: { th: "โต๊ะแถวใต้ ทางตะวันออกเฉียงใต้", en: "South tables, south-east" }, col: 9, row: 6, w: 8, h: 1 },
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
      name: { th: "โรงอาหาร อาคารธรรมศาสตร์ 60 ปี", en: "Thammasat 60th Anniversary Building canteen" },
      slug: slug("thammasat-60-years-canteen"),
      category: "welfare",
      // Monday to Friday 07:00 to 16:00. Closed Saturday, Sunday and public holidays (no public holiday data here).
      openingHours: [{ _key: "weekdays", daysOfWeek: [1, 2, 3, 4, 5], opens: "07:00", closes: "16:00" }],
    },
    gridCols: 17,
    gridRows: 7,
    entrances: ENTRANCES,
    seatingZones: SEATING,
    // เทศกาลกินเจ 2569 runs 10 to 18 October 2569 (2026), as reported by Thai press
    // (bangkokbiznews.com/lifestyle/travel/1255815, ktc.co.th/article/lifestyle/misc/vegetarian-festival).
    jayFestivalStart: "2026-10-10",
    jayFestivalEnd: "2026-10-18",
  };
}

/* ------------------------------------------------------------------ *
 * The dataset
 * ------------------------------------------------------------------ */

/**
 * The canteen with its real structure and example menus. `now` only stamps
 * the document metadata; every survey date is fixed so the data
 * reads the same on every request.
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
