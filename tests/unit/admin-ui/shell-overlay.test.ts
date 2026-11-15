import { describe, expect, it } from "vitest";
import { shellOverlayReducer, type ShellOverlay, type ShellOverlayEvent } from "@/components/admin/shell/shell-overlay";

const run = (start: ShellOverlay, ...events: ShellOverlayEvent[]) => events.reduce(shellOverlayReducer, start);

describe("shell overlay", () => {
  it("opens one overlay from none", () => {
    expect(run("none", { type: "open", overlay: "palette" })).toBe("palette");
    expect(run("none", { type: "open", overlay: "drawer" })).toBe("drawer");
  });

  it("does not stack the palette behind the help dialog", () => {
    expect(run("help", { type: "open", overlay: "palette" })).toBe("help");
  });

  it("does not open the drawer behind the help dialog", () => {
    expect(run("help", { type: "open", overlay: "drawer" })).toBe("help");
  });

  it("replaces the drawer with the palette and the palette with help", () => {
    expect(run("drawer", { type: "open", overlay: "palette" })).toBe("palette");
    expect(run("palette", { type: "open", overlay: "help" })).toBe("help");
  });

  it("closes only the overlay that is open", () => {
    expect(run("palette", { type: "close", overlay: "help" })).toBe("palette");
    expect(run("palette", { type: "close", overlay: "palette" })).toBe("none");
  });

  it("lets the palette hand over to help when an action closes it first", () => {
    expect(run("palette", { type: "close", overlay: "palette" }, { type: "open", overlay: "help" })).toBe("help");
  });

  it("ignores the help dialog's late close after it was replaced", () => {
    expect(run("none", { type: "open", overlay: "help" }, { type: "close", overlay: "help" }, { type: "open", overlay: "palette" }, { type: "close", overlay: "help" })).toBe("palette");
  });

  it("closes everything", () => {
    expect(run("help", { type: "closeAll" })).toBe("none");
  });
});
