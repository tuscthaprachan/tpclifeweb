/**
 * Plain constants shared by the database schema, the server code and the
 * client forms. No imports, so a client component can use them without
 * pulling in the database layer.
 */

/** How a person collecting an item was checked. A type only: no ID number is ever stored. */
export const ID_CHECK_TYPES = ["student_card", "national_id", "passport", "driving_licence", "other_photo_id"] as const;
export type IdCheckType = (typeof ID_CHECK_TYPES)[number];
