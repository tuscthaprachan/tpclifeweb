import { Heading } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import type { KeyFactsAttrs } from "@/lib/rich-text/schema";

export function KeyFactsBlock({ attrs, locale, headingLevel }: { attrs: KeyFactsAttrs; locale: Locale; headingLevel: HeadingLevel }) {
  if (!attrs?.facts || attrs.facts.length === 0) return null;
  const title = attrs.title ? pick(attrs.title, locale) : "";

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {title ? (
        <Heading level={headingLevel} className="m-0">
          {title}
        </Heading>
      ) : null}
      <ul className="m-0 grid list-none gap-[var(--space-2)] p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        {attrs.facts.map((fact, i) => (
          <li key={i} className="m-0 flex flex-col gap-[var(--space-1)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-4)]">
            <span className="text-[length:var(--text-2xl)] font-bold leading-tight text-action tabular-nums [overflow-wrap:anywhere]">{pick(fact.value, locale)}</span>
            <span className="text-sm leading-snug text-ink-600">{pick(fact.label, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
