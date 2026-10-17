"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPanel, type PickResult } from "@/components/map/map-panel";
import { INPUT, LABEL } from "@/components/password-field";
import { PARISHES } from "@/lib/geo";
import { compressImage } from "@/lib/image-client";
import { KINDS, KIND_KEYS, LIMITS, type KindKey } from "@/lib/life-kinds";

type Photo = { key: string; blob: Blob; url: string };

export function PostForm({ defaultParish }: { defaultParish: string | null }) {
  const router = useRouter();
  const [kind, setKind] = useState<KindKey>("food");
  const [placeName, setPlaceName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [price, setPrice] = useState(0);
  const [parish, setParish] = useState<string>(
    defaultParish && (PARISHES as readonly string[]).includes(defaultParish) ? defaultParish : "New Providence",
  );
  const [showMap, setShowMap] = useState(false);
  const [pin, setPin] = useState<PickResult | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [prep, setPrep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Photo[]>([]);
  const def = KINDS[kind];

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  // Give the browser its memory back for the previews when the form closes.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function addFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setError(null);
    const room = Math.max(0, LIMITS.photos - photos.length);
    if (list.length > room) setError(`You can add up to ${LIMITS.photos} photos.`);
    setPrep(true);
    try {
      const added: Photo[] = [];
      for (const f of Array.from(list).slice(0, room)) {
        try {
          const blob = await compressImage(f);
          added.push({ key: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
        } catch (e) {
          setError(e instanceof Error ? e.message : "That photo could not be added.");
        }
      }
      setPhotos((prev) => [...prev, ...added]);
    } finally {
      setPrep(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (def.placeRequired && placeName.trim().length < 2) return setError(`Add the ${def.placeLabel.toLowerCase()}.`);
    if (def.rating && rating < 1) return setError("Give it a star rating.");
    if (title.trim().length < 5) return setError("Give your post a headline of at least 5 characters.");
    if (body.trim().length < LIMITS.minBody) return setError(`Tell us a little more. At least ${LIMITS.minBody} characters.`);

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          kind,
          placeName,
          title,
          body,
          rating: def.rating ? rating : null,
          priceLevel: def.price && price ? price : null,
          parish,
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
          street: pin?.street ?? null,
        }),
      );
      photos.forEach((p, i) => fd.append("photos", p.blob, `photo-${i + 1}.jpg`));
      const res = await fetch("/api/life", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/login?mode=signin&next=/life/new");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not share that. Please try again.");
      router.push(`/life/${data.post.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <section>
        <p className={LABEL}>What are you sharing?</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {KIND_KEYS.map((k) => {
            const on = k === kind;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setKind(k)}
                className="rounded-2xl border p-3 text-left transition"
                style={{ borderColor: on ? KINDS[k].color : "rgba(120,220,214,.16)", background: on ? `${KINDS[k].color}1f` : "rgba(255,255,255,.03)" }}
              >
                <span className="block h-1.5 w-7 rounded-full" style={{ background: KINDS[k].color }} />
                <span className="display mt-2 block text-[14px] font-extrabold" style={{ color: on ? KINDS[k].color : "#fff0d9" }}>
                  {KINDS[k].label}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-400">{KINDS[k].blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>{def.placeLabel}</span>
          <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={LIMITS.place} placeholder={def.placeHint} className={`${INPUT} mt-1`} />
        </label>
        <label className="block">
          <span className={LABEL}>Island</span>
          <select value={parish} onChange={(e) => setParish(e.target.value)} className={`${INPUT} mt-1`}>
            {PARISHES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </section>

      {def.rating || def.price ? (
        <section className="flex flex-wrap items-end gap-x-8 gap-y-3">
          {def.rating ? (
            <div>
              <p className={LABEL}>How was it?</p>
              <div role="group" aria-label="Star rating" className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={rating >= n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className={`text-[30px] leading-none transition ${rating >= n ? "text-sun-600" : "text-white/20 hover:text-white/40"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {def.price ? (
            <div>
              <p className={LABEL}>Price (optional)</p>
              <div role="group" aria-label="Price level" className="mt-1 flex gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={price === n}
                    onClick={() => setPrice(price === n ? 0 : n)}
                    className={`min-h-[40px] min-w-[44px] rounded-lg px-2 text-[13px] font-extrabold ${price === n ? "bg-tide-500 text-abyss-950" : "bg-white/8 text-ink-200 hover:bg-white/14"}`}
                  >
                    {"$".repeat(n)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <label className="block">
          <span className={LABEL}>Headline</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} placeholder={def.titleHint} className={`${INPUT} mt-1 font-semibold`} />
        </label>
        <label className="block">
          <span className={LABEL}>Your experience</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={LIMITS.body}
            rows={6}
            placeholder={def.bodyHint}
            className={`${INPUT} mt-1 resize-y leading-relaxed`}
          />
          <span className="mt-1 block text-right text-[11.5px] text-ink-400">
            {body.length}/{LIMITS.body}
          </span>
        </label>
      </section>

      <section>
        <p className={LABEL}>Photos (optional, up to {LIMITS.photos})</p>
        <div className="mt-1.5 flex flex-wrap gap-2.5">
          {photos.map((p) => (
            <div key={p.key} className="relative h-24 w-24 overflow-hidden rounded-xl border hairline bg-abyss-800">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview that exists only in this browser */}
              <img src={p.url} alt="Your photo" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(p.key)}
                aria-label="Remove this photo"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-abyss-950/85 text-[13px] font-bold text-sand-100 hover:bg-conch-500 hover:text-abyss-950"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < LIMITS.photos ? (
            <button
              type="button"
              disabled={prep}
              onClick={() => fileRef.current?.click()}
              className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-tide-400/40 bg-white/[.03] text-center text-[11.5px] font-bold text-tide-300 hover:bg-white/8 disabled:opacity-50"
            >
              {prep ? "Preparing…" : "+ Add a photo"}
            </button>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => void addFiles(e.target.files)} aria-label="Choose photos" />
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-400">
          Photos are shrunk on your device, and hidden details such as the location your phone saved inside them are removed.
        </p>
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          aria-expanded={showMap}
          className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8"
        >
          {pin ? "Change the map pin" : "Add a map pin (optional)"}
        </button>
        {pin ? (
          <span className="ml-2 text-[12px] text-tide-300">
            Pinned{pin.street ? ` near ${pin.street}` : ""} ·{" "}
            <button type="button" onClick={() => setPin(null)} className="font-bold underline">
              remove
            </button>
          </span>
        ) : null}
        {showMap ? (
          <div className="mt-2.5 overflow-hidden rounded-2xl border border-tide-500/20">
            <MapPanel
              mode="pick"
              value={pin ? { lat: pin.lat, lng: pin.lng } : null}
              onChange={(p) => {
                setPin(p);
                if (p.parish && (PARISHES as readonly string[]).includes(p.parish)) setParish(p.parish);
              }}
              pins={[]}
              center={[25.0629, -77.3417]}
              zoom={13}
              initialLayer="hybrid"
              className="h-[min(420px,60vh)] w-full"
            />
          </div>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-500/15 px-3 py-2 text-[13px] text-danger-500">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || prep} className="rounded-xl bg-tide-500 px-6 py-3 text-[14px] font-extrabold text-abyss-950 hover:bg-tide-400 disabled:opacity-50">
          {busy ? "Sharing…" : "Share with the islands"}
        </button>
        <p className="text-[11.5px] text-ink-400">Your handle appears with your post. Be kind and honest.</p>
      </div>
    </form>
  );
}
