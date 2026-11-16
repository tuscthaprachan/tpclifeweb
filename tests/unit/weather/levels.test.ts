import { describe, expect, it } from "vitest";
import { heatIndexC, heatLevel, pm25Level } from "@/lib/weather/levels";

describe("heatIndexC", () => {
  it("matches the National Weather Service table", () => {
    expect(heatIndexC(32.2, 70)).toBeCloseTo(41.1, 0);
    expect(heatIndexC(30, 50)).toBeCloseTo(31.1, 0);
    expect(heatIndexC(35, 60)).toBeCloseTo(45.1, 0);
  });

  it("uses the simple formula in mild conditions", () => {
    expect(heatIndexC(20, 50)).toBeCloseTo(19.4, 0);
  });
});

describe("levels", () => {
  it("bands the heat index on the Department of Health scale", () => {
    expect([26.9, 27, 32.9, 33, 41.9, 42, 52].map(heatLevel)).toEqual(["normal", "watch", "watch", "warning", "warning", "danger", "extremeDanger"]);
  });

  it("bands PM2.5 on the Pollution Control Department scale", () => {
    expect([15, 15.1, 25, 25.1, 37.5, 37.6, 75, 75.1].map(pm25Level)).toEqual([
      "veryGood",
      "good",
      "good",
      "moderate",
      "moderate",
      "startingToAffect",
      "startingToAffect",
      "affectsHealth",
    ]);
  });
});
