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

/** A Thai voice if the device has one. Without one the browser still tries with `lang` set. */
function thaiVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("th"));
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.rate = 0.8;
    const voice = thaiVoice();
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
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
