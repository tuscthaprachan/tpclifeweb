import Link from "next/link";
import { Checkboxes, Heading, Stack, WarningText } from "@/components/ui";
import { depositCardsFor } from "@/lib/borrowing/rules";
import { SHARED_TERMS } from "@/lib/borrowing/terms";
import type { InventoryCategory } from "@/lib/borrowing/availability";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { Question } from "./Question";

/** The lines of a category's own terms, one per line as the desk wrote them. */
const linesOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

interface TermsStepProps {
  locale: Locale;
  title: string;
  /** The categories of the items chosen. */
  categories: InventoryCategory[];
  agreed: boolean;
  error?: string;
}

/** The shared terms, then each chosen category's own, then the cards to bring. Agreeing replaces the signature on the paper form. */
export function TermsStep({ locale, title, categories, agreed, error }: TermsStepProps) {
  const cards = depositCardsFor(categories);
  const own = categories
    .map((c) => ({ name: pick({ th: c.nameTh, en: c.nameEn }, locale), lines: linesOf(pick({ th: c.termsTh, en: c.termsEn }, locale)) }))
    .filter((c) => c.lines.length > 0);
  return (
    <>
      <Stack space={2}>
        <Question>{title}</Question>
        <p className="m-0 text-ink-900">{UI.brTermsIntro[locale]}</p>
      </Stack>
      <Stack space={2} as="section">
        <Heading level={2}>{UI.brTermsShared[locale]}</Heading>
        <ol className="m-0 flex list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
          {SHARED_TERMS.map((term) => (
            <li key={term.en}>{pick(term, locale)}</li>
          ))}
        </ol>
      </Stack>
      {own.map((c) => (
        <Stack key={c.name} space={2} as="section">
          <Heading level={2}>{UI.brTermsFor[locale].replace("{category}", c.name)}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {c.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Stack>
      ))}
      {cards > 0 ? (
        <WarningText>
          <span className="visually-hidden">{UI.warning[locale]}: </span>
          {(cards === 1 ? UI.brBringCardOne : UI.brBringCards)[locale].replace("{n}", String(cards))}
        </WarningText>
      ) : null}
      <p className="m-0 text-ink-900">
        {UI.brTermsPrivacy[locale]}{" "}
        <Link href={localePath(locale, "/borrow/privacy")} className="text-action underline">
          {UI.brPrivacyLink[locale]}
        </Link>
      </p>
      <Checkboxes id="terms" name="terms" legend={UI.brTermsLegend[locale]} error={error} defaultValue={agreed ? ["yes"] : []} options={[{ value: "yes", label: UI.brTermsAgree[locale] }]} />
    </>
  );
}
