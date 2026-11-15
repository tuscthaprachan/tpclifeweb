/** The redirect form's text fields, as typed. */
export interface RedirectValues {
  from: string;
  to: string;
  status: string;
}

/** Reads the fields back out of a submission so the inputs keep them after a validation error. */
export function redirectValues(formData: FormData): RedirectValues {
  const read = (key: keyof RedirectValues) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return { from: read("from"), to: read("to"), status: read("status") };
}
