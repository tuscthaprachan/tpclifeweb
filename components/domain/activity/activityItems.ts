/**
 * Building the TUSU/TUSC activity feed shown at the very bottom of the home
 * page, from the two sources that already carry a real `Owner`: news posts
 * and policy updates. Every item keeps its `Owner` all the way to render, so
 * the feed can attribute each entry individually rather than merging TUSU
 * and TUSC into one anonymous stream (CONTRIBUTING.md, and the home agent's
 * brief: "Attribute every item to TUSU or TUSC; do not merge them
 * anonymously").
 *
 * A policy with no `updates` yet contributes nothing here. CONTRIBUTING.md's
 * honesty rule against inferring progress from nothing applies just as much
 * to "has this body done anything lately" as it does to a progress
 * percentage: a policy that exists but has no recorded update stays silent
 * rather than being padded with a fabricated entry.
 */

import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { NewsPost, Owner, Policy, PolicyStatus } from "@/lib/content/types";

/** The two bodies this feed attributes to. University- or joint-owned items are out of scope for "TUSU and TUSC activity" specifically. */
export type ActivityOwner = Extract<Owner, "tusu" | "tusc">;

function isBodyOwner(owner: Owner): owner is ActivityOwner {
  return owner === "tusu" || owner === "tusc";
}

interface ActivityItemBase {
  id: string;
  /** ISO date/datetime, used both to sort and to render via `Timestamp`. */
  date: string;
  owner: ActivityOwner;
  title: string;
  detail: string;
}

export type ActivityItem =
  | (ActivityItemBase & { kind: "news"; href: string })
  | (ActivityItemBase & { kind: "policyUpdate"; status: PolicyStatus });

const MAX_ITEMS = 8;

/**
 * Combines TUSU/TUSC-owned news posts with the most recent recorded update
 * on each TUSU/TUSC-owned policy into one chronological, attributed feed,
 * newest first, capped to a readable length.
 */
export function buildActivityItems(news: NewsPost[], policies: Policy[], locale: Locale): ActivityItem[] {
  const newsItems: ActivityItem[] = news
    .filter((post) => isBodyOwner(post.owner))
    .map((post) => ({
      id: post._id,
      date: post.publishedAt,
      owner: post.owner as ActivityOwner,
      kind: "news",
      title: pick(post.title, locale),
      detail: pick(post.summary, locale),
      href: localePath(locale, `/news/${post.slug.current}`),
    }));

  const policyItems: ActivityItem[] = [];
  for (const policy of policies) {
    if (!isBodyOwner(policy.owner)) continue;
    const updates = policy.updates ?? [];
    if (updates.length === 0) continue;

    // `updates` is not guaranteed sorted in the CMS; take the most recent by date.
    const latest = [...updates].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!latest) continue;

    policyItems.push({
      id: `${policy._id}-${latest._key}`,
      date: latest.date,
      owner: policy.owner,
      kind: "policyUpdate",
      title: pick(policy.title, locale),
      detail: pick(latest.note, locale),
      status: latest.status,
    });
  }

  return [...newsItems, ...policyItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_ITEMS);
}
