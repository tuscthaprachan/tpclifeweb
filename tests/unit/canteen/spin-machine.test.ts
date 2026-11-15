import { describe, expect, it } from "vitest";

import { arm, claim, isFresh, parseSpinRecord, sameTarget, SPIN_FRESH_MS, SPIN_IDLE, spinReduce } from "@/components/domain/canteen/pick/spin-machine";

const rec = arm("/en/eat/pick?seed=b&max=50", 1000, "n1");

describe("arm and parseSpinRecord", () => {
  it("round trips through JSON and rejects anything else", () => {
    expect(rec).toEqual({ nonce: "n1", target: "/en/eat/pick?seed=b&max=50", at: 1000 });
    expect(parseSpinRecord(JSON.stringify(rec))).toEqual(rec);
    expect(parseSpinRecord(null)).toBeNull();
    expect(parseSpinRecord("1700000000")).toBeNull();
    expect(parseSpinRecord("{bad")).toBeNull();
    expect(parseSpinRecord('{"nonce":1}')).toBeNull();
  });
});

describe("sameTarget", () => {
  it("ignores query order and a trailing slash", () => {
    expect(sameTarget("/en/eat/pick?seed=b&max=50", "/en/eat/pick?max=50&seed=b")).toBe(true);
    expect(sameTarget("/en/eat/pick/?seed=b", "/en/eat/pick?seed=b")).toBe(true);
  });
  it("differs on another path or query", () => {
    expect(sameTarget("/en/eat/pick?seed=b", "/en/eat/pick?seed=c")).toBe(false);
    expect(sameTarget("/en/eat/pick?seed=b", "/en/eat")).toBe(false);
  });
  it("matches any query when the target has none", () => {
    expect(sameTarget("/en/eat/pick", "/en/eat/pick?seed=z")).toBe(true);
  });
});

describe("claim", () => {
  const url = "/en/eat/pick?seed=b&max=50";
  it("plays for a fresh record that names this address", () => {
    expect(claim(rec, url, 2000)).toEqual({ kind: "play", nonce: "n1" });
  });
  it("leaves a fresh record for another address alone", () => {
    expect(claim(rec, "/en/eat/pick?seed=other", 2000)).toEqual({ kind: "keep" });
    expect(claim(rec, "/en/news", 2000)).toEqual({ kind: "keep" });
  });
  it("drops a stale or future-dated record", () => {
    expect(claim(rec, url, 1000 + SPIN_FRESH_MS)).toEqual({ kind: "drop" });
    expect(claim(rec, url, 500)).toEqual({ kind: "drop" });
    expect(isFresh(rec, 1000 + SPIN_FRESH_MS - 1)).toBe(true);
  });
  it("keeps when there is no record", () => {
    expect(claim(null, url, 2000)).toEqual({ kind: "keep" });
  });
});

describe("spinReduce", () => {
  it("plays on a claim, settles on done and ignores a repeat of the same nonce", () => {
    const playing = spinReduce(SPIN_IDLE, { type: "claimed", nonce: "a" });
    expect(playing).toEqual({ status: "playing", nonce: "a" });
    const settled = spinReduce(playing, { type: "done", nonce: "a" });
    expect(settled).toEqual({ status: "settled", nonce: "a" });
    expect(spinReduce(settled, { type: "claimed", nonce: "a" })).toBe(settled);
  });
  it("plays again for a new nonce", () => {
    const settled = spinReduce(spinReduce(SPIN_IDLE, { type: "claimed", nonce: "a" }), { type: "done", nonce: "a" });
    expect(spinReduce(settled, { type: "claimed", nonce: "b" })).toEqual({ status: "playing", nonce: "b" });
  });
  it("ignores done for another nonce or when idle", () => {
    const playing = spinReduce(SPIN_IDLE, { type: "claimed", nonce: "b" });
    expect(spinReduce(playing, { type: "done", nonce: "a" })).toBe(playing);
    expect(spinReduce(SPIN_IDLE, { type: "done", nonce: "a" })).toBe(SPIN_IDLE);
  });
  it("resets to idle", () => {
    const playing = spinReduce(SPIN_IDLE, { type: "claimed", nonce: "b" });
    expect(spinReduce(playing, { type: "reset" })).toEqual(SPIN_IDLE);
    expect(spinReduce(SPIN_IDLE, { type: "reset" })).toBe(SPIN_IDLE);
  });
});
