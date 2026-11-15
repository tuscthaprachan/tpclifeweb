import type { CsvImportState } from "@/app/admin/content/open-data/actions";

/** The typed fields worth keeping when an import is refused. The file input cannot be kept. */
export interface ImportValues {
  owner: string;
  sourceDocument: string;
}

/** What the import form shows: exactly one of these at a time. A refusal keeps the typed fields, a successful import clears them. */
export type ImportView =
  | { status: "idle" }
  | Extract<CsvImportState, { status: "done" }>
  | (Extract<CsvImportState, { status: "error" | "failure" }> & { values: ImportValues });

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

/** Pairs the action's result with the typed fields it should keep. */
export function importView(result: CsvImportState, values: ImportValues): ImportView {
  return result.status === "done" ? result : { ...result, values };
}
