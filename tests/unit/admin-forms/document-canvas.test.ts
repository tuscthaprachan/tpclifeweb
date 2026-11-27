// @vitest-environment jsdom
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { DocumentCanvas } from "@/components/admin/content/DocumentCanvas";
import { BilingualTextarea } from "@/components/admin/content/fields";
import { render, step } from "../support/dom";

describe("document error navigation", () => {
  it("opens a folded translation and focuses its field, including repeated links", async () => {
    const view = await render(createElement("form", null,
      createElement("a", { href: "#f-lead-th" }, "Thai lead is missing"),
      createElement(DocumentCanvas, { locale: "en" },
        createElement("details", null,
          createElement("summary", null, "Details"),
          createElement(BilingualTextarea, { name: "lead", label: "Lead" }),
        ),
      ),
    ));
    const link = view.host.querySelector("a")!;
    const field = view.host.querySelector<HTMLTextAreaElement>("#f-lead-th")!;
    const english = view.host.querySelector<HTMLButtonElement>('button[lang="en"]')!;
    const afterPaint = () => step(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    for (let click = 0; click < 2; click++) {
      await step(() => english.click());
      expect(field.closest("[hidden]")).toBeTruthy();
      await step(() => link.click());
      await afterPaint();
      expect(field.closest("[hidden]")).toBeNull();
      expect(view.host.querySelector("details")!.open).toBe(true);
      expect(document.activeElement).toBe(field);
    }
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("opens a folded field without a content language", async () => {
    const view = await render(createElement("form", null,
      createElement("a", { href: "#f-date" }, "Date is missing"),
      createElement(DocumentCanvas, { locale: "en" },
        createElement("details", null,
          createElement("summary", null, "Details"),
          createElement("input", { id: "f-date" }),
        ),
      ),
    ));
    await step(() => view.host.querySelector("a")!.click());
    await step(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    expect(view.host.querySelector("details")!.open).toBe(true);
    expect(document.activeElement).toBe(view.host.querySelector("#f-date"));
    window.history.replaceState(null, "", window.location.pathname);
  });
});
