import type { AdminKey } from "@/lib/i18n/admin";

/** Keys for the small enums that have no public label of their own. Weekdays run 0 (Sunday) to 6. */
export const WEEKDAY_KEY: Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", AdminKey> = {
  "0": "canteenDay0",
  "1": "canteenDay1",
  "2": "canteenDay2",
  "3": "canteenDay3",
  "4": "canteenDay4",
  "5": "canteenDay5",
  "6": "canteenDay6",
};

/** Monday first, as the week reads in Thailand. */
export const WEEKDAY_ORDER = ["1", "2", "3", "4", "5", "6", "0"] as const;

export const COURSE_KEY: Record<"main" | "side" | "drink" | "dessert", AdminKey> = {
  main: "canteenCourseMain",
  side: "canteenCourseSide",
  drink: "canteenCourseDrink",
  dessert: "canteenCourseDessert",
};

export const TEMPERATURE_KEY: Record<"hot" | "cold", AdminKey> = { hot: "canteenTempHot", cold: "canteenTempCold" };

export const SIDE_KEY: Record<"north" | "south" | "east" | "west", AdminKey> = {
  north: "canteenSideNorth",
  south: "canteenSideSouth",
  east: "canteenSideEast",
  west: "canteenSideWest",
};

export const LANDMARK_KEY: Record<"stairs" | "lifts" | "toilets" | "atm" | "lobby", AdminKey> = {
  stairs: "canteenLandmarkStairs",
  lifts: "canteenLandmarkLifts",
  toilets: "canteenLandmarkToilets",
  atm: "canteenLandmarkAtm",
  lobby: "canteenLandmarkLobby",
};
