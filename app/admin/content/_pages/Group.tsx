import type { ReactNode } from "react";
import { Fieldset } from "@/components/ui";

/** A titled set of related fields, so a long form reads in short sections. */
export function Group({ id, legend, hint, children }: { id: string; legend: string; hint?: string; children: ReactNode }) {
  return (
    <Fieldset id={id} legend={legend} hint={hint}>
      <div className="flex flex-col gap-[var(--space-5)]">{children}</div>
    </Fieldset>
  );
}
