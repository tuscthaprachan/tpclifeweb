import { Heading, Stack } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import type { StepListAttrs } from "@/lib/rich-text/schema";

/**
 * A numbered walkthrough. The optional list title is a real heading at the
 * body's own depth (the same slot an h2 would occupy), because it labels a
 * whole section the way a heading should. Individual step titles are not:
 * a page can have any number of steps, and turning each into its own
 * heading would add outline entries a reader never asked to navigate by, so
 * they render as bold list text instead.
 */
export function StepListBlock({ attrs, locale, headingLevel }: { attrs: StepListAttrs; locale: Locale; headingLevel: HeadingLevel }) {
  if (!attrs?.steps || attrs.steps.length === 0) return null;

  const title = attrs.title ? pick(attrs.title, locale) : "";

  return (
    <Stack space={3}>
      {title ? (
        <Heading level={headingLevel} className="m-0">
          {title}
        </Heading>
      ) : null}
      <ol className="m-0 flex list-none flex-col p-0">
        {attrs.steps.map((step, i) => {
          const last = i === attrs.steps.length - 1;
          return (
            <li key={i} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-[var(--space-3)]">
              {last ? null : <span aria-hidden="true" className="absolute bottom-0 left-[calc(1rem-1px)] top-[2.25rem] w-[2px] bg-line" />}
              <span className="grid size-8 place-items-center rounded-full bg-action text-sm font-bold text-action-ink tabular-nums">
                {i + 1}
              </span>
              <div className={last ? "pt-[var(--space-1)]" : "pb-[var(--space-5)] pt-[var(--space-1)]"}>
                <p className="m-0 font-semibold text-ink-900">{pick(step.title, locale)}</p>
                {step.detail ? <p className="m-0 mt-[var(--space-1)] text-ink-600">{pick(step.detail, locale)}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Stack>
  );
}
