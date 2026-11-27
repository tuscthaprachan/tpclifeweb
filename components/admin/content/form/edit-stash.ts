/** Posted string values by field name, including the rich text editor’s serialized document. */
export type FormEntries = [string, string][];

let held: { key: string; entries: FormEntries } | null = null;

/** Reads a form's plain values (no files). */
export function formEntries(form: HTMLFormElement): FormEntries {
  const out: FormEntries = [];
  for (const [name, value] of new FormData(form)) if (typeof value === "string") out.push([name, value]);
  return out;
}

/**
 * Keeps what was typed while a save ran, across the reload that follows it
 * (the form remounts with the stored values). One slot, held in memory only.
 */
export function stashEdits(key: string, entries: FormEntries): void {
  held = { key, entries };
}

/** Takes the stashed edits if they belong to `key`; always empties the slot. */
export function takeEdits(key: string): FormEntries | null {
  const mine = held && held.key === key ? held.entries : null;
  held = null;
  return mine;
}

const setNative = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) => {
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

/**
 * Puts stashed values back into the form's text inputs, textareas, selects,
 * checkboxes and radios by name, firing the events React listens for so
 * controlled fields follow. Returns whether anything changed. Fields that no
 * longer exist (a row added during the save) are skipped.
 */
export function restoreEntries(form: HTMLFormElement, entries: FormEntries): boolean {
  const byName = new Map<string, string[]>();
  for (const [name, value] of entries) byName.set(name, [...(byName.get(name) ?? []), value]);
  let changed = false;
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || !element.name || element.disabled) continue;
    if (element instanceof HTMLInputElement && ((element.type === "hidden" && !element.hasAttribute("data-restore-editor")) || element.type === "file" || element.type === "submit" || element.type === "button")) continue;
    const values = byName.get(element.name) ?? [];
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      const should = values.includes(element.value);
      if (element.checked !== should) {
        element.click();
        changed = true;
      }
      continue;
    }
    const wanted = values[0];
    if (wanted !== undefined && element.value !== wanted) {
      setNative(element, wanted);
      changed = true;
    }
  }
  return changed;
}
