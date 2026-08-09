import type { Page } from "@playwright/test";

export interface FocusSnapshot {
  step: number;
  tag: string;
  id: string;
  /** Best-effort human-readable description for a failure message. */
  descriptor: string;
  rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  hasVisibleFocusStyle: boolean;
  insideHeader: boolean;
}

/**
 * Presses real Tab key events and records what receives focus after each
 * one, up to `maxSteps` or until focus visibly loops back to an element
 * already seen (whichever comes first). Real key presses rather than
 * querying focusable selectors directly, because 2.4.11 is about what the
 * BROWSER actually does when a reader tabs (it scrolls the focused element
 * into view, respecting `scroll-margin-top`), which only happens on a real
 * focus event.
 *
 * Stops (returns an empty rest of the array) the moment focus leaves the
 * document (falls back to <body>), which is what happens at the end of the
 * tab sequence.
 */
export async function tabThroughFocusable(page: Page, maxSteps = 200): Promise<FocusSnapshot[]> {
  const snapshots: FocusSnapshot[] = [];
  const seen = new Set<string>();

  for (let step = 0; step < maxSteps; step += 1) {
    await page.keyboard.press("Tab");

    const snapshot = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const hasOutline = style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
      const hasBoxShadow = style.boxShadow !== "none" && style.boxShadow.trim().length > 0;

      function describe(node: Element): string {
        let out = node.tagName.toLowerCase();
        if (node.id) out += `#${node.id}`;
        const ariaLabel = node.getAttribute("aria-label");
        const text = (node.textContent ?? "").trim().slice(0, 40);
        if (ariaLabel) out += `[aria-label="${ariaLabel}"]`;
        else if (text) out += ` "${text}"`;
        return out;
      }

      return {
        tag: el.tagName.toLowerCase(),
        id: el.id ?? "",
        descriptor: describe(el),
        rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        hasVisibleFocusStyle: hasOutline || hasBoxShadow,
        insideHeader: el.closest("header") !== null,
      };
    });

    if (!snapshot) break;

    // A stable identity for loop detection: descriptor plus position. Two
    // genuinely different elements only collide here if they render
    // identical text at the identical position, which does not happen on a
    // real page.
    const identity = `${snapshot.descriptor}@${snapshot.rect.top},${snapshot.rect.left}`;
    if (seen.has(identity)) break;
    seen.add(identity);

    snapshots.push({ step, ...snapshot });
  }

  return snapshots;
}
