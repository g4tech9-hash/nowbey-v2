"use client";

/**
 * Copy + download actions for the portable NowBey design-system brief
 * (Master Build Screen 6).
 */
import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Btn } from "./ui";
import { DESIGN_BRIEF } from "./design-brief";

export function CopyDownloadBar() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DESIGN_BRIEF);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the download button still works */
    }
  };

  const download = () => {
    const blob = new Blob([DESIGN_BRIEF], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nowbey-design-system.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Btn variant="primary" onClick={copy} icon={copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}>
        {copied ? "Copied" : "Copy design brief"}
      </Btn>
      <Btn variant="ghost" onClick={download} icon={<Download size={16} aria-hidden />}>
        Download .md
      </Btn>
    </div>
  );
}
