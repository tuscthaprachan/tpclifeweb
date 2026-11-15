import { useEffect } from "react";

interface Lock {
  count: number;
  saved: string;
}

const locks = new WeakMap<{ style: { overflow: string } }, Lock>();

/**
 * Stops the page scrolling. Locks are counted per element, so the sidebar
 * drawer, the command palette and the editor's full screen can overlap: the
 * original `overflow` comes back only when the last one is released. The
 * returned function releases this lock once.
 */
export function lockScroll(target: { style: { overflow: string } } = document.documentElement): () => void {
  let lock = locks.get(target);
  if (!lock) {
    lock = { count: 0, saved: target.style.overflow };
    locks.set(target, lock);
  }
  if (lock.count === 0) lock.saved = target.style.overflow;
  lock.count++;
  target.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.count--;
    if (lock.count === 0) target.style.overflow = lock.saved;
  };
}

/** Holds a scroll lock while `active` is true. */
export function useScrollLock(active: boolean): void {
  useEffect(() => (active ? lockScroll() : undefined), [active]);
}
