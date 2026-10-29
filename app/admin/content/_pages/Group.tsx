import type { ReactNode } from "react";
import { FormSection, type FormSectionProps } from "@/components/admin/content/FormSection";

/** A titled card of related fields, so a long form reads in short sections. */
export function Group({ id, legend, hint, icon, children }: { id: string; legend: string; hint?: string; icon?: FormSectionProps["icon"]; children: ReactNode }) {
  return (
    <FormSection id={id} legend={legend} hint={hint} icon={icon}>
      {children}
    </FormSection>
  );
}
