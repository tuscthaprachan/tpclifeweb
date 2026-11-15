import type { BlockContext } from "./BlockCard";
import type { SlashBridge, SlashItem } from "./slash";

export interface Shortcuts {
  link: () => void;
  find: () => void;
  fullscreen: () => void;
}

/**
 * What the editor's extensions, node views and menus call into while the
 * editor is running: they are created once, so they read the latest handlers
 * from here at event time instead of closing over a render's state.
 */
export class EditorBridge {
  ctx: BlockContext | null = null;
  slash: SlashBridge | null = null;
  keys: Shortcuts = { link: () => {}, find: () => {}, fullscreen: () => {} };
  items: (query: string) => SlashItem[] = () => [];
  onFile: (file: File, pos: number | null) => void = () => {};

  private listeners = new Set<() => void>();

  /** For `useSyncExternalStore`: called when `ctx` is replaced. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** For `useSyncExternalStore`: the current context. */
  getCtx = (): BlockContext | null => this.ctx;

  update(patch: Partial<Pick<EditorBridge, "ctx" | "slash" | "keys" | "items" | "onFile">>) {
    Object.assign(this, patch);
    if ("ctx" in patch) for (const listener of [...this.listeners]) listener();
  }
}
