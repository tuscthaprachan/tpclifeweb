import { Heading, Stack } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import type { LocaleString, LocaleText } from "@/lib/sanity/types";

interface Step {
  _key: string;
  title: LocaleString;
  detail?: LocaleText;
}

export interface StepListValue {
  _type: "stepList";
  _key: string;
  title?: LocaleString;
  steps: Step[];
}

/**
 * A numbered walkthrough. The optional list title is a real heading at the
 * body's own depth (the same slot an h2 would occupy), because it labels a
 * whole section the way a heading should. Individual step titles are not:
 * a page can have any number of steps, and turning each into its own
 * heading would add outline entries a reader never asked to navigate by, so
 * they render as bold list text instead.
 */
export function StepListBlock({ value, locale, headingLevel }: { value: StepListValue; locale: Locale; headingLevel: HeadingLevel }) {
  if (!value?.steps || value.steps.length === 0) return null;

  const title = value.title ? pick(value.title, locale) : "";

  return (
    <Stack space={3} className="my-[var(--space-4)]">
      {title ? (
        <Heading level={headingLevel} className="m-0">
          {title}
        </Heading>
      ) : null}
      <ol className="m-0 flex list-decimal flex-col gap-[var(--space-3)] pl-[var(--space-6)]">
        {value.steps.map((step) => (
          <li key={step._key}>
            <p className="m-0 font-semibold text-ink-900">{pick(step.title, locale)}</p>
            {step.detail ? <p className="m-0 mt-[var(--space-1)] text-ink-600">{pick(step.detail, locale)}</p> : null}
          </li>
        ))}
      </ol>
    </Stack>
  );
}
