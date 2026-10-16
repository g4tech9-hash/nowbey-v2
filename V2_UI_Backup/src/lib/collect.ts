// Small pure collection/text helpers shared by the feed and the news ingest.
// Zero imports so they run under plain node --test as well as the Next build.

/** Drop repeated records by id, keeping the first occurrence (feed order). */
export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

const JUNK_PATTERNS: RegExp[] = [
  /^\s*profile\s*:/i, // spam directory profiles, e.g. "Profile : mu88vncfd"
  /\.(jpeg|jpg|png|gif|webp|mp4|mov|pdf)(\s|$)/i, // bare filenames, e.g. "More 4.jpeg"
  /^(img|dsc|jayden|whatsapp image|photo|stories this photo appears in)\b/i, // gallery scraps
  /(casino|betting|slots|poker|porn|xxx|viagra|cialis|crypto giveaway|double your)/i, // spam verticals
  /^\s*[a-z0-9_-]{20,}\s*$/i, // opaque hashes/tokens as "headlines"
];

/** True when a headline is feed spam, a filename, or otherwise not a story. */
export function isJunkHeadline(title: unknown): boolean {
  if (typeof title !== "string") return true;
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length < 12) return true;
  return JUNK_PATTERNS.some((re) => re.test(t));
}

/** Conservative incident deduplication: same category, very recent, and essentially the same spot. */
export function isLikelyDuplicateIncident(
  incoming: { category: string; lat: number; lng: number },
  candidate: { category: string; lat: number; lng: number; createdAt: Date | string },
  now = Date.now(),
): boolean {
  if (incoming.category !== candidate.category) return false;
  const age = now - new Date(candidate.createdAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age > 90 * 60_000) return false;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(candidate.lat - incoming.lat);
  const dLng = toRad(candidate.lng - incoming.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(incoming.lat)) * Math.cos(toRad(candidate.lat)) * Math.sin(dLng / 2) ** 2;
  const metres = 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a)));
  return metres <= 180;
}

/** Split into chunks of at most `size` (Expo Push API takes max 100 per request). */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** True for strings shaped like an Expo push token: ExponentPushToken[...]. */
export function isExpoPushToken(v: unknown): v is string {
  return typeof v === "string" && /^ExponentPushToken\[[A-Za-z0-9_.-]+\]$/.test(v);
}

export type PushReceipt = { status: string; message?: string };

/** True when an Expo receipt means the device token is dead and should be pruned. */
export function isDeadReceipt(r: PushReceipt): boolean {
  return r.status === "error" && /DeviceNotRegistered/.test(r.message ?? "");
}
