"use client";
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

type Stream = { id: string; title: string; handle: string; watchUrl: string | null };
export function BroadcastStudio({ canPublish }: { canPublish: boolean }) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [title, setTitle] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const room = useRef<Room | null>(null);
  const mounted = useRef(false);
  const activeId = useRef<string | null>(null);
  const media = useRef<HTMLDivElement>(null);
  async function request(url: string, method: string, body?: object) {
    const res = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Broadcast request failed.");
    return data;
  }
  useEffect(() => {
    let active = true; mounted.current = true;
    async function refresh() {
      const checking = activeId.current;
      try {
        const data = await request("/api/streams", "GET");
        if (active) {
          setStreams(data.streams || []);
          if (checking && activeId.current === checking && !data.streams.some((s: Stream) => s.id === checking)) {
            await room.current?.disconnect(); activeId.current = null; setId(null); setPublishing(false);
            setMessage("This broadcast has ended.");
          }
        }
      }
      catch { if (active) setMessage("Could not load broadcasts. Check setup and try refreshing."); }
    }
    void refresh(); const timer = setInterval(refresh, 5000);
    return () => { active = false; mounted.current = false; clearInterval(timer); void room.current?.disconnect(); };
  }, []);
  async function connect(streamId: string) {
    const grant = await request(`/api/streams/${streamId}/token`, "POST");
    if (!mounted.current) throw new Error("Broadcast page closed.");
    await room.current?.disconnect();
    const connection = new Room({ adaptiveStream: true, dynacast: true }); room.current = connection;
    media.current?.replaceChildren();
    const attach = (track: Track) => {
      const element = track.attach();
      element.style.width = "100%"; element.style.maxHeight = "65vh";
      if (element instanceof HTMLVideoElement) { element.playsInline = true; element.controls = true; }
      media.current?.appendChild(element);
    };
    connection.on(RoomEvent.TrackSubscribed, attach);
    connection.on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((el) => el.remove()));
    connection.on(RoomEvent.Disconnected, () => { if (room.current !== connection) return; activeId.current = null; setId(null); setPublishing(false); media.current?.replaceChildren(); setMessage("Disconnected. Rejoin an active broadcast or start again."); });
    connection.on(RoomEvent.AudioPlaybackStatusChanged, () => { if (!connection.canPlaybackAudio) setMessage("Tap Enable audio to hear the broadcast."); });
    try {
    await connection.connect(grant.url, grant.token);
    if (!mounted.current) throw new Error("Broadcast page closed.");
    if (grant.publish) {
      await connection.localParticipant.setCameraEnabled(true);
      await connection.localParticipant.setMicrophoneEnabled(true);
      const camera = connection.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      if (camera) attach(camera);
    }
    } catch (error) { await connection.disconnect(); throw error; }
    activeId.current = streamId; setId(streamId); setPublishing(grant.publish);
    setMessage(grant.publish ? "You are broadcasting live. Avoid filming private information or people without consent." : "Watching live.");
  }
  async function start() {
    setBusy(true); setMessage(""); let created: string | undefined;
    try { const data = await request("/api/streams", "POST", { title }); created = data.id; await connect(data.id); }
    catch (error) {
      await room.current?.disconnect();
      if (created) await request("/api/streams", "PATCH", { id: created }).catch(() => {});
      setMessage(error instanceof Error ? error.message : "Could not go live.");
    } finally { setBusy(false); }
  }
  async function leave() {
    setBusy(true);
    try { if (publishing && id) await request("/api/streams", "PATCH", { id }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not stop provider room."); }
    finally { await room.current?.disconnect(); activeId.current = null; setId(null); setPublishing(false); setBusy(false); }
  }
  return <div className="space-y-5">
    <section className="nb-surface space-y-3 p-4">
      <h1 className="display text-2xl font-bold">NowBey broadcasts</h1>
      <p className="text-sm text-ink-300">Live camera and audio from trusted community broadcasters. No recording is enabled by this integration. Not an emergency service.</p>
      {canPublish && !id ? <div className="flex flex-wrap gap-2">
        <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="What are you covering?" aria-label="Broadcast title" className="min-h-[44px] min-w-0 flex-1 rounded-xl border hairline bg-abyss-950 px-3" />
        <button disabled={busy || title.trim().length < 4} onClick={() => void start()} className="rounded-full bg-tide-500 px-4 py-2 font-bold text-abyss-950 disabled:opacity-50">Go live with camera & audio</button>
      </div> : null}
      {!canPublish ? <p className="text-sm text-ink-400">Watching is open to everyone. Publishing requires staff access or an active Broadcaster grant.</p> : null}
      <p role="status" className="text-sm text-tide-300">{message}</p>
      <div ref={media} className="overflow-hidden rounded-xl bg-black" />
      {id ? <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void leave()} className="rounded-full border hairline px-4 py-2 font-bold">{publishing ? "End broadcast" : "Leave broadcast"}</button><button onClick={() => void room.current?.startAudio()} className="rounded-full border hairline px-4 py-2">Enable audio</button></div> : null}
    </section>
    <section className="nb-surface space-y-3 p-4"><h2 className="font-bold">Live now</h2>
      {!streams.length ? <p className="text-sm text-ink-400">No broadcasts listed.</p> : streams.filter((s) => s.watchUrl).map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border hairline p-3"><span>{s.title} · @{s.handle}</span><button disabled={busy || !!id} onClick={async () => { setBusy(true); try { await connect(s.id); } catch { await room.current?.disconnect(); setMessage("Could not join this broadcast."); } finally { setBusy(false); } }} className="rounded-full bg-tide-500 px-4 py-2 font-bold text-abyss-950 disabled:opacity-50">Watch / rejoin</button></div>)}
    </section>
  </div>;
}
