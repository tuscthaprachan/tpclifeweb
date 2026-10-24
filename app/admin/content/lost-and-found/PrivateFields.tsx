"use client";

import { InsetText, Textarea } from "@/components/ui";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";

/**
 * The two private lost and found fields. They sit in their own section with
 * a clear label, because nothing here may ever reach a public page.
 */
export function PrivateFields({ submitterContact, staffVerificationDetail }: { submitterContact: string | null; staffVerificationDetail: string | null }) {
  const { errors, locale } = useContentForm();
  return (
    <section aria-labelledby="lf-private" className="flex flex-col gap-[var(--space-4)] rounded-panel border-[length:var(--border-width-thick)] border-line-strong p-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-2)]">
        <h2 id="lf-private" className="m-0 text-xl font-semibold text-ink-900">
          {a("lfSectionPrivate", locale)}
        </h2>
        <InsetText>{a("lfSectionPrivateHint", locale)}</InsetText>
      </div>
      <Textarea
        id={fieldId("submitterContact")}
        name="submitterContact"
        label={a("lfFieldSubmitterContact", locale)}
        hint={a("lfFieldSubmitterContactHint", locale)}
        error={errors.submitterContact}
        defaultValue={submitterContact ?? ""}
        rows={2}
        maxLength={500}
        autoComplete="off"
      />
      <Textarea
        id={fieldId("staffVerificationDetail")}
        name="staffVerificationDetail"
        label={a("lfFieldVerification", locale)}
        hint={a("lfFieldVerificationHint", locale)}
        error={errors.staffVerificationDetail}
        defaultValue={staffVerificationDetail ?? ""}
        rows={4}
        maxLength={2000}
        autoComplete="off"
      />
    </section>
  );
}
