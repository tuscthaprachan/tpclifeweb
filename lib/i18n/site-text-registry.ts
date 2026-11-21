/**
 * Loads every module that wraps text with editableStrings, so the console's
 * Site text editor can list them all. Each area keeps its own list of imports
 * in lib/i18n/site-text-parts/. Import this only from the console.
 */

import "./strings";
import "./site-text-parts/pages";
import "./site-text-parts/domain";
import "./site-text-parts/canteen";

export { editableDictionaries } from "./editable";
