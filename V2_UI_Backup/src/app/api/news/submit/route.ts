import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { categorize, placeFromText } from "@/lib/ingest";
import { PARISHES } from "@/lib/geo";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { text, readJson } from "@/lib/validate";


export async function POST(req: Request) {
  const gate = hit(`tip:${clientIp(req)}`, 5, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "link submissions");

  const body = await readJson(req);
  const raw = text(body.url, 600);
  const note = text(body.note, 400);
  const parishIn = text(body.parish, 40);

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Paste a full link starting with http:// or https://" }, { status: 400 });
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname.includes(".")) {
    return NextResponse.json({ error: "Paste a full link starting with http:// or https://" }, { status: 400 });
  }
  const url = parsed.toString();

  const place = placeFromText(`${note} ${url}`);
  const slug =
    decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "")
      .replace(/\.(html?|php|aspx?)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim() || "reader tip";
  const parish = (PARISHES as readonly string[]).includes(parishIn) ? parishIn : (place?.parish ?? null);

  try {
    const [row] = await db
      .insert(newsItems)
      .values({
        title: (note ? note.slice(0, 140) : slug.replace(/\b\w/g, (c) => c.toUpperCase())).slice(0, 140) || "Reader tip",
        summary: note || `Reader-submitted link from ${parsed.host}.`,
        url,
        sourceName: "Reader tip",
        parish,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        geocoded: Boolean(place),
        category: categorize(`${note} ${slug}`),
        publishedAt: new Date(),
        // Nothing a stranger submits goes public until an admin has looked at it.
        review: "pending",
      })
      .onConflictDoNothing()
      .returning({ id: newsItems.id });

    if (!row) return NextResponse.json({ error: "That link has already been sent in. Thank you." }, { status: 409 });
    return NextResponse.json({ ok: true, pending: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not file that link. Please try again." }, { status: 500 });
  }
}
