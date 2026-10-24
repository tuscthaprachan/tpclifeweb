/**
 * Encryption bindings (AAD) for the values the public journeys store. A
 * ciphertext copied to another row or column then fails to decrypt. The staff
 * side reads these with the same strings.
 */

/** `lost_found_identifying_details.detail_enc`: what only the owner of a lost item would know. */
export const identifyingDetailAad = (rowId: string) => `lost_found_identifying_details:detail:${rowId}`;

/** `lost_found_claims.answer_enc`: the claimant's answer about the found item. */
export const claimAnswerAad = (rowId: string) => `lost_found_claims:answer:${rowId}`;
