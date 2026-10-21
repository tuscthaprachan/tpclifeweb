"use client";

import { useSyncExternalStore } from "react";
import { cx } from "@/components/ui/cx";
import { SpeakerIcon } from "./icons";

interface SpeakButtonProps {
  /** The Thai text to read aloud. */
  text: string;
  /** The button's accessible name, e.g. "Hear it in Thai". */
  label: string;
  /** Read after the label so each button in a list is distinct. */
  name: string;
  className?: string;
}

const subscribeNever = () => () => {};
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const isThai = (voice: SpeechSynthesisVoice) => /^th([-_]|$)/i.test(voice.lang);

/** A Thai voice if the device has one, preferring one installed on the device. */
function thaiVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(isThai);
  return voices.find((voice) => voice.localService) ?? voices[0];
}

/** Chrome loads its voice list after the page does, so the first read waits briefly for it. */
function whenVoicesLoad(then: () => void) {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return then();
  let fired = false;
  const done = () => {
    if (fired) return;
    fired = true;
    synth.removeEventListener("voiceschanged", done);
    then();
  };
  synth.addEventListener("voiceschanged", done);
  window.setTimeout(done, 1000);
}

/**
 * Reads a dish name aloud in Thai with the browser's own speech synthesis,
 * so a student can hear how to order it. A client island: it renders nothing
 * until the page has hydrated and the browser can speak.
 */
export function SpeakButton({ text, label, name, className }: SpeakButtonProps) {
  const ready = useSyncExternalStore(subscribeNever, canSpeak, () => false);
  if (!ready) return null;

  const speak = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    whenVoicesLoad(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "th-TH";
      utterance.rate = 0.8;
      const voice = thaiVoice();
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    });
  };

  return (
    <button
      type="button"
      onClick={speak}
      className={cx(
        "inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center rounded-control text-action hover:bg-surface-alt",
        className,
      )}
    >
      <SpeakerIcon size={18} />
      <span className="visually-hidden">
        {label}: {name}
      </span>
    </button>
  );
}
