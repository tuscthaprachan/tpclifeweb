import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Every enum the content tables use. The TypeScript arrays are the single
 * source for the Postgres enums, for Zod schemas in the admin forms, and for
 * the drift test in tests/unit/db/content-schema.test.ts. Values match the
 * unions that lib/content/types.ts defined, so pages keep compiling unchanged.
 */

/** draft = waiting for approval or not yet live; published = visible on the public site. */
export const CONTENT_STATUSES = ["draft", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export const contentStatusEnum = pgEnum("content_status", CONTENT_STATUSES);

export const CATEGORIES = ["transport", "welfare", "activity", "governance"] as const;
export const categoryEnum = pgEnum("content_category", CATEGORIES);

export const OWNERS = ["tusu", "tusc", "university", "joint"] as const;
export const ownerEnum = pgEnum("content_owner", OWNERS);

export const SERVICE_PHASES = ["alpha", "beta", "live"] as const;
export const servicePhaseEnum = pgEnum("service_phase", SERVICE_PHASES);

/**
 * Declared least to most severe, so `order by severity desc` puts critical
 * first. (Sorting the strings would put "warning" above "critical".)
 */
export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export const alertSeverityEnum = pgEnum("alert_severity", ALERT_SEVERITIES);

export const ALERT_SURFACES = ["shuttle", "campus", "forms", "sitewide"] as const;
export const alertSurfaceEnum = pgEnum("alert_surface", ALERT_SURFACES);

export const FORM_DESTINATIONS = ["googleForm", "externalSite", "email", "inPerson", "line"] as const;
export const formDestinationEnum = pgEnum("form_destination", FORM_DESTINATIONS);

export const SIGN_IN_TYPES = ["google", "tuAccount", "other"] as const;
export const signInTypeEnum = pgEnum("form_sign_in_type", SIGN_IN_TYPES);

export const POLICY_STATUSES = ["notStarted", "inProgress", "delivered", "blocked", "dropped"] as const;
export const policyStatusEnum = pgEnum("policy_status", POLICY_STATUSES);

export const CONTENT_PAGE_KINDS = ["welfare", "guide"] as const;
export const contentPageKindEnum = pgEnum("content_page_kind", CONTENT_PAGE_KINDS);

export const DIRECTORY_ORGANISATION_TYPES = [
  "facultyCommittee",
  "club",
  "independentGroup",
  "universityDivision",
  "studentBody",
] as const;
export const directoryOrganisationTypeEnum = pgEnum("directory_organisation_type", DIRECTORY_ORGANISATION_TYPES);

/* Lost and found */

export const LOST_FOUND_KINDS = ["lost", "found"] as const;
export const lostFoundKindEnum = pgEnum("lost_found_kind", LOST_FOUND_KINDS);

export const LOST_FOUND_STATUSES = ["open", "matched", "returned", "unclaimed", "withdrawn"] as const;
export const lostFoundStatusEnum = pgEnum("lost_found_status", LOST_FOUND_STATUSES);

export const LOST_FOUND_CATEGORIES = [
  "idCard",
  "bankCard",
  "keys",
  "wallet",
  "phone",
  "laptop",
  "bag",
  "clothing",
  "book",
  "stationery",
  "jewellery",
  "eyewear",
  "umbrella",
  "waterBottle",
  "other",
] as const;
export const lostFoundCategoryEnum = pgEnum("lost_found_category", LOST_FOUND_CATEGORIES);

/* Canteen */

export const CANTEEN_CUISINES = [
  "thaiRice",
  "madeToOrder",
  "noodles",
  "isan",
  "chickenRice",
  "curryOverRice",
  "muslim",
  "international",
  "drinks",
  "desserts",
  "fruit",
] as const;
export const canteenCuisineEnum = pgEnum("canteen_cuisine", CANTEEN_CUISINES);

export const DISH_TYPES = [
  "rice",
  "noodles",
  "soup",
  "curryOverRice",
  "madeToOrder",
  "singlePlate",
  "snack",
  "drink",
  "dessert",
] as const;
export const dishTypeEnum = pgEnum("dish_type", DISH_TYPES);

export const DISH_COURSES = ["main", "side", "drink", "dessert"] as const;
export const dishCourseEnum = pgEnum("dish_course", DISH_COURSES);

export const PROTEINS = ["pork", "chicken", "beef", "seafood", "fish", "egg", "tofu", "none"] as const;
export const proteinEnum = pgEnum("dish_protein", PROTEINS);

export const ALLERGENS = [
  "peanut",
  "treeNut",
  "milk",
  "egg",
  "wheat",
  "soy",
  "sesame",
  "fish",
  "shellfish",
] as const;
export const allergenEnum = pgEnum("dish_allergen", ALLERGENS);

export const COOKING_STYLES = ["stirFried", "deepFried", "boiled", "grilled", "steamed", "salad", "curry"] as const;
export const cookingStyleEnum = pgEnum("cooking_style", COOKING_STYLES);

export const TEMPERATURES = ["hot", "cold"] as const;
export const temperatureEnum = pgEnum("dish_temperature", TEMPERATURES);

export const FLOOR_SIDES = ["north", "south", "east", "west"] as const;
export const floorSideEnum = pgEnum("floor_side", FLOOR_SIDES);

export const MAP_SHAPES = ["rect", "triangleBottomRight", "triangleBottomLeft"] as const;
export const mapShapeEnum = pgEnum("map_shape", MAP_SHAPES);
