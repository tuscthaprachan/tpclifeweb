/**
 * The canteen as it really is: the stalls, their numbers and their menus.
 *
 * Used whenever Sanity holds no canteen stalls, so /eat always shows the
 * real canteen. Once the survey is imported into Sanity
 * (`sanity/seed/canteen.ts`), Sanity's copy wins and this file is a fallback.
 *
 * WHERE IT COMES FROM
 *   - Shop names and stall numbers: the menu boards and shop signs, photographed
 *     stall by stall on 21 October 2569 (2026). The photo names are the stall
 *     numbers, so every number from 1 to 17 is confirmed on site. Stall 18 was
 *     not photographed: it is given the one shop from the 2569 selection results
 *     that no photo showed, and its wayfinding says the number is unconfirmed.
 *   - Dishes and prices: `lib/canteen/survey-2569.ts`, read from the same photos.
 *   - Opening hours, the hall layout and the floor plan: memo อว 67.06.1/ส177
 *     dated 27 August 2569 and the selection results of 2 September 2569
 *     (contract period 1 October 2569 to 30 September 2570).
 *   - Halal: stall 14 shows a halal sign and holds the university's halal slot.
 *     Everything it sells is halal. No stall was asked about vegetarian food.
 *
 * Floor plan (17 columns by 7 rows, top = north, landscape). Stalls are
 * 2 cells wide. Lifts, toilets, stairs and the ATM are not drawn on the map,
 * so they appear in the wayfinding text.
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
 * 17 and 18 are triangular kiosks on the north wall, each in 2 by 2 cells,
 * either side of the central north lobby. Entrances: the main entrance on the
 * south wall, and the courtyard doors on the north wall, one set in each half.
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
  MapShape,
} from "@/lib/sanity/types";

import { SURVEY_DATE, SURVEY_DISHES } from "./survey-2569";

const SETTINGS_ID = "survey-canteen-settings";

const slug = (current: string) => ({ _type: "slug" as const, current });
const ref = (id: string) => ({ _type: "reference" as const, _ref: id });

/* ------------------------------------------------------------------ *
 * Stalls
 * ------------------------------------------------------------------ */

interface StallSpec {
  number: number;
  slug: string;
  th: string;
  en: string;
  cuisine: CanteenCuisine[];
  halal: boolean;
  col: number;
  row: number;
  /** Cells wide and tall. */
  w: number;
  h: number;
  /** Defaults to a rectangle. */
  shape?: MapShape;
  wayfinding: { th: string; en: string };
}

const WEST = (nth: { th: string; en: string }) => ({
  th: `ร้าน${nth.th}ในแถวร้านฝั่งตะวันตก หันหน้าเข้าหาโถงโรงอาหาร`,
  en: `${nth.en} in the west column, facing east into the hall.`,
});
const EAST = (nth: { th: string; en: string }) => ({
  th: `ร้าน${nth.th}ในแถวร้านฝั่งตะวันออก หันหน้าไปทางทิศตะวันตก`,
  en: `${nth.en} in the east column, facing west into the hall.`,
});
const MIDDLE = (nth: { th: string; en: string }) => ({
  th: `ร้าน${nth.th}ในกลุ่มร้านกลางโถง`,
  en: `${nth.en} in the middle block of the hall.`,
});

const STALL_SPECS: StallSpec[] = [
  /* West column, stalls 1 to 7. */
  { number: 1, slug: "1-pha-phriu-curry-over-rice", th: "พาพริ้ว ข้าวแกงสารพัดนึก", en: "Pha Phriu curry over rice", cuisine: ["curryOverRice"], halal: false, col: 0, row: 0, w: 2, h: 1, wayfinding: WEST({ th: "แรกที่ปลายด้านเหนือ", en: "First stall at the north end" }) },
  { number: 2, slug: "2-song-phi-nong-noodles", th: "ก๋วยเตี๋ยวสองพี่น้อง", en: "Song Phi Nong Noodles", cuisine: ["noodles"], halal: false, col: 0, row: 1, w: 2, h: 1, wayfinding: WEST({ th: "ที่สองจากทางเหนือ", en: "Second stall from the north" }) },
  { number: 3, slug: "3-mae-phim-made-to-order", th: "แม่พิมพ์ อาหารตามสั่ง", en: "Mama Pim, made to order", cuisine: ["madeToOrder"], halal: false, col: 0, row: 2, w: 2, h: 1, wayfinding: WEST({ th: "ที่สามจากทางเหนือ", en: "Third stall from the north" }) },
  { number: 4, slug: "4-ganga-drinks", th: "คงคา GaNGa", en: "GaNGa", cuisine: ["drinks"], halal: false, col: 0, row: 3, w: 2, h: 1, wayfinding: { th: "ร้านกลางแถวฝั่งตะวันตก หันหน้าเข้าหาโถง ด้านหลังแถวร้านฝั่งตะวันตกเป็นห้องน้ำ บันไดและทางหนีไฟ", en: "Middle of the west column, facing the hall. Behind the west column are toilets, stairs and a fire exit." } },
  { number: 5, slug: "5-bm-health-club", th: "BM HEALTH CLUB", en: "BM Health Club", cuisine: ["drinks", "desserts"], halal: false, col: 0, row: 4, w: 2, h: 1, wayfinding: WEST({ th: "ที่ห้าจากทางเหนือ", en: "Fifth stall from the north" }) },
  { number: 6, slug: "6-khun-ying-chicken-rice", th: "ข้าวมันไก่คุณหญิง โดยแม่ปราณีต", en: "Khun Ying Chicken Rice by Mae Pranit", cuisine: ["chickenRice"], halal: false, col: 0, row: 5, w: 2, h: 1, wayfinding: WEST({ th: "ที่หกจากทางเหนือ", en: "Sixth stall from the north" }) },
  { number: 7, slug: "7-tamasato-ramen", th: "Tamasato ราเม็ง", en: "Tamasato Ramen", cuisine: ["international", "noodles"], halal: false, col: 0, row: 6, w: 2, h: 1, wayfinding: WEST({ th: "สุดท้ายที่ปลายด้านใต้", en: "Last stall at the south end" }) },

  /* Middle block, stalls 8 to 11. */
  { number: 8, slug: "8-lung-kap-pa-drinks", th: "ลุงกับป้า", en: "Lung Kap Pa", cuisine: ["drinks"], halal: false, col: 10, row: 0, w: 2, h: 1, wayfinding: MIDDLE({ th: "บนสุด", en: "Top stall" }) },
  { number: 9, slug: "9-pa-mu-desserts", th: "ขนมหวานป้าหมู", en: "Pa Mu Desserts", cuisine: ["desserts", "fruit"], halal: false, col: 10, row: 1, w: 2, h: 1, wayfinding: MIDDLE({ th: "ที่สองจากทางเหนือ", en: "Second stall from the north" }) },
  { number: 10, slug: "10-steak-project", th: "สเต็ก โปรเจกต์", en: "Steak Project", cuisine: ["international"], halal: false, col: 10, row: 2, w: 2, h: 1, wayfinding: MIDDLE({ th: "ที่สามจากทางเหนือ", en: "Third stall from the north" }) },
  { number: 11, slug: "11-chicken-man", th: "เส้นหมี่ไก่ฉีก Chicken Man", en: "Chicken Man", cuisine: ["noodles"], halal: false, col: 10, row: 3, w: 2, h: 1, wayfinding: MIDDLE({ th: "ล่างสุด", en: "Bottom stall" }) },

  /* East column, stalls 12 to 16. */
  { number: 12, slug: "12-isan-food", th: "อาหารอีสาน", en: "Isan food", cuisine: ["isan"], halal: false, col: 15, row: 0, w: 2, h: 1, wayfinding: EAST({ th: "แรกที่ปลายด้านเหนือ", en: "First stall at the north end" }) },
  { number: 13, slug: "13-thian-thong-made-to-order", th: "เทียนทอง อาหารตามสั่ง", en: "Thian Thong, made to order", cuisine: ["madeToOrder"], halal: false, col: 15, row: 1, w: 2, h: 1, wayfinding: EAST({ th: "ที่สองจากทางเหนือ", en: "Second stall from the north" }) },
  { number: 14, slug: "14-mum-kin-halal", th: "ร้านมุมกินฮาลาล", en: "Mum Kin Halal", cuisine: ["muslim", "madeToOrder"], halal: true, col: 15, row: 2, w: 2, h: 1, wayfinding: EAST({ th: "กลางแถว", en: "Middle stall" }) },
  { number: 15, slug: "15-tu-chicken-rice-pork-leg", th: "ข้าวมันไก่-ขาหมู TU", en: "TU Chicken Rice and Pork Leg", cuisine: ["chickenRice"], halal: false, col: 15, row: 3, w: 2, h: 1, wayfinding: EAST({ th: "ที่สี่จากทางเหนือ", en: "Fourth stall from the north" }) },
  { number: 16, slug: "16-yum-yum-snackie", th: "Yum Yum Snackie", en: "Yum Yum Snackie", cuisine: ["international"], halal: false, col: 15, row: 4, w: 2, h: 1, wayfinding: { th: "ร้านสุดท้ายที่ปลายด้านใต้ของแถวร้านฝั่งตะวันออก หันหน้าไปทางทิศตะวันตก ด้านหลังแถวร้านฝั่งตะวันออกเป็นห้องน้ำและบันได", en: "Last stall at the south end of the east column, facing west. Behind the east column are toilets and stairs." } },

  /* Corner kiosks on the north wall, either side of the central north lobby. */
  { number: 17, slug: "17-am-tea", th: "แอมที", en: "Am Tea", cuisine: ["drinks", "desserts"], halal: false, col: 4, row: 0, w: 2, h: 2, shape: "triangleBottomRight", wayfinding: { th: "แผงสามเหลี่ยมมุมผนังด้านเหนือ อยู่ทางซ้ายของทางเข้ากลางด้านเหนือ", en: "Triangular corner kiosk on the north wall, left of the central north entrance." } },
  { number: 18, slug: "18-kanlaya-peeled-fruit", th: "ร้านกัลยาผลไม้ปอกพร้อมทาน", en: "Kanlaya Peeled Fruit", cuisine: ["fruit"], halal: false, col: 8, row: 0, w: 2, h: 2, shape: "triangleBottomLeft", wayfinding: { th: "แผงสามเหลี่ยมมุมผนังด้านเหนือ อยู่ทางขวาของทางเข้ากลางด้านเหนือ ยังไม่ได้ถ่ายรูปเมนู และยังไม่ได้ยืนยันว่าร้านนี้อยู่ที่แผงนี้", en: "Triangular corner kiosk on the north wall, right of the central north entrance. Its menu has not been photographed and the shop at this kiosk is not yet confirmed." } },
];

const stallId = (number: number) => `survey-stall-${number}`;

function buildStalls(stamp: string): CanteenStall[] {
  return STALL_SPECS.map((spec) => ({
    _id: stallId(spec.number),
    _type: "canteenStall" as const,
    _createdAt: stamp,
    _updatedAt: stamp,
    name: { th: spec.th, en: spec.en },
    slug: slug(spec.slug),
    number: spec.number,
    cuisine: spec.cuisine,
    halal: spec.halal,
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
      th: "ผัดกะเพราคือเนื้อสัตว์สับผัดกับใบกะเพรา พริกและกระเทียม ราดบนข้าวสวย มักเสิร์ฟพร้อมไข่ดาวกรอบ เป็นเมนูตามสั่งที่คนสั่งมากที่สุด",
      en: "Minced meat stir-fried with holy basil, chilli and garlic, served over rice and usually topped with a crispy fried egg. It is the most ordered made to order dish.",
    },
  },
  {
    id: "khao-man-gai",
    slug: "khao-man-gai",
    th: "ข้าวมันไก่",
    en: "Hainanese chicken rice",
    aliases: ["khao man kai", "khaomangai", "chicken rice", "ข้าวมัน"],
    explainer: {
      th: "ไก่ต้มหรือไก่ทอดเสิร์ฟกับข้าวที่หุงในน้ำมันไก่ น้ำจิ้มเต้าเจี้ยวรสเค็มหวาน และน้ำซุปใส กินง่าย เหมาะกับคนที่เพิ่งมาลองอาหารไทย",
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
      th: "สลัดมะละกอดิบตำกับพริก กระเทียม มะนาว น้ำปลาและน้ำตาลปี๊บ รสเปรี้ยว เค็มและหวาน กินคู่กับข้าวเหนียวและไก่ย่าง",
      en: "Shredded unripe papaya pounded with chilli, garlic, lime, fish sauce and palm sugar. Sour, salty and sweet, eaten with sticky rice and grilled chicken.",
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
      th: "ข้าวสวยผัดกับไข่และเนื้อสัตว์ปรุงด้วยซีอิ๊วและน้ำมันหอย เสิร์ฟพร้อมแตงกวา มะนาวและพริกน้ำปลา",
      en: "Rice stir-fried with egg and your choice of meat, seasoned with soy and oyster sauce, served with cucumber, a lime wedge and chilli in fish sauce on the side.",
    },
  },
  {
    id: "pad-see-ew",
    slug: "pad-see-ew",
    th: "ผัดซีอิ๊ว",
    en: "Stir-fried wide noodles in soy sauce",
    aliases: ["pad si ew", "pad siew", "phat si io", "ผัดซีอิ้ว"],
    explainer: {
      th: "เส้นใหญ่ผัดกับซีอิ๊วดำ ไข่ และผักคะน้า ได้กลิ่นไหม้อ่อนจากกระทะร้อน รสหวานเค็ม",
      en: "Wide rice noodles fried with dark soy sauce, egg and Chinese broccoli. Smoky from a very hot wok, sweet and salty.",
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
      en: "Pan-fried wide noodles or crispy noodles under a thick, glossy gravy with Chinese broccoli and meat. Savoury and comforting.",
    },
  },
  {
    id: "tom-yum",
    slug: "tom-yum",
    th: "ต้มยำ",
    en: "Tom yum, hot and sour soup",
    aliases: ["tom yam", "tomyum", "tom yum goong"],
    explainer: {
      th: "ซุปเปรี้ยวหอมตะไคร้ ข่าและใบมะกรูด จะเป็นน้ำใสหรือน้ำข้นก็ได้ ใส่เป็นซุปถ้วยเดียว หรือใส่ในก๋วยเตี๋ยว",
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
      th: "ข้าวต้มเละร้อน ๆ กินกับขิง ต้นหอมและไข่ลวก อาหารเช้าที่ย่อยง่าย",
      en: "Hot, smooth rice porridge with ginger, spring onion and a soft egg. A gentle breakfast.",
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
      th: "ไข่ตีแล้วทอดในน้ำมันร้อนจนฟูกรอบ กินกับข้าวสวยและน้ำพริกหรือซอสพริก ใส่หมูสับได้",
      en: "Beaten eggs fried in plenty of hot oil until puffed and crispy at the edges, eaten over rice with chilli sauce. Often made with minced pork.",
    },
  },
];

function buildCanonicals(stamp: string): CanonicalDish[] {
  return CANONICAL_SPECS.map((spec) => ({
    _id: `survey-canonical-${spec.id}`,
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

function buildDishes(stamp: string): CanteenDish[] {
  return SURVEY_DISHES.map((spec) => ({
    _id: `survey-dish-${spec.slug}`,
    _type: "canteenDish" as const,
    _createdAt: stamp,
    _updatedAt: stamp,
    name: { th: spec.th, en: spec.en },
    ...(spec.romanised ? { romanised: spec.romanised } : {}),
    ...(spec.menuNumber ? { menuNumber: spec.menuNumber } : {}),
    slug: slug(spec.slug),
    stall: ref(stallId(spec.stall)),
    ...(spec.canonical ? { canonical: ref(`survey-canonical-${spec.canonical}`) } : {}),
    price: spec.price,
    variants: (spec.variants ?? []).map((variant, i) => ({ _key: `v${i}`, label: { th: variant.th, en: variant.en }, delta: variant.delta })),
    type: spec.type,
    course: spec.course,
    protein: spec.protein,
    ...(spec.contains ? { contains: spec.contains } : {}),
    ...(spec.style ? { style: spec.style } : {}),
    temperature: spec.temperature,
    wet: spec.wet,
    vegetarian: spec.vegetarian,
    checkedOn: SURVEY_DATE,
  }));
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
    _id: SETTINGS_ID,
    _type: "canteenSettings",
    _createdAt: stamp,
    _updatedAt: stamp,
    canteen: {
      _id: "survey-place-canteen",
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
  };
}

/* ------------------------------------------------------------------ *
 * The dataset
 * ------------------------------------------------------------------ */

/** The surveyed canteen. `now` only stamps the document metadata; every survey date is fixed. */
export function surveyCanteenData(now: Date = new Date()): CanteenData {
  const stamp = now.toISOString();
  return {
    settings: buildSettings(stamp),
    stalls: buildStalls(stamp),
    dishes: buildDishes(stamp),
    canonicals: buildCanonicals(stamp),
  };
}
