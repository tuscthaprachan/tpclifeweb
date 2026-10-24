"use client";

import { Fieldset } from "@/components/ui";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";

/** A group of tick boxes posting one value per ticked option under `name`, with its error from the surrounding form. */
export function CheckGroup({
  name,
  label,
  hint,
  options,
  defaultValue = [],
}: {
  name: string;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  defaultValue?: string[];
}) {
  const { errors } = useContentForm();
  const id = fieldId(name);
  return (
    <Fieldset legend={label} hint={hint} error={errors[name]} id={id}>
      <div className="grid gap-x-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option, index) => (
          <label key={option.value} className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
            <input
              id={index === 0 ? id : undefined}
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValue.includes(option.value)}
              className="size-5 shrink-0"
            />
            {option.label}
          </label>
        ))}
      </div>
    </Fieldset>
  );
}
