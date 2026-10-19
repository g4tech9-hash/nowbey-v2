"use client";

import { useEffect, useState } from "react";

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
    <button type="button" onClick={toggle} aria-pressed={speaking} className="min-h-[42px] rounded-full border hairline bg-white/5 px-3.5 py-2 text-[12.5px] font-bold text-text-accent hover:bg-white/10">
      {speaking ? "■ Stop reading" : "🔊 Read this update"}
    </button>
  );
}
