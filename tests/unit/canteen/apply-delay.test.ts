import { describe, expect, it } from "vitest";

import { KEYBOARD_DELAY_MS, TYPING_DELAY_MS, filterApplyDelay } from "@/lib/canteen/apply-delay";

describe("filterApplyDelay", () => {
  it("debounces typing", () => {
    expect(filterApplyDelay({ control: "text" })).toBe(TYPING_DELAY_MS);
  });

  it("waits on keyboard changes to radios and selects, but not pointer ones", () => {
    expect(filterApplyDelay({ control: "radio", pointer: false })).toBe(KEYBOARD_DELAY_MS);
    expect(filterApplyDelay({ control: "select", pointer: false })).toBe(KEYBOARD_DELAY_MS);
    expect(filterApplyDelay({ control: "radio", pointer: true })).toBeNull();
    expect(filterApplyDelay({ control: "select", pointer: true })).toBeNull();
  });

  it("applies checkboxes and everything else at once", () => {
    expect(filterApplyDelay({ control: "other" })).toBeNull();
  });
});
