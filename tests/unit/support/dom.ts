import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; host: HTMLElement }[] = [];

afterEach(() => {
  for (const { root, host } of mounted.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
});

export interface Rendered {
  host: HTMLElement;
  rerender: (element: ReactElement) => Promise<void>;
  unmount: () => void;
}

/** Mounts `element` into a fresh container in `document.body`; unmounted after each test. Needs `// @vitest-environment jsdom`. */
export async function render(element: ReactElement): Promise<Rendered> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const entry = { root, host };
  mounted.push(entry);
  await act(async () => root.render(element));
  return {
    host,
    rerender: async (next) => {
      await act(async () => root.render(next));
    },
    unmount: () => {
      const i = mounted.indexOf(entry);
      if (i >= 0) mounted.splice(i, 1);
      act(() => root.unmount());
      host.remove();
    },
  };
}

export interface RenderedHook<R, P> {
  /** The latest value the hook returned. */
  readonly current: R;
  rerender: (props: P) => Promise<void>;
  unmount: () => void;
}

/** Runs `hook` inside a component and exposes its latest return value. */
export async function renderHook<R, P = undefined>(hook: (props: P) => R, initialProps?: P): Promise<RenderedHook<R, P>> {
  const box: { value: R | undefined } = { value: undefined };
  function Probe({ props }: { props: P }) {
    box.value = hook(props);
    return null;
  }
  const view = await render(createElement(Probe, { props: initialProps as P }));
  return {
    get current() {
      return box.value as R;
    },
    rerender: (props) => view.rerender(createElement(Probe, { props })),
    unmount: view.unmount,
  };
}

/** Runs `fn` inside `act`, flushing effects and state updates it causes. */
export async function step<T>(fn: () => T | Promise<T>): Promise<T> {
  let result: T;
  await act(async () => {
    result = await fn();
  });
  return result!;
}

/** Replaces `navigator.clipboard.writeText`; returns the texts written. Pass `fail` to make it reject. */
export function stubClipboard(fail = false): string[] {
  const written: string[] = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        if (fail) throw new Error("denied");
        written.push(text);
      },
    },
  });
  return written;
}
