import type { AdminKey } from "@/lib/i18n/admin";
import type { CasePreferredContact } from "@/lib/db/schema/cases";
import type { ReminderReason } from "@/lib/lost-found/notify";

/** What happened when the person was told (possible match, ready to collect, returned). */
export interface LfNotice {
  result: "sent" | "remind";
  reason?: ReminderReason;
  preferred?: CasePreferredContact | null;
}

/** The submitted text fields, returned with a problem so the inputs keep what was typed. */
export type LfValues = Record<string, string>;

/**
 * What every lost and found form returns, one case at a time. `invalid` carries
 * the problems keyed by posted field name, `failed` one message for the whole
 * form, `secret` a decrypted field for this response only.
 */
export type LfState =
  | { status: "idle" }
  | { status: "saved"; saved: AdminKey; notice?: LfNotice }
  | { status: "invalid"; errors: Record<string, string>; values?: LfValues }
  | { status: "failed"; error: string; values?: LfValues }
  | { status: "secret"; secret: string };

/** The state before anything was submitted. */
export const LF_IDLE: LfState = { status: "idle" };

export const lfSaved = (saved: AdminKey, notice?: LfNotice): LfState => ({ status: "saved", saved, ...(notice ? { notice } : {}) });
export const lfInvalid = (errors: Record<string, string>): LfState => ({ status: "invalid", errors });
export const lfFailed = (error: string): LfState => ({ status: "failed", error });
export const lfSecret = (secret: string): LfState => ({ status: "secret", secret });

/** The field problems of a state, or none. */
export function lfErrors(state: LfState): Record<string, string> {
  return state.status === "invalid" ? state.errors : {};
}

/** The values to put back in the inputs after a problem, if there was one. */
export function lfValues(state: LfState): LfValues | undefined {
  return state.status === "invalid" || state.status === "failed" ? state.values : undefined;
}
