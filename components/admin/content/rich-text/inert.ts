/**
 * Makes everything outside `keep` inert: for each ancestor of `keep`, its other
 * children. Native dialogs and elements marked `data-inert-exempt` (popups
 * portalled to the body) stay live. Returns a function that undoes only what
 * this call changed.
 */
export function inertOthers(keep: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  for (let node: HTMLElement | null = keep; node && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.tagName === "DIALOG" || sibling.hasAttribute("data-inert-exempt") || sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
  }
  return () => {
    for (const el of changed) el.removeAttribute("inert");
  };
}
