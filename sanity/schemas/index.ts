import type { SchemaTypeDefinition } from "sanity";

import { externalLink } from "./objects/externalLink";
import { formPrerequisite } from "./objects/formPrerequisite";
import { helpContact } from "./objects/helpContact";
import { siteImage } from "./objects/siteImage";
import { localeBlock, localeString, localeText } from "./objects/locale";
import { navItem } from "./objects/navItem";
import { openingHours } from "./objects/openingHours";
import { organisationContact } from "./objects/organisationContact";
import {
  bodyPortableText,
  calloutBox,
  contactBlock,
  formCallout,
  linkOut,
  stepList,
} from "./objects/portableText";
import { policyUpdate } from "./objects/policyUpdate";
import { serviceCalendar } from "./objects/serviceCalendar";
import { shuttleStop } from "./objects/shuttleStop";

import { canonicalDish } from "./documents/canonicalDish";
import { canteenDish } from "./documents/canteenDish";
import { canteenSettings } from "./documents/canteenSettings";
import { canteenStall } from "./documents/canteenStall";
import { event } from "./documents/event";
import { faq } from "./documents/faq";
import { form } from "./documents/form";
import { guidePage } from "./documents/guidePage";
import { lostFoundItem } from "./documents/lostFoundItem";
import { newsPost } from "./documents/newsPost";
import { organisation } from "./documents/organisation";
import { place } from "./documents/place";
import { policy } from "./documents/policy";
import { serviceAlert } from "./documents/serviceAlert";
import { shuttleRoute } from "./documents/shuttleRoute";
import { siteSettings } from "./documents/siteSettings";
import { welfarePage } from "./documents/welfarePage";

/**
 * Every schema type registered with the Studio. Object types are listed
 * before the document types that use them, though registration order does
 * not actually matter to Sanity, it only makes this list easier to read.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  // Bilingual field types
  localeString,
  localeText,
  localeBlock,

  // Shared small objects
  siteImage,
  navItem,
  externalLink,
  helpContact,
  shuttleStop,
  serviceCalendar,
  formPrerequisite,
  policyUpdate,
  organisationContact,
  openingHours,

  // Portable Text and its custom object types
  bodyPortableText,
  formCallout,
  linkOut,
  calloutBox,
  stepList,
  contactBlock,

  // Documents
  siteSettings,
  serviceAlert,
  shuttleRoute,
  form,
  newsPost,
  event,
  policy,
  welfarePage,
  guidePage,
  faq,
  organisation,
  place,
  lostFoundItem,

  // Canteen ("What to eat")
  canteenSettings,
  canteenStall,
  canonicalDish,
  canteenDish,
];
