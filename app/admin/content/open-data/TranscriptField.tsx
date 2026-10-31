"use client";

import { useContentForm } from "@/components/admin/content/context";
import { Textarea } from "@/components/ui";
import { fieldId } from "@/lib/admin/content/form-state";

/** A plain box for the Markdown text of a transcript. Nothing is formatted, trimmed or corrected on the way in. */
export function TranscriptField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  const { errors } = useContentForm();
  return (
    <Textarea
      id={fieldId(name)}
      name={name}
      label={label}
      error={errors[name]}
      defaultValue={defaultValue}
      rows={28}
      spellCheck={false}
      autoComplete="off"
      className="font-mono"
      wrap="soft"
    />
  );
}
