"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function ReadAloud({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const available = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const frame = requestAnimationFrame(() => setSupported(available));
    return () => {
      cancelAnimationFrame(frame);
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000));
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className="nb-surface flex min-h-[42px] items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold text-cyan transition duration-200 ease-standard hover:border-cyan/40 hover:bg-white/5"
    >
      <Icon name="volume" size={15} />
      {speaking ? "Stop reading" : "Read this update"}
    </button>
  );
}
