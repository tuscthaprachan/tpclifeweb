import type { Bilingual } from "../strings";
import { BUDGET } from "../budget/strings";
import { GROUP } from "../group/strings";
import type { PlanMode } from "./mode";

/** The heading and the intro of each planner, which are also the page's title and description. */
export const PLAN_COPY: Record<PlanMode, { title: Bilingual; intro: Bilingual }> = {
  meal: { title: BUDGET.mealTitle, intro: BUDGET.mealIntro },
  week: { title: BUDGET.weekTitle, intro: BUDGET.weekIntro },
  group: { title: GROUP.pageTitle, intro: GROUP.pageIntro },
};
