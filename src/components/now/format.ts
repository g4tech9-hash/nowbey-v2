/** Freshness and small formatters for the safety surfaces. Short strings (phones). */

export function timeAgo(iso: string): string {
  const then = +new Date(iso);
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function countdownStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-BS", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ordinal(n: number): string {
  return new Intl.NumberFormat("en", { notation: "standard" }).format(n);
}
