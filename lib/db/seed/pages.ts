import type { ContentSection } from "../schema/content/enums";
import type { ExternalLinkJson } from "../schema/content/common";
import { contentPages } from "../schema/content/pages";
import { parseRichTextDoc } from "../../rich-text/schema";
import topics from "./data/topics.json";
import { excludedSet, published, type Bi, type SeedDb } from "./util";

/**
 * The topic pages (lib/db/seed/data/topics.json), in plan order: one row per
 * page, in the section it belongs to (docs/needs-rebuild-plan.md). The bodies
 * are already stored rich text, so they are checked with `parseRichTextDoc`
 * and written as they are. `userNeed` is the staff-only record of the needs the
 * page meets.
 */

export interface TopicSeed {
  slug: string;
  section: ContentSection;
  order: number;
  category: "transport" | "welfare" | "activity" | "governance";
  title: Bi;
  summary: Bi;
  userNeed: string;
  relatedLinks: ExternalLinkJson[];
  lastReviewed: string | null;
  bodyEn: unknown;
  bodyTh: unknown;
}

export const TOPIC_PAGES = topics as unknown as TopicSeed[];

export async function seedTopicPages(db: SeedDb): Promise<void> {
  for (const page of TOPIC_PAGES) {
    await db
      .insert(contentPages)
      .values({
        ...published(),
        section: page.section,
        slug: page.slug,
        userNeed: page.userNeed,
        titleTh: page.title.th,
        titleEn: page.title.en,
        summaryTh: page.summary.th,
        summaryEn: page.summary.en,
        bodyTh: parseRichTextDoc(page.bodyTh),
        bodyEn: parseRichTextDoc(page.bodyEn),
        category: page.category,
        relatedLinks: page.relatedLinks,
        lastReviewed: page.lastReviewed,
        sortOrder: page.order,
      })
      .onConflictDoUpdate({ target: contentPages.slug, set: excludedSet(contentPages) });
  }
}
