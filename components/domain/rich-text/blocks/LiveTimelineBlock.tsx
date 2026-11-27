"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Heading, StatusTag } from "@/components/ui";
import type { StatusTone } from "@/components/ui/StatusTag";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey, formatDate, formatDuration, formatTime, formatWeekday } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { LiveTimelineAttrs, LiveTimelineItem } from "@/lib/rich-text/schema";

const TICK_MS = 15_000;
const HOUR = 3_600_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, TICK_MS);
  const onVisible = () => document.visibilityState === "visible" && onChange();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
const clientNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const serverNow = () => null;
const subscribePreview = () => () => {};

type Stage = LiveTimelineItem & { key: number; s: number; e: number };
type State = "done" | "now" | "next" | "later";

const TAG: Partial<Record<State, { tone: StatusTone; label: "tlDone" | "tlNow" | "tlNext" }>> = {
  done: { tone: "neutral", label: "tlDone" },
  now: { tone: "warning", label: "tlNow" },
  next: { tone: "info", label: "tlNext" },
};

const BAR: Record<State, string> = {
  done: "bg-line-strong",
  now: "bg-warning",
  next: "bg-action",
  later: "bg-action opacity-60",
};

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
const minutesBetween = (a: number, b: number) => Math.max(1, Math.ceil((b - a) / 60_000));

function stateOf(stage: Stage, now: number | null, nextKey: number | undefined): State | null {
  if (now === null) return null;
  if (now >= stage.e) return "done";
  if (now >= stage.s) return "now";
  return stage.key === nextKey ? "next" : "later";
}

function lanesFor(stages: Stage[]): Map<number, number> {
  const ends: number[] = [];
  const lane = new Map<number, number>();
  for (const st of stages) {
    let i = ends.findIndex((end) => end <= st.s);
    if (i < 0) i = ends.push(0) - 1;
    ends[i] = st.e;
    lane.set(st.key, i);
  }
  return lane;
}

/**
 * A schedule that follows the clock: the stage happening now is marked and
 * counted down, the next one is counted down to, and each day is drawn on a
 * track with a "now" line. The server renders the plain schedule; the live
 * state appears once the page runs in the browser, so it is never stale in
 * a cached page.
 */
export function LiveTimelineBlock({ attrs, locale, headingLevel, preview }: { attrs: LiveTimelineAttrs; locale: Locale; headingLevel: HeadingLevel; preview?: boolean }) {
  const now = useSyncExternalStore(preview ? subscribePreview : subscribe, preview ? serverNow : clientNow, serverNow);

  const stages = useMemo<Stage[]>(
    () =>
      (attrs?.items ?? [])
        .map((it, key) => ({ ...it, key, s: Date.parse(it.startsAt), e: Date.parse(it.endsAt) }))
        .filter((st) => Number.isFinite(st.s) && Number.isFinite(st.e) && st.e > st.s)
        .sort((x, y) => x.s - y.s || x.e - y.e),
    [attrs],
  );

  const days = useMemo(() => {
    const map = new Map<string, Stage[]>();
    for (const st of stages) {
      const day = bangkokDateKey(new Date(st.s));
      map.set(day, [...(map.get(day) ?? []), st]);
    }
    return [...map.entries()].map(([day, list]) => {
      const from = Math.floor(Math.min(...list.map((x) => x.s)) / HOUR) * HOUR;
      const to = Math.ceil(Math.max(...list.map((x) => x.e)) / HOUR) * HOUR;
      return { day, list, from, to, lanes: lanesFor(list) };
    });
  }, [stages]);

  if (stages.length === 0) return null;

  const title = attrs.title ? pick(attrs.title, locale) : "";
  const current = now === null ? [] : stages.filter((st) => now >= st.s && now < st.e);
  const next = now === null ? undefined : stages.find((st) => st.s > now);
  const today = now === null ? null : bangkokDateKey(new Date(now));
  const at = (ms: number) => {
    const time = formatTime(new Date(ms), locale);
    return today !== null && bangkokDateKey(new Date(ms)) !== today ? `${formatWeekday(new Date(ms), locale, "short")} ${formatDate(new Date(ms), locale)} ${time}` : time;
  };
  const range = (st: Stage) => fill(UI.tlSpan[locale], { from: formatTime(new Date(st.s), locale), to: formatTime(new Date(st.e), locale) });
  const first = stages[0]!;
  const last = stages.reduce((m, st) => (st.e > m.e ? st : m), first);
  const announce = now === null ? "" : current.length > 0 ? current.map((st) => pick(st.label, locale)).join(", ") : next ? `${UI.tlNext[locale]}: ${pick(next.label, locale)}` : UI.tlAllDone[locale];

  return (
    <section className="my-[var(--space-5)] flex flex-col gap-[var(--space-4)] rounded-panel border border-line-strong p-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-1)]">
        {title ? (
          <Heading level={headingLevel} className="m-0">
            {title}
          </Heading>
        ) : null}
        <p className="m-0 flex items-center gap-[var(--space-2)] text-sm text-ink-600">
          <span aria-hidden className={now === null ? "inline-block size-2 rounded-pill bg-line-strong" : "inline-block size-2 animate-pulse rounded-pill bg-error motion-reduce:animate-none"} />
          {now === null
            ? fill(UI.tlSpan[locale], { from: `${formatWeekday(new Date(first.s), locale, "short")} ${formatDate(new Date(first.s), locale)} ${formatTime(new Date(first.s), locale)}`, to: formatTime(new Date(last.e), locale) })
            : UI.tlLive[locale]}
        </p>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>

      {now !== null ? (
        <div className="flex flex-col gap-[var(--space-3)]">
          {current.map((st) => {
            const percent = Math.round(((now - st.s) / (st.e - st.s)) * 100);
            return (
              <div key={st.key} className="flex flex-col gap-[var(--space-2)] rounded-panel bg-surface-sunk p-[var(--space-3)]">
                <StatusTag tone="warning" label={UI.tlNow[locale]} className="self-start" />
                <p className="m-0 text-lg font-bold text-ink-900">{pick(st.label, locale)}</p>
                <p className="m-0 font-semibold tabular-nums">{fill(UI.tlUntil[locale], { time: formatTime(new Date(st.e), locale), left: formatDuration(minutesBetween(now, st.e), locale) })}</p>
                {st.detail ? <p className="m-0 text-ink-600">{pick(st.detail, locale)}</p> : null}
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-valuetext={fill(UI.tlProgress[locale], { percent: String(percent) })}
                  aria-label={pick(st.label, locale)}
                  className="h-2 overflow-hidden rounded-pill bg-surface"
                >
                  <div className="h-full rounded-pill bg-warning" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
          {current.length === 0 && next && now >= first.s ? <p className="m-0 font-semibold text-ink-900">{UI.tlQuiet[locale]}</p> : null}
          {next ? (
            <div className="flex flex-wrap items-baseline gap-x-[var(--space-2)] gap-y-[var(--space-1)]">
              <StatusTag tone="info" label={UI.tlNext[locale]} />
              <span className="font-semibold text-ink-900">{pick(next.label, locale)}</span>
              <span className="tabular-nums text-ink-600">{fill(UI.tlStartsIn[locale], { time: at(next.s), left: formatDuration(minutesBetween(now, next.s), locale) })}</span>
            </div>
          ) : null}
          {current.length === 0 && !next ? (
            <div className="flex flex-wrap items-baseline gap-[var(--space-2)]">
              <StatusTag tone="success" label={UI.tlDone[locale]} />
              <span className="font-semibold text-ink-900">{UI.tlAllDone[locale]}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {days.map(({ day, list, from, to, lanes }) => {
        const span = to - from;
        const pos = (ms: number) => `${((ms - from) / span) * 100}%`;
        const laneCount = Math.max(...lanes.values()) + 1;
        const hours = span / HOUR;
        const step = hours <= 6 ? 1 : hours <= 12 ? 2 : 3;
        const ticks = Array.from({ length: Math.floor(hours / step) + 1 }, (_, i) => from + i * step * HOUR);
        const showNow = now !== null && now >= from && now <= to;
        return (
          <div key={day} className="flex flex-col gap-[var(--space-3)]">
            {days.length > 1 || (today !== null && today !== day) ? (
              <p className="m-0 font-bold text-ink-900">
                {formatWeekday(new Date(list[0]!.s), locale)} {formatDate(new Date(list[0]!.s), locale)}
              </p>
            ) : null}

            <div aria-hidden className="pt-[var(--space-5)]">
              <div className="relative rounded-control bg-surface-sunk" style={{ height: `calc(${laneCount} * 1.25rem + 0.5rem)` }}>
                {list.map((st) => {
                  const state = stateOf(st, now, next?.key) ?? "later";
                  return (
                    <div
                      key={st.key}
                      title={`${range(st)} ${pick(st.label, locale)}`}
                      className={`absolute h-4 rounded-pill ${BAR[state]}`}
                      style={{ left: pos(st.s), width: `max(4px, calc(${pos(st.e)} - ${pos(st.s)}))`, top: `calc(${lanes.get(st.key)} * 1.25rem + 0.25rem)` }}
                    />
                  );
                })}
                {showNow ? (
                  <div className="absolute -top-[var(--space-5)] bottom-0 flex flex-col items-center" style={{ left: pos(now), transform: "translateX(-50%)" }}>
                    <span className="rounded-pill bg-error px-[var(--space-2)] text-xs font-bold leading-[1.4] text-ink-inverse">{UI.tlNowMarker[locale]}</span>
                    <span className="w-[2px] flex-1 bg-error" />
                  </div>
                ) : null}
              </div>
              <div className="relative mt-[var(--space-1)] h-5 text-xs tabular-nums text-ink-600">
                {ticks.map((tk, i) => (
                  <span key={tk} className="absolute" style={{ left: pos(tk), transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>
                    {formatTime(new Date(tk), locale)}
                  </span>
                ))}
              </div>
            </div>

            <ol className="m-0 flex list-none flex-col p-0">
              {list.map((st) => {
                const state = stateOf(st, now, next?.key);
                const tag = state ? TAG[state] : undefined;
                return (
                  <li
                    key={st.key}
                    className={`grid grid-cols-[5.5rem_1fr] gap-x-[var(--space-3)] border-t border-line py-[var(--space-3)] sm:grid-cols-[7rem_1fr] ${state === "now" ? "rounded-panel border-transparent bg-surface-sunk px-[var(--space-2)]" : ""} ${state === "done" ? "text-ink-600" : ""}`}
                  >
                    <p className="m-0 font-semibold tabular-nums">
                      <time dateTime={st.startsAt}>{formatTime(new Date(st.s), locale)}</time>
                      <span aria-hidden> - </span>
                      <span className="visually-hidden"> {UI.tlTo[locale]} </span>
                      <time dateTime={st.endsAt}>{formatTime(new Date(st.e), locale)}</time>
                    </p>
                    <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
                      <p className={`m-0 font-semibold ${state === "done" ? "" : "text-ink-900"}`}>{pick(st.label, locale)}</p>
                      {st.detail ? <p className="m-0 text-sm text-ink-600">{pick(st.detail, locale)}</p> : null}
                      {tag ? <StatusTag tone={tag.tone} label={UI[tag.label][locale]} className="self-start" /> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}
