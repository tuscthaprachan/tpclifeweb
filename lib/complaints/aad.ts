/**
 * Encryption bindings (AAD) for the values the complaints service stores. A
 * ciphertext copied to another row or column then fails to decrypt.
 */

export type ComplaintTextColumn = "description" | "when" | "where" | "remedy" | "reopen_reason";

/** `complaint_cases.<column>_enc`, bound to the case. */
export const complaintTextAad = (caseId: string, column: ComplaintTextColumn) => `complaint_cases:${column}:${caseId}`;

/** `complaint_evidence.name_enc` and `complaint_journey_files.name_enc`, bound to the row. */
export const evidenceNameAad = (rowId: string) => `complaint_evidence:name:${rowId}`;
export const journeyFileNameAad = (rowId: string) => `complaint_journey_files:name:${rowId}`;

/** `complaint_surveys.comment_enc`, bound to the row. */
export const surveyCommentAad = (rowId: string) => `complaint_surveys:comment:${rowId}`;

/** `complaint_journeys.data_enc`, bound to the row. */
export const journeyAad = (rowId: string) => `complaint_journeys:data:${rowId}`;
