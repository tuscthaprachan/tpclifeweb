// @vitest-environment jsdom
import { createElement, type ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { ContentFormProvider } from "@/components/admin/content/context";
import { SectionDisclosure } from "@/components/admin/content/SectionDisclosure";
import { render } from "../support/dom";

const section = (errors: Record<string, string>, props: { defaultOpen?: boolean } = {}) =>
  createElement(
    ContentFormProvider,
    { value: { locale: "en", errors, pending: false, markDirty: () => {} } },
    createElement(SectionDisclosure, { id: "tds-heat", summary: "Heat", errorPrefixes: ["heatAdvice."], ...props } as unknown as ComponentProps<typeof SectionDisclosure>, createElement("input", { id: "f-heat", name: "heatAdvice.normal.th" })),
  );

const details = (host: HTMLElement) => host.querySelector("details")!;

describe("SectionDisclosure", () => {
  it("is closed unless asked to be open", async () => {
    expect(details((await render(section({}))).host).open).toBe(false);
    expect(details((await render(section({}, { defaultOpen: true }))).host).open).toBe(true);
  });

  it("opens for an error in its own fields and not for one elsewhere", async () => {
    expect(details((await render(section({ "heatAdvice.normal.th": "Required" }))).host).open).toBe(true);
    expect(details((await render(section({ "rows.shuttle.position": "Taken" }))).host).open).toBe(false);
  });

  it("opens when an error arrives after the first render", async () => {
    const view = await render(section({}));
    expect(details(view.host).open).toBe(false);
    await view.rerender(section({ "heatAdvice.normal.th": "Required" }));
    expect(details(view.host).open).toBe(true);
  });

  it("keeps its fields in the document while closed, so they still post", async () => {
    const view = await render(section({}));
    expect(view.host.querySelector('input[name="heatAdvice.normal.th"]')).not.toBeNull();
  });
});
