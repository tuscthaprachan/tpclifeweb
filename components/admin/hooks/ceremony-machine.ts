/** A passkey ceremony: waiting, running, failed with a message key, or finished. `done` stays disabled while the page navigates away. */
export type CeremonyState<K extends string = string> = { status: "idle" } | { status: "busy" } | { status: "failed"; key: K } | { status: "done" };

export type CeremonyEvent<K extends string = string> = { type: "start" } | { type: "succeeded" } | { type: "failed"; key: K } | { type: "reset" };

export function initialCeremony<K extends string = string>(): CeremonyState<K> {
  return { status: "idle" };
}

/** `start` only leaves idle or failed, so a second click while busy or done does nothing; `reset` clears a failure only. */
export function ceremonyReducer<K extends string = string>(state: CeremonyState<K>, event: CeremonyEvent<K>): CeremonyState<K> {
  switch (event.type) {
    case "start":
      return state.status === "idle" || state.status === "failed" ? { status: "busy" } : state;
    case "succeeded":
      return state.status === "busy" ? { status: "done" } : state;
    case "failed":
      return state.status === "busy" ? { status: "failed", key: event.key } : state;
    case "reset":
      return state.status === "failed" ? { status: "idle" } : state;
  }
}

/** The button stays disabled while running and after success. */
export function ceremonyLocked(state: CeremonyState): boolean {
  return state.status === "busy" || state.status === "done";
}

export type CeremonyOutcome<K extends string = string> = { ok: true } | { ok: false; key: K };
