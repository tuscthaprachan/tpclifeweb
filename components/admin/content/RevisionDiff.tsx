import { ConsoleIcon } from "@/components/admin/icons";
import { Card } from "@/components/admin/ui";
import { Details, Heading, Stack } from "@/components/ui";
import type { DiffOp, DiffSide, FieldDiff, SnapshotDiff } from "@/lib/admin/content/diff";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

const KNOWN: Record<string, AdminKey> = {
  title: "fieldTitle",
  summary: "fieldSummary",
  body: "fieldBody",
  slug: "fieldSlug",
  owner: "fieldOwner",
  category: "fieldCategory",
  publishedAt: "fieldPublishedAt",
  coverImageId: "fieldCoverImage",
  gallery: "fieldGallery",
  tags: "fieldTags",
  publishAt: "clcPublishAt",
  unpublishAt: "clcUnpublishAt",
  status: "clcStatusAtVersion",
};

/** `policyStatus` to "Policy status", for the fields that have no translated name. */
export function fieldLabel(key: string, locale: Locale): string {
  const known = KNOWN[key];
  if (known) return a(known, locale);
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function Change({ op, locale }: { op: DiffOp; locale: Locale }) {
  if (op.type === "same") return <>{op.text}</>;
  const added = op.type === "add";
  const Tag = added ? "ins" : "del";
  return (
    <Tag className={added ? "underline decoration-2 underline-offset-2" : "line-through decoration-2"}>
      <ConsoleIcon name={added ? "add" : "diffRemoved"} size={14} className="me-[var(--space-1)] inline align-[-2px]" />
      <span className="visually-hidden">{a(added ? "clcAdded" : "clcRemoved", locale)}: </span>
      {op.text}
    </Tag>
  );
}

/** One language (or the only language) of a field: a single line as running text, anything longer as a list of lines. */
function Side({ side, locale, inline }: { side: DiffSide; locale: Locale; inline: boolean }) {
  const empty = side.ops.length === 0;
  if (empty) return <p className="m-0 text-ink-600">{a("clcEmptyValue", locale)}</p>;
  if (inline) {
    return (
      <p className="m-0 whitespace-pre-wrap break-words">
        {side.ops.map((op, i) => (
          <span key={i}>
            <Change op={op} locale={locale} />
          </span>
        ))}
      </p>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
      {side.ops.map((op, i) => (
        <li key={i} className={op.type === "same" ? "break-words text-ink-600" : "break-words"}>
          <Change op={op} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

function FieldBlock({ field, locale, headingLevel }: { field: FieldDiff; locale: Locale; headingLevel: 3 | 4 }) {
  const bilingual = field.sides.length === 2;
  const inline = field.kind === "text" && field.sides.every((s) => s.before.length <= 1 && s.after.length <= 1);
  return (
    <section className="flex flex-col gap-[var(--space-2)]">
      <Heading level={headingLevel} visualLevel={5} className="m-0">
        {fieldLabel(field.key, locale)}
      </Heading>
      <div className={bilingual ? "grid gap-[var(--space-4)] md:grid-cols-2" : ""}>
        {field.sides.map((side, i) => (
          <div key={i} className="min-w-0">
            {side.locale ? <p className="m-0 mb-[var(--space-1)] text-sm font-medium text-ink-600">{a(side.locale === "th" ? "clcLangTh" : "clcLangEn", locale)}</p> : null}
            <Side side={side} locale={locale} inline={inline} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The field-level comparison. Changed fields first, in full; unchanged ones
 * folded away. Insertions and deletions carry an icon and a word (read out by
 * screen readers) as well as underline or strike-through, never colour alone.
 */
export function RevisionDiff({ diff, locale }: { diff: SnapshotDiff; locale: Locale }) {
  const changed = diff.fields.filter((f) => f.changed);
  const same = diff.fields.filter((f) => !f.changed);
  return (
    <Stack space={4}>
      <p className="m-0 text-sm text-ink-600">{a("clcDiffLegend", locale)}</p>
      {changed.length === 0 ? (
        <p className="m-0">{a("clcNoChanges", locale)}</p>
      ) : (
        <Card title={a("clcChangedCount", locale, { count: changed.length })} icon="edit" level={3}>
          <Stack space={6}>
            {changed.map((field) => (
              <FieldBlock key={field.key} field={field} locale={locale} headingLevel={4} />
            ))}
          </Stack>
        </Card>
      )}
      {same.length > 0 ? (
        <Details summary={a("clcUnchangedFields", locale, { count: same.length })}>
          <Stack space={4}>
            {same.map((field) => (
              <FieldBlock key={field.key} field={field} locale={locale} headingLevel={4} />
            ))}
          </Stack>
        </Details>
      ) : null}
    </Stack>
  );
}
