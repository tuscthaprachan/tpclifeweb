import { seedCanteen } from "./canteen";
import { seedDirectory } from "./directory";
import { seedFaculties } from "./faculties";
import { seedForms } from "./forms";
import { seedHandbook } from "./handbook";
import { seedGuidePages } from "./pages";
import { seedShuttle } from "./shuttle";
import { seedSiteSettings } from "./site";
import type { SeedDb } from "./util";

/**
 * Seeds all website content, in dependency order, in one transaction: places
 * before the canteen settings that point at one; forms before anything that
 * relates to them. Idempotent: re-running upserts by slug / natural key and
 * leaves row counts unchanged.
 *
 * Seeded: site settings, 1 form, 4 hand-built guide pages, 2 shuttle routes,
 * the faculties (names only, before the directory that links to them), the
 * directory (harvested + handbook organisations), the handbook (FAQs, welfare
 * pages, guide pages, places) and the whole surveyed canteen.
 * Deliberately NOT seeded because the sources have none: news, events, policies,
 * service alerts, lost and found entries. Page-level copy that lives in code
 * (the about pages, TRANSPORT facts on /getting-around, the /report page) stays
 * in code.
 */
export async function seedContent(db: SeedDb): Promise<void> {
  await db.transaction(async (tx) => {
    await seedSiteSettings(tx);
    await seedForms(tx);
    await seedShuttle(tx);
    await seedFaculties(tx);
    await seedDirectory(tx);
    await seedGuidePages(tx);
    await seedHandbook(tx);
    await seedCanteen(tx);
  });
}
