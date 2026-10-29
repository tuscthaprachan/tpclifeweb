"use client";

import { InsetText, Textarea } from "@/components/ui";
import { FormSection } from "@/components/admin/content/FormSection";
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
    <FormSection id="lf-private" icon="security" legend={a("lfSectionPrivate", locale)}>
      <InsetText>{a("lfSectionPrivateHint", locale)}</InsetText>
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
    </FormSection>
  );
}
