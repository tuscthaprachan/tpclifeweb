import { WELLBEING_CONTACT } from "@/lib/complaints/constants";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/** Where to find support at the TU wellbeing centre, offered with categories that can be distressing. */
export function WellbeingBox({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="cp-wellbeing" className="rounded-panel border border-line-strong p-[var(--space-4)]">
      <h2 id="cp-wellbeing" className="m-0 text-xl font-bold text-ink-900">
        {UI.cpWellbeingTitle[locale]}
      </h2>
      <p className="m-0 mt-[var(--space-2)] text-ink-900">{UI.cpWellbeingBody[locale]}</p>
      <ul className="m-0 mt-[var(--space-3)] flex list-none flex-col gap-[var(--space-2)] p-0">
        <li>
          {UI.cpWellbeingPhone[locale]}:{" "}
          <a href={WELLBEING_CONTACT.phone.tel} className="font-semibold text-action underline">
            {WELLBEING_CONTACT.phone.display}
          </a>
        </li>
        {WELLBEING_CONTACT.line.map((line) => (
          <li key={line.id}>
            {UI.cpWellbeingLine[locale]}:{" "}
            <a href={line.url} className="font-semibold text-action underline">
              {line.id}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
