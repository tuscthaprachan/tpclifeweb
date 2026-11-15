import type { CsvImportState } from "@/app/admin/content/open-data/actions";

/** The typed fields worth keeping when an import is refused. The file input cannot be kept. */
export interface ImportValues {
  owner: string;
  sourceDocument: string;
}

type Failure = NonNullable<CsvImportState["failure"]>;
type Done = NonNullable<CsvImportState["done"]>;

/** What the import form shows: exactly one of these at a time. */
export type ImportView =
  | { status: "idle" }
  | { status: "error"; message: string; values: ImportValues }
  | { status: "failure"; failure: Failure; values: ImportValues }
  | { status: "done"; done: Done };

/** The start state, before anything was submitted. */
export const IMPORT_IDLE: ImportView = { status: "idle" };

/** Reads the two typed fields from a submission. */
export function importValues(formData: FormData): ImportValues {
  const read = (key: keyof ImportValues) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return { owner: read("owner"), sourceDocument: read("sourceDocument") };
}

/**
 * Turns the action's loose result into one view. A problem wins over a
 * success, so a stale `done` can never sit beside an error; a refusal keeps
 * the typed fields, a successful import clears them.
 */
export function importView(result: CsvImportState, values: ImportValues): ImportView {
  if (result.error) return { status: "error", message: result.error, values };
  if (result.failure) return { status: "failure", failure: result.failure, values };
  if (result.done) return { status: "done", done: result.done };
  return IMPORT_IDLE;
}
