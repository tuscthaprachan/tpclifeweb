/**
 * Imports the canteen survey into Sanity from filled-in CSV files.
 *
 * WHAT IT READS (copies of the templates in data/, filled in from the survey)
 *   data/canteen-stalls.csv      one row per stall           (template: canteen-stalls-template.csv)
 *   data/canteen-survey.csv      one row per dish per stall  (template: canteen-survey-template.csv)
 *   data/canteen-canonical.csv   one row per canonical dish  (template: canteen-canonical-template.csv, optional)
 *
 * The templates themselves hold only a header and comment lines, so they
 * import nothing. This script does NOT contain any stall or dish: every
 * record comes from a surveyed spreadsheet, and nothing is ever invented.
 *
 * WHAT THIS CREATES
 *   `canteenStall`, `canonicalDish` and `canteenDish` documents, with
 *   deterministic dot-free ids, so running it again replaces the same
 *   documents instead of duplicating them. It also fills in the
 *   `canteenSettings` singleton (floor plan grid, entrances and seating
 *   zones) from `lib/canteen/dataset.ts`, and links it to the
 *   canteen `place`, creating that place with its opening hours if no place
 *   is linked yet. Settings fields already set in the Studio are never
 *   overwritten.
 *
 * WHAT IT LEAVES ALONE ON PURPOSE
 *   `lastReviewed` is left UNSET on every dish, so the Studio list of
 *   unreviewed records shows all of them and an editor has to walk each
 *   one. `priceHistory` is seeded with one entry: the first price and the
 *   day it was checked. Photos are not imported; upload them in the Studio.
 *
 * VALIDATION
 *   The whole input is checked before anything is written. Any problem (an
 *   unknown enum value, a missing English name, a dish naming a stall or
 *   canonical dish that does not exist) is listed with its file and line and
 *   nothing is written.
 *
 * HOW TO RUN
 *   Needs a write token (Editor permission is enough):
 *
 *     npx tsx --env-file=.env.local sanity/seed/canteen.ts
 *
 *   Pass --dry-run to validate and print what would be written:
 *
 *     npx tsx --env-file=.env.local sanity/seed/canteen.ts --dry-run
 *
 *   Override the file locations with --stalls, --dishes and --canonicals:
 *
 *     npx tsx --env-file=.env.local sanity/seed/canteen.ts --stalls my-stalls.csv --dishes my-dishes.csv
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@sanity/client";

import { surveyCanteenData } from "../../lib/canteen/dataset";
import type { CampusPlace } from "../../lib/sanity/types";
import { apiVersion, dataset, projectId } from "../../lib/sanity/env";
import {
  ALLERGENS,
  COOKING_STYLES,
  CUISINES,
  DISH_COURSES,
  DISH_TYPES,
  MAP_SHAPES,
  PROTEINS,
  TEMPERATURES,
} from "../../lib/canteen/options";

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

/** One parsed data row, with the line it started on for error messages. */
type Row = { line: number; cells: Record<string, string> };

/**
 * A small RFC 4180 reader: quoted fields, doubled quotes, commas and line
 * breaks inside quotes. Lines whose first character is `#` and blank lines are
 * skipped, which is how the templates carry their instructions. The first
 * remaining line is the header.
 */
export function parseCsv(text: string): Row[] {
  const records: Array<{ line: number; fields: string[] }> = [];
  let field = "";
  let fields: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let atLineStart = true;
  let skipLine = false;

  const endRecord = () => {
    fields.push(field);
    const blank = fields.length === 1 && fields[0]!.trim() === "";
    if (!blank) records.push({ line: recordLine, fields });
    field = "";
    fields = [];
  };

  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;

    if (atLineStart && !inQuotes) {
      skipLine = char === "#";
      recordLine = line;
      atLineStart = false;
    }

    if (skipLine) {
      if (char === "\n") {
        line += 1;
        atLineStart = true;
        skipLine = false;
      }
      continue;
    }

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field === "") inQuotes = true;
    else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\r") {
      // Swallowed: handled with the following "\n".
    } else if (char === "\n") {
      endRecord();
      line += 1;
      atLineStart = true;
    } else {
      field += char;
    }
  }
  if (!skipLine && (field !== "" || fields.length > 0)) endRecord();

  const [header, ...rest] = records;
  if (!header) return [];
  const names = header.fields.map((name) => name.trim());
  return rest.map(({ line: at, fields: values }) => ({
    line: at,
    cells: Object.fromEntries(names.map((name, column) => [name, (values[column] ?? "").trim()])),
  }));
}

/* ------------------------------------------------------------------ *
 * Validation helpers
 * ------------------------------------------------------------------ */

const problems: string[] = [];

function problem(file: string, row: Row, message: string): void {
  problems.push(`${file}:${row.line}  ${message}`);
}

function list(value: string): string[] {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function enumValue<T extends string>(file: string, row: Row, column: string, allowed: readonly T[]): T | undefined {
  const value = row.cells[column] ?? "";
  if ((allowed as readonly string[]).includes(value)) return value as T;
  problem(file, row, `${column} is "${value}", expected one of: ${allowed.join(", ")}`);
  return undefined;
}

function enumList<T extends string>(file: string, row: Row, column: string, allowed: readonly T[], min = 1): T[] {
  const values = list(row.cells[column] ?? "");
  const good = values.filter((value): value is T => (allowed as readonly string[]).includes(value));
  for (const value of values) {
    if (!(allowed as readonly string[]).includes(value)) {
      problem(file, row, `${column} has "${value}", expected values from: ${allowed.join(", ")}`);
    }
  }
  if (good.length < min) problem(file, row, `${column} needs at least ${min} value`);
  return good;
}

function wholeNumber(file: string, row: Row, column: string, min: number, fallback?: number): number | undefined {
  const raw = row.cells[column] ?? "";
  if (raw === "" && fallback !== undefined) return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < min) {
    problem(file, row, `${column} is "${raw}", expected a whole number of ${min} or more`);
    return undefined;
  }
  return Number(raw);
}

function dateValue(file: string, row: Row, column: string, required: boolean): string | undefined {
  const raw = row.cells[column] ?? "";
  if (raw === "") {
    if (required) problem(file, row, `${column} is required (YYYY-MM-DD)`);
    return undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
    problem(file, row, `${column} is "${raw}", expected YYYY-MM-DD`);
    return undefined;
  }
  return raw;
}

function yesNo(file: string, row: Row, column: string): boolean {
  const raw = (row.cells[column] ?? "").toLowerCase();
  if (raw === "yes") return true;
  if (raw === "no" || raw === "") return false;
  problem(file, row, `${column} is "${raw}", expected yes or no`);
  return false;
}

function bilingual(file: string, row: Row, column: string, required: boolean) {
  const th = row.cells[`${column}_th`] ?? "";
  const en = row.cells[`${column}_en`] ?? "";
  if (required && (!th || !en)) problem(file, row, `${column}_th and ${column}_en are both required`);
  if (!required && Boolean(th) !== Boolean(en)) problem(file, row, `give both ${column}_th and ${column}_en, or neither`);
  return { th, en };
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function slugValue(file: string, row: Row, column: string, fallback: string): string {
  const raw = row.cells[column] ?? "";
  if (raw === "") return fallback;
  if (!SLUG.test(raw)) problem(file, row, `${column} is "${raw}", use lowercase letters, digits and hyphens`);
  return raw;
}

/* ------------------------------------------------------------------ *
 * Builders (mirroring handbook.ts)
 * ------------------------------------------------------------------ */

/** A short key. Sanity requires one on every object in an array. */
function key(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function slug(current: string) {
  return { _type: "slug" as const, current };
}

function localeString(th: string, en: string) {
  return { _type: "localeString" as const, th, en };
}

function localeText(th: string, en: string) {
  return { _type: "localeText" as const, th, en };
}

function reference(id: string) {
  return { _type: "reference" as const, _ref: id };
}

type SeedDoc = { _id: string; _type: string; [field: string]: unknown };

/** A published id must not contain a dot (that marks a draft). See docId in seed.ts. */
function docId(type: string, name: string): string {
  return `${type}-${name.replace(/\./g, "-")}`;
}

/** Parses "1-5 07:00-15:00; 6 08:00-12:00" into `openingHours` objects. */
function parseHours(file: string, row: Row, raw: string) {
  const blocks = [];
  for (const part of list(raw)) {
    const match = part.match(/^([0-6](?:\s*[-,]\s*[0-6])*)\s+([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      problem(file, row, `hours "${part}" is not in the form "1-5 07:00-15:00"`);
      continue;
    }
    const days = new Set<number>();
    for (const piece of match[1]!.split(",")) {
      const [from, to] = piece.split("-").map((n) => Number(n.trim()));
      if (to === undefined) days.add(from!);
      else for (let d = from!; d <= to; d += 1) days.add(d);
    }
    blocks.push({
      _type: "openingHours" as const,
      _key: key(),
      daysOfWeek: [...days].sort((a, b) => a - b),
      opens: `${match[2]}:${match[3]}`,
      closes: `${match[4]}:${match[5]}`,
    });
  }
  return blocks;
}

/* ------------------------------------------------------------------ *
 * Reading the three sheets
 * ------------------------------------------------------------------ */

function argValue(name: string, fallback: string): string {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1]! : fallback;
}

const DRY_RUN = process.argv.includes("--dry-run");
const DATA_DIR = join(process.cwd(), "data");

const STALLS_FILE = argValue("--stalls", join(DATA_DIR, "canteen-stalls.csv"));
const DISHES_FILE = argValue("--dishes", join(DATA_DIR, "canteen-survey.csv"));
const CANONICALS_FILE = argValue("--canonicals", join(DATA_DIR, "canteen-canonical.csv"));

function readSheet(file: string, required: boolean): Row[] {
  if (!existsSync(file)) {
    if (required) {
      throw new Error(
        `Missing ${file}. Copy the matching template in data/ (it ends in -template.csv), fill it in from the survey, and save it without "-template".`,
      );
    }
    return [];
  }
  return parseCsv(readFileSync(file, "utf8"));
}

function buildCanonicals(file: string, rows: Row[]): SeedDoc[] {
  const seen = new Set<string>();
  const docs: SeedDoc[] = [];
  for (const row of rows) {
    const id = row.cells.slug ?? "";
    if (!id || !SLUG.test(id)) {
      problem(file, row, `slug is "${id}", use lowercase letters, digits and hyphens`);
      continue;
    }
    if (seen.has(id)) problem(file, row, `slug "${id}" appears twice`);
    seen.add(id);

    const name = bilingual(file, row, "name", true);
    const explainer = bilingual(file, row, "explainer", false);
    const phrases = list(row.cells.how_to_order ?? "").flatMap((phrase) => {
      const [th = "", romanised = "", en = ""] = phrase.split("|").map((part) => part.trim());
      if (!th || !romanised || !en) {
        problem(file, row, `how_to_order "${phrase}" needs thai|romanised|english`);
        return [];
      }
      return [{ _type: "orderPhrase" as const, _key: key(), th, romanised, en }];
    });
    const aliases = list(row.cells.aliases ?? "");

    docs.push({
      _id: docId("canonicalDish", id),
      _type: "canonicalDish",
      name: localeString(name.th, name.en),
      slug: slug(id),
      ...(aliases.length > 0 ? { aliases } : {}),
      ...(explainer.th && explainer.en ? { explainer: localeText(explainer.th, explainer.en) } : {}),
      ...(phrases.length > 0 ? { howToOrder: phrases } : {}),
    });
  }
  return docs;
}

function buildStalls(file: string, rows: Row[]): { docs: SeedDoc[]; idByNumber: Map<number, string> } {
  const idByNumber = new Map<number, string>();
  const slugs = new Set<string>();
  const docs: SeedDoc[] = [];

  for (const row of rows) {
    const number = wholeNumber(file, row, "number", 1);
    if (number === undefined) continue;
    if (idByNumber.has(number)) {
      problem(file, row, `stall number ${number} appears twice`);
      continue;
    }
    const name = bilingual(file, row, "name", true);
    const stallSlug = slugValue(file, row, "slug", `stall-${number}`);
    if (slugs.has(stallSlug)) problem(file, row, `slug "${stallSlug}" appears twice`);
    slugs.add(stallSlug);

    const cuisine = enumList(file, row, "cuisine", CUISINES);
    const col = wholeNumber(file, row, "map_col", 0);
    const mapRow = wholeNumber(file, row, "map_row", 0);
    const w = wholeNumber(file, row, "map_w", 1, 1);
    const h = wholeNumber(file, row, "map_h", 1, 1);
    const shape = row.cells.map_shape ? enumValue(file, row, "map_shape", MAP_SHAPES) : "rect";
    const wayfinding = bilingual(file, row, "wayfinding", false);
    const hours = row.cells.hours ? parseHours(file, row, row.cells.hours) : [];

    const addOns = list(row.cells.add_ons ?? "").flatMap((entry) => {
      const [th = "", en = "", delta = "", scope = "all"] = entry.split("|").map((part) => part.trim());
      if (!th || !en || !/^\d+$/.test(delta)) {
        problem(file, row, `add_ons "${entry}" needs label_th|label_en|extra baht|scope`);
        return [];
      }
      const addOn = { _type: "stallAddOn" as const, _key: key(), label: localeString(th, en), delta: Number(delta) };
      if (scope === "all") return [addOn];
      if (scope.startsWith("course:")) {
        const courses = scope.slice(7).split("+").filter((course): course is (typeof DISH_COURSES)[number] => (DISH_COURSES as readonly string[]).includes(course));
        return [{ ...addOn, courses }];
      }
      if (scope.startsWith("dishes:")) {
        const dishes = scope.slice(7).split("+").map((dishSlug) => ({ ...reference(docId("canteenDish", `${number}-${dishSlug}`)), _key: key() }));
        return [{ ...addOn, dishes }];
      }
      problem(file, row, `add_ons scope "${scope}" should be all, course:drink+main or dishes:slug+slug`);
      return [];
    });

    const id = docId("canteenStall", String(number));
    idByNumber.set(number, id);
    docs.push({
      _id: id,
      _type: "canteenStall",
      name: localeString(name.th, name.en),
      slug: slug(stallSlug),
      number,
      cuisine,
      halal: yesNo(file, row, "halal"),
      vegetarianStall: yesNo(file, row, "vegetarian_stall"),
      ...(addOns.length > 0 ? { addOns } : {}),
      ...(hours.length > 0 ? { hours } : {}),
      mapCell: {
        col: col ?? 0,
        row: mapRow ?? 0,
        w: w ?? 1,
        h: h ?? 1,
        ...(shape && shape !== "rect" ? { shape } : {}),
      },
      ...(wayfinding.th && wayfinding.en ? { wayfinding: localeString(wayfinding.th, wayfinding.en) } : {}),
    });
  }
  return { docs, idByNumber };
}

function buildDishes(
  file: string,
  rows: Row[],
  stallIds: Map<number, string>,
  canonicalSlugs: Set<string>,
): SeedDoc[] {
  const docs: SeedDoc[] = [];
  const slugs = new Set<string>();
  const counters = new Map<number, number>();

  for (const row of rows) {
    const stallNumber = wholeNumber(file, row, "stall_number", 1);
    if (stallNumber === undefined) continue;
    const stallId = stallIds.get(stallNumber);
    if (!stallId) {
      problem(file, row, `stall_number ${stallNumber} is not in the stall sheet`);
      continue;
    }
    const counter = (counters.get(stallNumber) ?? 0) + 1;
    counters.set(stallNumber, counter);

    const name = bilingual(file, row, "name", true);
    const dishSlug = slugValue(file, row, "slug", `s${stallNumber}-${counter}`);
    if (slugs.has(dishSlug)) problem(file, row, `slug "${dishSlug}" appears twice`);
    slugs.add(dishSlug);

    const canonicalSlug = row.cells.canonical_slug ?? "";
    if (canonicalSlug && !canonicalSlugs.has(canonicalSlug)) {
      problem(file, row, `canonical_slug "${canonicalSlug}" is not in the canonical dish sheet`);
    }

    const price = wholeNumber(file, row, "price", 1);
    const checkedOn = dateValue(file, row, "checked_on", true);
    const type = enumValue(file, row, "type", DISH_TYPES);
    const course = enumValue(file, row, "course", DISH_COURSES);
    const protein = enumList(file, row, "protein", PROTEINS);
    if (protein.includes("none") && protein.length > 1) problem(file, row, 'protein: remove "none" or the other values');
    const contains = enumList(file, row, "contains", ALLERGENS, 0);
    const style = row.cells.style ? enumValue(file, row, "style", COOKING_STYLES) : undefined;
    const temperature = enumValue(file, row, "temperature", TEMPERATURES);

    const variants = list(row.cells.variants ?? "").flatMap((variant) => {
      const [th = "", en = "", delta = ""] = variant.split("|").map((part) => part.trim());
      if (!th || !en || !/^\d+$/.test(delta)) {
        problem(file, row, `variants "${variant}" needs label_th|label_en|extra baht`);
        return [];
      }
      return [{ _type: "dishVariant" as const, _key: key(), label: localeString(th, en), delta: Number(delta) }];
    });

    if (price === undefined || checkedOn === undefined) continue;

    const sayAs = list(row.cells.say ?? "").flatMap((phrase) => {
      const [th = "", romanised = ""] = phrase.split("|").map((part) => part.trim());
      if (!th || !romanised) {
        problem(file, row, `say "${phrase}" needs thai|romanised`);
        return [];
      }
      return [{ _type: "sayPhrase" as const, _key: key(), th, romanised }];
    });
    const menuNumber = (row.cells.menu_number ?? "").trim();

    docs.push({
      _id: docId("canteenDish", `${stallNumber}-${dishSlug}`),
      _type: "canteenDish",
      name: localeString(name.th, name.en),
      ...(sayAs.length > 0 ? { sayAs } : {}),
      ...(menuNumber ? { menuNumber } : {}),
      slug: slug(dishSlug),
      stall: reference(stallId),
      ...(canonicalSlug ? { canonical: reference(docId("canonicalDish", canonicalSlug)) } : {}),
      price,
      ...(variants.length > 0 ? { variants } : {}),
      type,
      course,
      protein,
      ...(contains.length > 0 ? { contains } : {}),
      ...(style ? { style } : {}),
      temperature,
      wet: yesNo(file, row, "wet"),
      vegetarian: yesNo(file, row, "vegetarian"),
      checkedOn,
      // Seeded with the first surveyed price. Later changes append to this.
      priceHistory: [{ _type: "priceRecord" as const, _key: key(), price, checkedOn }],
      // lastReviewed is deliberately not set: an editor has to walk every record.
    });
  }
  return docs;
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function run(): Promise<void> {
  const stallRows = readSheet(STALLS_FILE, true);
  const dishRows = readSheet(DISHES_FILE, true);
  const canonicalRows = readSheet(CANONICALS_FILE, false);

  const canonicalDocs = buildCanonicals(CANONICALS_FILE, canonicalRows);
  const canonicalSlugs = new Set(canonicalRows.map((row) => row.cells.slug ?? "").filter(Boolean));
  const { docs: stallDocs, idByNumber } = buildStalls(STALLS_FILE, stallRows);
  const dishDocs = buildDishes(DISHES_FILE, dishRows, idByNumber, canonicalSlugs);

  if (problems.length > 0) {
    console.error(`Found ${problems.length} problem(s). Nothing was written.\n`);
    for (const message of problems) console.error(`  ${message}`);
    process.exitCode = 1;
    return;
  }

  const docs: SeedDoc[] = [...canonicalDocs, ...stallDocs, ...dishDocs];
  console.log(
    `Canteen import -> project ${projectId}, dataset ${dataset}` + (DRY_RUN ? "  [DRY RUN, nothing will be written]" : ""),
  );
  console.log(`  ${stallDocs.length} canteenStall, ${dishDocs.length} canteenDish, ${canonicalDocs.length} canonicalDish\n`);

  if (docs.length === 0) {
    console.log("The sheets have no rows. Nothing to import.");
    return;
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: DRY_RUN ? undefined : requireWriteToken(),
    useCdn: false,
    perspective: "raw",
  });

  if (DRY_RUN) {
    console.log(`  would fill   ${SETTINGS_ID} (only fields not already set) and link the canteen place`);
  } else {
    try {
      await writeSettings(client);
    } catch (error) {
      console.error(`  FAIL    ${SETTINGS_ID}`, error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }

  let written = 0;
  const failures: string[] = [];
  for (const doc of docs) {
    if (DRY_RUN) {
      console.log(`  would write  ${doc._id}`);
      written += 1;
      continue;
    }
    try {
      await client.createOrReplace(doc);
      written += 1;
      console.log(`  ok      ${doc._id}`);
    } catch (error) {
      failures.push(doc._id);
      console.error(`  FAIL    ${doc._id}`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n${written} of ${docs.length} documents ${DRY_RUN ? "validated" : "written"}.`);
  if (failures.length > 0) {
    console.error(`${failures.length} failed: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

/* ------------------------------------------------------------------ *
 * Canteen settings
 * ------------------------------------------------------------------ */

/** The singleton's id, as fixed by the desk structure. */
const SETTINGS_ID = "canteenSettings";
const PLACE_ID = "place-thammasat-60-years-canteen";

type WriteClient = ReturnType<typeof createClient>;

/**
 * Creates the canteen settings if missing and fills only the fields that are
 * not set, so an editor's changes in the Studio survive a re-import. The
 * canteen place is linked if the settings have none: an existing place with
 * the canteen's slug is reused, otherwise one is created with the hours.
 */
async function writeSettings(client: WriteClient): Promise<void> {
  const source = surveyCanteenData().settings!;
  const place = source.canteen as CampusPlace;
  const existing = await client.fetch<{ canteen?: string } | null>(`*[_id == $id][0]{ "canteen": canteen._ref }`, { id: SETTINGS_ID });

  let placeId = existing?.canteen;
  if (!placeId) {
    placeId =
      (await client.fetch<string | null>(`*[_type == "place" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`, {
        slug: place.slug.current,
      })) ?? PLACE_ID;
    if (placeId === PLACE_ID) {
      await client.createIfNotExists({
        _id: PLACE_ID,
        _type: "place",
        name: localeString(place.name.th, place.name.en),
        slug: slug(place.slug.current),
        category: place.category,
        openingHours: (place.openingHours ?? []).map((hours) => ({ ...hours, _type: "openingHours", _key: key() })),
      });
      console.log(`  ok      ${PLACE_ID}`);
    }
  }

  await client.createIfNotExists({ _id: SETTINGS_ID, _type: "canteenSettings" });
  await client
    .patch(SETTINGS_ID)
    .setIfMissing({
      canteen: reference(placeId),
      gridCols: source.gridCols,
      gridRows: source.gridRows,
      entrances: (source.entrances ?? []).map((entrance) => ({ ...entrance, _type: "canteenEntrance", label: localeString(entrance.label.th, entrance.label.en) })),
      seatingZones: (source.seatingZones ?? []).map((zone) => ({ ...zone, _type: "canteenSeatingZone", label: localeString(zone.label.th, zone.label.en) })),
      outline: (source.outline ?? []).map((point) => ({ ...point, _type: "canteenOutlinePoint", _key: key() })),
      landmarks: (source.landmarks ?? []).map((landmark) => ({ ...landmark, _type: "canteenLandmark", label: localeString(landmark.label.th, landmark.label.en) })),
    })
    .commit();
  console.log(`  ok      ${SETTINGS_ID}`);
}

function requireWriteToken(): string {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Missing environment variable SANITY_API_WRITE_TOKEN. Create a token with write access at " +
        "manage.sanity.io (Editor permission is enough), for example: " +
        "npx tsx --env-file=.env.local sanity/seed/canteen.ts",
    );
  }
  return token;
}

// Only run when executed directly. (Importing this file still needs the Sanity env vars,
// because lib/sanity/env.ts checks them at import time, same as handbook.ts.)
if (process.argv[1] && /canteen\.ts$/.test(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
