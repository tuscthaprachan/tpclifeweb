"use client";

import type { ReactNode } from "react";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";

/** A file chooser for a content form. The error shows beneath it and the error summary links to it. */
export function FileField({ name, label, hint, accept, current }: { name: string; label: string; hint?: ReactNode; accept: string; current?: ReactNode }) {
  const { errors } = useContentForm();
  const id = fieldId(name);
  const error = errors[name];
  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="m-0 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {current}
      <input id={id} name={name} type="file" accept={accept} aria-describedby={hint ? `${id}-hint` : undefined} aria-invalid={error ? true : undefined} />
      {error ? <p className="m-0 text-base font-medium text-error">{error}</p> : null}
    </div>
  );
}
