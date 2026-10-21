import type { Page } from "@playwright/test";

/** The /eat pages the interaction and size specs share. Paths are locale-prefixed, query strings included. */
export const EAT_KEY_PAGES = [
  "/en/eat",
  "/en/eat/dishes",
  "/en/eat/stalls",
  "/en/eat/stalls/2-song-phi-nong-noodles?diet=nopork",
  "/en/eat/dishes/4-iced-chinese-tea",
  "/en/eat/map",
  "/en/eat/pick?seed=abc",
  "/en/eat/plan?meal=60",
  "/en/eat/plan?mode=week&budget=400&days=1,2,3,4,5&seed=m4bpdq",
  "/en/eat/plan?mode=group",
  "/en/eat/mine",
  "/en/eat/what-is",
  "/th/eat",
  "/th/eat/dishes",
] as const;

export interface TargetFailure {
  descriptor: string;
  width: number;
  height: number;
}

const INTERACTIVE = [
  "a[href]",
  "button",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "summary",
  '[role="button"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[tabindex="0"]',
].join(", ");

/**
 * Every interactive element inside <main> that is smaller than `min` CSS px in either direction and is
 * not covered by a documented exception:
 *  - a link inside running text (its parent <p> or <li> carries more text than the link);
 *  - a link whose ::after stretches over a positioned card, when that card is at least `min` tall;
 *  - a native input whose label (or wrapping label) is at least `min` in both directions, which is
 *    how the visually hidden chip inputs and the list radios are tapped;
 *  - anything inside `ignore` (a selector; the breadcrumb is checked on its own);
 *  - with `spacing`, the 2.5.8 spacing exception: a 24px circle centred on the target touches no
 *    other target.
 */
export async function findSmallTargets(page: Page, min: number, spacing: boolean, ignore = ""): Promise<TargetFailure[]> {
  return page.evaluate(
    ({ selector, min, spacing, ignore }) => {
      const TOLERANCE = 0.5;
      const main = document.querySelector("main");
      if (!main) return [{ descriptor: "(no <main>)", width: 0, height: 0 }];

      function describe(el: Element): string {
        let out = el.tagName.toLowerCase();
        if (el.id) out += `#${el.id}`;
        const text = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        if (text) out += ` "${text}"`;
        return out;
      }

      function isHidden(el: Element): boolean {
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") return true;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return true;
        return style.clipPath.includes("inset") && el !== document.activeElement;
      }

      const targets = [...main.querySelectorAll<HTMLElement>(selector)].filter((el) => !isHidden(el) && !el.closest("[inert], [aria-hidden='true']") && !(ignore && el.closest(ignore)));
      const boxes = targets.map((el) => ({ el, rect: el.getBoundingClientRect() }));

      function inline(el: Element): boolean {
        if (el.tagName !== "A") return false;
        const parent = el.parentElement;
        if (!parent || (parent.tagName !== "P" && parent.tagName !== "LI")) return false;
        return (parent.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 5;
      }

      function stretched(el: Element): boolean {
        const after = getComputedStyle(el, "::after");
        if (after.content === "none" || after.position !== "absolute") return false;
        let card: Element | null = el.parentElement;
        while (card && getComputedStyle(card).position === "static") card = card.parentElement;
        return card !== null && card.getBoundingClientRect().height + TOLERANCE >= min;
      }

      function labelled(el: Element): boolean {
        if (!(el instanceof HTMLInputElement)) return false;
        const labels = [...(el.labels ?? [])];
        return labels.some((label) => {
          const rect = label.getBoundingClientRect();
          return rect.width + TOLERANCE >= min && rect.height + TOLERANCE >= min;
        });
      }

      function spaced(rect: DOMRect, self: Element): boolean {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const radius = 12;
        return boxes.every(({ el, rect: other }) => {
          if (el === self || el.contains(self) || self.contains(el)) return true;
          const small = other.width + TOLERANCE < min || other.height + TOLERANCE < min;
          if (small) {
            const ox = other.left + other.width / 2;
            const oy = other.top + other.height / 2;
            return Math.hypot(cx - ox, cy - oy) >= radius * 2;
          }
          const nearestX = Math.max(other.left, Math.min(cx, other.right));
          const nearestY = Math.max(other.top, Math.min(cy, other.bottom));
          return Math.hypot(cx - nearestX, cy - nearestY) >= radius;
        });
      }

      const failures: { descriptor: string; width: number; height: number }[] = [];
      for (const { el, rect } of boxes) {
        if (rect.width + TOLERANCE >= min && rect.height + TOLERANCE >= min) continue;
        if (inline(el) || stretched(el) || labelled(el)) continue;
        if (spacing && spaced(rect, el)) continue;
        failures.push({ descriptor: describe(el), width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 });
      }
      return failures;
    },
    { selector: INTERACTIVE, min, spacing, ignore },
  );
}
