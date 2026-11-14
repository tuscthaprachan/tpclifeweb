/**
 * The room above and below an anchor that a menu can use: the visual viewport
 * (so the on-screen keyboard counts), less the sticky top bar and any action
 * bar pinned to the bottom.
 */
export function freeSpace(anchor: { top: number; bottom: number }): { above: number; below: number } {
  const viewport = window.visualViewport;
  const viewTop = viewport?.offsetTop ?? 0;
  const viewBottom = viewTop + (viewport?.height ?? window.innerHeight);
  const topbar = document.querySelector(".console-topbar")?.getBoundingClientRect();
  const bar = document.querySelector(".console-actionbar")?.getBoundingClientRect();
  const floor = bar && bar.top > anchor.bottom ? Math.min(viewBottom, bar.top) : viewBottom;
  const ceiling = topbar ? Math.max(viewTop, topbar.bottom) : viewTop;
  return { above: anchor.top - ceiling - 8, below: floor - anchor.bottom - 8 };
}
