/**
 * Refusals specific to borrowing. Engine refusals stay `CaseError`. The
 * `code` is stable; the message is for logs, not for people. `unavailable`
 * carries the lines that no longer fit, so a page can say which.
 */

import type { LineShortfall } from "./availability";
import type { LineProblem, PeriodProblem } from "./rules";

export type BorrowingErrorCode = "invalid_period" | "invalid_lines" | "unavailable" | "invalid";

export class BorrowingError extends Error {
  constructor(
    readonly code: BorrowingErrorCode,
    message: string,
    readonly detail: { period?: PeriodProblem[]; lines?: LineProblem[]; shortfalls?: LineShortfall[] } = {},
  ) {
    super(message);
    this.name = "BorrowingError";
  }
}
