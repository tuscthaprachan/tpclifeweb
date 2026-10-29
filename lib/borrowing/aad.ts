/**
 * Encryption bindings (AAD) for the values the borrowing service stores. A
 * ciphertext copied to another row or column then fails to decrypt.
 */

export type BorrowingRequestColumn = "student_id" | "affiliation";

/** `borrowing_requests.<column>_enc`, bound to the case. */
export const requestAad = (caseId: string, column: BorrowingRequestColumn) => `borrowing_requests:${column}:${caseId}`;

/** `borrowing_journeys.data_enc`, bound to the row. */
export const journeyAad = (rowId: string) => `borrowing_journeys:data:${rowId}`;
