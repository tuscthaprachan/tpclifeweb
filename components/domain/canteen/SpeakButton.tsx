"use client";

import { useCallback, useEffect, useRef } from "react";
import { useHydrated } from "@/components/hooks/use-hydrated";
import { cx } from "@/components/ui/cx";
import { initialSpeak, speakStep, type SpeakAction, type SpeakEvent, type SpeakState } from "@/lib/canteen/speak";
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

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const isThai = (voice: SpeechSynthesisVoice) => /^th([-_]|$)/i.test(voice.lang);

/** A Thai voice if the device has one, preferring one installed on the device. */
function thaiVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(isThai);
  return voices.find((voice) => voice.localService) ?? voices[0];
}

/** Chrome loads its voice list after the page does, so the first read waits briefly for it. Returns a function that abandons the wait. */
function waitForVoices(then: () => void): () => void {
  const synth = window.speechSynthesis;
  const timer = window.setTimeout(() => done(), 1000);
  const stop = () => {
    synth.removeEventListener("voiceschanged", done);
    window.clearTimeout(timer);
  };
  const done = () => {
    stop();
    then();
  };
  synth.addEventListener("voiceschanged", done);
  return stop;
}

/**
 * Reads a dish name aloud in Thai with the browser's own speech synthesis,
 * so a student can hear how to order it. A client island: it renders nothing
 * until the page has hydrated and the browser can speak.
 */
export function SpeakButton({ text, label, name, className }: SpeakButtonProps) {
  const hydrated = useHydrated();
  const ready = hydrated && canSpeak();
  const machine = useRef<SpeakState>(initialSpeak);
  const abandonWait = useRef<(() => void) | null>(null);

  const send = useCallback((event: SpeakEvent): SpeakAction => {
    const next = speakStep(machine.current, event);
    machine.current = next.state;
    return next.action;
  }, []);

  const utter = useCallback(
    (ticket: number) => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "th-TH";
      utterance.rate = 0.8;
      const voice = thaiVoice();
      if (voice) utterance.voice = voice;
      const finished = () => void send({ type: "ended", ticket });
      utterance.onend = finished;
      utterance.onerror = finished;
      synth.speak(utterance);
    },
    [send, text],
  );

  useEffect(
    () => () => {
      abandonWait.current?.();
      if (machine.current.phase !== "idle" && canSpeak()) window.speechSynthesis.cancel();
      send({ type: "stop" });
    },
    [send],
  );

  if (!ready) return null;

  const speak = () => {
    const synth = window.speechSynthesis;
    abandonWait.current?.();
    abandonWait.current = null;
    synth.cancel();
    const action = send({ type: "click", voicesLoaded: synth.getVoices().length > 0 });
    const ticket = machine.current.ticket;
    if (action === "speak") utter(ticket);
    else if (action === "wait") {
      abandonWait.current = waitForVoices(() => {
        abandonWait.current = null;
        if (send({ type: "voicesReady", ticket }) === "speak") utter(ticket);
      });
    }
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
