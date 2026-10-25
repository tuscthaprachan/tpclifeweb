"use client";

import { useActionState, useState } from "react";
import { Button, ErrorMessage, SummaryList } from "@/components/ui";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { revealContactsAction, type RevealState } from "./actions";

/**
 * Contact details stay out of the page until staff ask. Showing them runs a
 * server action that decrypts, records the view, and returns the values for
 * this request only; "Hide" drops them from the page again.
 */
export function ContactDetails({ locale, caseId, organisationId, count }: { locale: Locale; caseId: string; organisationId: number; count: number }) {
  const [state, action, pending] = useActionState<RevealState, FormData>(revealContactsAction, {});
  const [hidden, setHidden] = useState(false);
  const shown = state.contacts && !hidden;
  const yesNo = (v: boolean) => a(v ? "contactYes" : "contactNo", locale);

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <p className="m-0 text-ink-600">{count === 1 ? a("caseContactsHeldOne", locale) : a("caseContactsHeld", locale, { count })}</p>
      {state.error ? <ErrorMessage id="case-contacts-error">{state.error}</ErrorMessage> : null}
      {shown ? (
        <div className="flex flex-col gap-[var(--space-4)]" aria-live="polite">
          {state.contacts!.map((c) => (
            <SummaryList
              key={c.id}
              rows={[
                { key: a(`contactRole_${c.role}` as AdminKey, locale), value: c.name ?? a("caseNone", locale) },
                ...(c.email ? [{ key: a("contactEmail", locale), value: c.email }] : []),
                ...(c.phone ? [{ key: a("contactPhone", locale), value: c.phone }] : []),
                ...(c.lineId ? [{ key: a("contactLine", locale), value: c.lineId }] : []),
                ...(c.preferredContact ? [{ key: a("contactPreferred", locale), value: a(`contactPref_${c.preferredContact}` as AdminKey, locale) }] : []),
                { key: a("contactConsent", locale), value: yesNo(c.consentContact) },
                { key: a("contactConsentShare", locale), value: yesNo(c.consentShare) },
              ]}
            />
          ))}
          <div>
            <Button variant="secondary" onClick={() => setHidden(true)}>
              {a("caseContactsHide", locale)}
            </Button>
          </div>
        </div>
      ) : (
        <form action={(fd) => { setHidden(false); action(fd); }}>
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="org" value={organisationId} />
          <Button type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("caseContactsShow", locale)}
          </Button>
        </form>
      )}
      <p className="m-0 text-sm text-ink-600">{a("caseContactsLogged", locale)}</p>
    </div>
  );
}
