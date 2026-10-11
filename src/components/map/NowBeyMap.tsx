"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  CATEGORIES,
  LAYERS,
  type CategoryKey,
  type LayerKey,
  formatCoord,
  metersPerPixel,
  precisionLabel,
} from "@/lib/geo";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  category: CategoryKey;
  title: string;
  meta?: string;
  status?: string;
  href?: string;
  /** The words on the popup link. Defaults to "Open report". */
  hrefLabel?: string;
  live?: boolean;
  /** Overrides the category colour and label, for pins that are not reports. */
  color?: string;
  label?: string;
};

export type PickResult = {
  lat: number;
  lng: number;
  street?: string;
  address?: string;
  parish?: string;
  precisionM: number;
};

type Props = {
  pins?: MapPin[];
  mode?: "browse" | "pick";
  value?: { lat: number; lng: number } | null;
  onChange?: (p: PickResult) => void;
  center?: [number, number];
  zoom?: number;
  initialLayer?: LayerKey;
  className?: string;
  compact?: boolean;
  focusId?: string | null;
  /** Change this to fly to the focused pin again (for example when its row is tapped twice). */
  focusNonce?: number;
  googleKey?: string;
};

const PIN_PX = 30;

function pinHtml(pin: MapPin, selected: boolean) {
  const c = pin.color ?? CATEGORIES[pin.category]?.color ?? "#94a3b8";
  const letter = (pin.label ?? CATEGORIES[pin.category]?.label ?? "N").charAt(0);
  return `<div class="nb-pin ${pin.live ? "nb-pin-live" : ""}" style="background:${c};color:${c};${
    selected ? "outline:3px solid rgba(46,230,208,.85);outline-offset:2px;" : ""
  }"><span>${letter}</span></div>`;
}

function makePinIcon(pin: MapPin, selected: boolean) {
  return L.divIcon({
    className: "",
    html: pinHtml(pin, selected),
    iconSize: [PIN_PX, PIN_PX],
    iconAnchor: [PIN_PX / 2, PIN_PX / 2],
    popupAnchor: [0, -PIN_PX / 2],
  });
}

function makePickIcon(zoomed: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [46, 58],
    iconAnchor: [23, 54],
    html: `<svg width="46" height="58" viewBox="0 0 46 58" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 56C23 56 42 34.7 42 21.5C42 10.3 33.5 2 23 2S4 10.3 4 21.5C4 34.7 23 56 23 56Z" fill="#0b2a38" stroke="#2ee6d0" stroke-width="3"/>
      <circle cx="23" cy="21" r="8.5" fill="${zoomed ? "#2ee6d0" : "#ffc531"}"/>
      <circle cx="23" cy="21" r="3" fill="#03121b"/>
    </svg>`,
  });
}

// Leaflet swaps a marker's whole DOM node whenever it receives a new icon object, so icons are cached by what they
// look like instead of being rebuilt on every render. Only a handful of combinations exist, so the cache stays small.
const ICON_CACHE = new Map<string, L.DivIcon>();
function iconFor(pin: MapPin, selectedNow: boolean): L.DivIcon {
  const key = `${pin.category}|${pin.color ?? ""}|${pin.label ?? ""}|${pin.live ? 1 : 0}|${selectedNow ? 1 : 0}`;
  let icon = ICON_CACHE.get(key);
  if (!icon) {
    icon = makePinIcon(pin, selectedNow);
    ICON_CACHE.set(key, icon);
  }
  return icon;
}

const PICK_FAR = makePickIcon(false);
const PICK_NEAR = makePickIcon(true);

/** Bridges react-leaflet's map instance to the React state in this component. */
function Bridge({
  onMap,
  onClick,
  onTileError,
}: {
  onMap: (m: L.Map) => void;
  onClick: (e: L.LeafletMouseEvent) => void;
  onTileError: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    map.on("click", onClick);
    map.on("tileerror", onTileError);
    return () => {
      map.off("click", onClick);
      map.off("tileerror", onTileError);
    };
  }, [map, onMap, onClick, onTileError]);
  return null;
}

export default function NowBeyMap({
  pins = [],
  mode = "browse",
  value,
  onChange,
  center = [25.0629, -77.3417],
  zoom = 13,
  initialLayer = "hybrid",
  className = "",
  compact = false,
  focusId,
  focusNonce = 0,
  googleKey,
}: Props) {
  const [layer, setLayer] = useState<LayerKey>(initialLayer);
  const [map, setMap] = useState<L.Map | null>(null);
  const [zoomNow, setZoomNow] = useState(zoom);
  const [centerPt, setCenterPt] = useState<[number, number]>(center);
  const [aim, setAim] = useState(false);
  const [selected, setSelected] = useState<string | null>(focusId ?? null);
  // When the page asks for a different pin to be focused, select it (adjusting state while rendering, not in an effect).
  const focusKey = `${focusId ?? ""}|${focusNonce}`;
  const [seenFocusKey, setSeenFocusKey] = useState(focusKey);
  if (focusKey !== seenFocusKey) {
    setSeenFocusKey(focusKey);
    if (focusId) setSelected(focusId);
  }
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(value ?? null);
  const [query, setQuery] = useState("");
  type Hit = { label: string; lat: number; lng: number; street?: string; address?: string; parish?: string };
  const [found, setFound] = useState<{ q: string; items: Hit[] } | null>(null);
  // The search box shows results only for what is typed right now. They are worked out from the last answer plus the
  // text, rather than copied into state, so old results never sit under new text.
  const wanted = query.trim();
  const searchable = wanted.length >= 3;
  const results: Hit[] = searchable && found?.q === wanted ? found.items : [];
  const searching = searchable && found?.q !== wanted;
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [streetView, setStreetView] = useState<{ lat: number; lng: number } | null>(null);
  const [svError, setSvError] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [pegman, setPegman] = useState<{ x: number; y: number; over: boolean } | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [step, setStep] = useState(1);
  const tileErrors = useRef(0);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastEmit = useRef(0);
  const pinsRef = useRef(pins);

  const emit = useCallback(
    (lat: number, lng: number, z: number) => {
      if (!onChange) return;
      const precisionM = Number((metersPerPixel(z, lat) * 6).toFixed(2));
      onChange({ lat, lng, precisionM });
    },
    [onChange],
  );

  /* Reverse geocode the pin so "Area" can be prefilled with a real street name. */
  const reverse = useCallback(
    async (lat: number, lng: number, z: number) => {
      setGeoNote("Matching this spot to the nearest street…");
      try {
        const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { cache: "no-store" });
        const data = await r.json();
        if (data?.error) throw new Error(data.error);
        setGeoNote(null);
        onChange?.({
          lat,
          lng,
          precisionM: Number((metersPerPixel(z, lat) * 6).toFixed(2)),
          street: data.street,
          address: data.address,
          parish: data.parish,
        });
      } catch {
        setGeoNote("Live geocoder unreachable — using local Bahamas place names.");
        try {
          const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}&fallback=1`, { cache: "no-store" });
          const data = await r.json();
          onChange?.({
            lat,
            lng,
            precisionM: Number((metersPerPixel(z, lat) * 6).toFixed(2)),
            street: data.street,
            address: data.address,
            parish: data.parish,
          });
        } catch {
          /* leave coordinates only */
        }
      }
    },
    [onChange],
  );

  const placePin = useCallback(
    (lat: number, lng: number, opts: { fly?: boolean; zoomTo?: number } = {}) => {
      const z = opts.zoomTo ?? map?.getZoom() ?? zoom;
      setPick({ lat, lng });
      if (opts.fly && map) map.flyTo([lat, lng], Math.max(z, 17), { duration: 0.6 });
      if (mode === "pick") void reverse(lat, lng, z);
      else emit(lat, lng, z);
    },
    [map, mode, reverse, emit, zoom],
  );

  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (!map) return;
      if (mode === "pick") placePin(e.latlng.lat, e.latlng.lng);
    },
    [map, mode, placePin],
  );

  const handleTileError = useCallback(() => {
    tileErrors.current += 1;
    if (tileErrors.current > 8 && layer !== "road") {
      setLayer("road");
      setFallbackNote(
        "Aerial tile server did not answer, so NowBey switched to the OpenStreetMap road layer. Pins and search still work.",
      );
    }
  }, [layer]);

  // The zoom and scale readout only needs to change when the map stops moving.
  useEffect(() => {
    if (!map) return;
    const sync = () => {
      const c = map.getCenter();
      setCenterPt([c.lat, c.lng]);
      setZoomNow(map.getZoom());
    };
    map.on("moveend zoomend", sync);
    return () => {
      map.off("moveend zoomend", sync);
    };
  }, [map]);

  // Aim mode: the crosshair is the pin. Follow the centre while the map moves, then look up the
  // street once it settles so "Area" is filled in for the spot you actually chose.
  useEffect(() => {
    if (!map || !aim || mode !== "pick") return;
    const follow = () => {
      const c = map.getCenter();
      setPick({ lat: c.lat, lng: c.lng });
      if (Date.now() - lastEmit.current > 120) {
        lastEmit.current = Date.now();
        emit(c.lat, c.lng, map.getZoom());
      }
    };
    const settle = () => {
      const c = map.getCenter();
      setPick({ lat: c.lat, lng: c.lng });
      void reverse(c.lat, c.lng, map.getZoom());
    };
    map.on("move", follow);
    map.on("moveend", settle);
    return () => {
      map.off("move", follow);
      map.off("moveend", settle);
    };
  }, [map, aim, mode, emit, reverse]);

  // Follow the position the page gives us, and clear the marker when the page clears it. Before this the yellow
  // pin stayed on the map after a report was published or cancelled.
  const valueKey = value ? `${value.lat},${value.lng}` : "";
  const [seenValueKey, setSeenValueKey] = useState(valueKey);
  if (valueKey !== seenValueKey) {
    setSeenValueKey(valueKey);
    setPick(value ?? null);
  }

  useEffect(() => {
    pinsRef.current = pins;
  });

  // Fly to the focused pin when it changes (or is tapped again), never just because the parent re-rendered.
  // Before this, placing a new pin while a report was selected threw the map back to the selected report.
  const focusPinExists = focusId ? pins.some((p) => p.id === focusId) : false;
  useEffect(() => {
    if (!focusId || !map || !focusPinExists) return;
    const pin = pinsRef.current.find((p) => p.id === focusId);
    if (!pin) return;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 17), { duration: 0.7 });
  }, [focusId, focusNonce, map, focusPinExists]);

  /* Debounced forward geocoding for the search box. */
  useEffect(() => {
    if (!searchable) return;
    let alive = true;
    const t = setTimeout(async () => {
      let items: Hit[] = [];
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(wanted)}`, { cache: "no-store" });
        const data = await r.json();
        items = data.results ?? [];
      } catch {
        items = [];
      }
      if (alive) setFound({ q: wanted, items });
    }, 320);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [wanted, searchable]);

  /* Pegman drag: pointer capture on the badge, drop anywhere on the map. */
  useEffect(() => {
    if (!pegman) return;
    const move = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const over =
        !!rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      setPegman({ x: e.clientX, y: e.clientY, over });
    };
    const up = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const map2 = map;
      if (rect && map2 && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const pt = map2.containerPointToLatLng(L.point(e.clientX - rect.left, e.clientY - rect.top));
        setSvError(false);
        setStreetView({ lat: pt.lat, lng: pt.lng });
        if (!map2.getBounds().contains(pt)) map2.panTo(pt, { animate: true });
      }
      setPegman(null);
      dragOrigin.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [pegman, map]);

  const openStreetView = useCallback(() => {
    const at = pick ?? (map ? { lat: map.getCenter().lat, lng: map.getCenter().lng } : null);
    if (!at) return;
    setSvError(false);
    setStreetView(at);
  }, [pick, map]);

  const nudge = useCallback(
    (metersNorth: number, metersEast: number) => {
      const at = pick ?? (map ? { lat: map.getCenter().lat, lng: map.getCenter().lng } : null);
      if (!at || !map) return;
      const dLat = metersNorth / 111320;
      const dLng = metersEast / (111320 * Math.cos((at.lat * Math.PI) / 180));
      const lat = at.lat + dLat;
      const lng = at.lng + dLng;
      setPick({ lat, lng });
      map.panTo([lat, lng], { animate: true, duration: 0.2 });
      if (mode === "pick") void reverse(lat, lng, map.getZoom());
      else emit(lat, lng, map.getZoom());
    },
    [pick, map, mode, reverse, emit],
  );

  // Finding a pin is easier when the map starts on the member's own spot. Asked once, only when they are placing a
  // pin with nothing chosen yet, and only if they say yes to the browser's location prompt.
  const locatedOnce = useRef(false);
  useEffect(() => {
    if (!map || mode !== "pick" || value || locatedOnce.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    locatedOnce.current = true;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        // Only centre on a spot inside The Bahamas. Anywhere else, the map stays where it was.
        if (lat > 20.5 && lat < 27.5 && lng > -80.8 && lng < -72.5) map.setView([lat, lng], Math.max(map.getZoom(), 16));
      },
      () => {
        /* refused or unavailable: the map stays where it was */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [map, mode, value]);

  const mPerPx = useMemo(() => metersPerPixel(zoomNow, centerPt[0]), [zoomNow, centerPt]);
  const def = LAYERS[layer];

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border border-tide-500/20 bg-abyss-900 ${className}`}
    >
      <style>{`.leaflet-top.leaflet-left,.leaflet-top.leaflet-right{top:74px !important}`}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        maxZoom={20}
        zoomControl={false}
        attributionControl
        scrollWheelZoom
        doubleClickZoom
        className="h-full w-full"
      >
        <TileLayer
          key={def.url}
          url={def.url}
          subdomains={def.subdomains ?? "abc"}
          attribution={def.attribution}
          maxZoom={20}
          maxNativeZoom={def.maxZoom}
        />
        {def.overlay ? (
          <TileLayer
            key={def.overlay}
            url={def.overlay}
            attribution={def.overlayAttribution}
            maxZoom={20}
            maxNativeZoom={def.maxZoom}
            className="nb-halo"
            opacity={0.95}
          />
        ) : null}
        <Bridge onMap={setMap} onClick={handleMapClick} onTileError={handleTileError} />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" metric imperial />

        {showPins
          ? pins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={iconFor(pin, selected === pin.id)}
                zIndexOffset={selected === pin.id ? 800 : 0}
                eventHandlers={{ click: () => setSelected(pin.id) }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: pin.color ?? CATEGORIES[pin.category]?.color }}>
                      {pin.label ?? CATEGORIES[pin.category]?.label ?? pin.category}
                    </p>
                    <p className="font-semibold leading-snug">{pin.title}</p>
                    {pin.meta ? <p className="text-[12px] text-[#9fc4c9]">{pin.meta}</p> : null}
                    <p className="text-[11px] text-[#7fa7a9]">
                      {formatCoord(pin.lat, "lat")} · {formatCoord(pin.lng, "lng")}
                    </p>
                    {pin.href ? (
                      <a className="mt-1 inline-block text-[12px] font-bold text-tide-300 underline" href={pin.href}>
                        {pin.hrefLabel ?? "Open report"}
                      </a>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {pick ? (
          <Marker
            position={[pick.lat, pick.lng]}
            icon={zoomNow >= 17 ? PICK_NEAR : PICK_FAR}
            draggable={mode === "pick" && !aim}
            autoPan
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                setPick({ lat: ll.lat, lng: ll.lng });
                if (mode === "pick") void reverse(ll.lat, ll.lng, map?.getZoom() ?? zoomNow);
                else emit(ll.lat, ll.lng, map?.getZoom() ?? zoomNow);
              },
            }}
          />
        ) : null}
      </MapContainer>

      {/* crosshair for pin-to-center precision */}
      {aim ? (
        <div className="nb-crosshair">
          <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden>
            <circle cx="43" cy="43" r="20" fill="none" stroke="#2ee6d0" strokeWidth="1.6" strokeDasharray="4 5" />
            <path d="M43 4v20M43 62v20M4 43h20M62 43h20" stroke="#2ee6d0" strokeWidth="1.6" />
            <circle cx="43" cy="43" r="2.4" fill="#ffc531" />
          </svg>
        </div>
      ) : null}

      {/* top bar: search + layers */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-wrap items-start gap-2 p-2 sm:p-2.5">
        {mode === "pick" || compact ? null : (
          <div className="pointer-events-auto relative w-[min(340px,68vw)]">
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-2 shadow-[0_14px_34px_rgba(0,0,0,.45)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#74f3e3" strokeWidth="2.4" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) {
                    placePin(results[0].lat, results[0].lng, { fly: true, zoomTo: 18 });
                    setQuery("");
                  }
                }}
                placeholder="Search street, dock, landmark…"
                aria-label="Search for a street or landmark"
                className="w-full bg-transparent text-[13px] text-sand-100 outline-none placeholder:text-[#6e97a0]"
              />
              {searching ? <span className="text-[11px] text-tide-300">…</span> : null}
            </div>
            {results.length ? (
              <ul className="glass nb-scroll absolute mt-1.5 max-h-64 w-full overflow-auto rounded-xl py-1 text-left shadow-[0_20px_44px_rgba(0,0,0,.55)]">
                {results.map((r) => (
                  <li key={`${r.lat},${r.lng},${r.label}`}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-tide-500/15"
                      onClick={() => {
                        placePin(r.lat, r.lng, { fly: true, zoomTo: 18 });
                        setQuery("");
                      }}
                    >
                      <span className="block text-[13px] font-semibold">{r.label}</span>
                      <span className="block text-[11px] text-[#8fb9b6]">
                        {formatCoord(r.lat, "lat")} · {formatCoord(r.lng, "lng")}
                        {r.parish ? ` · ${r.parish}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <div className="pointer-events-auto ml-auto flex items-center gap-1.5">
          <div className="glass flex overflow-hidden rounded-xl p-1 text-[11.5px] font-bold">
            {(Object.keys(LAYERS) as LayerKey[]).map((key) => (
              <button
                key={key}
                type="button"
                title={LAYERS[key].hint}
                onClick={() => setLayer(key)}
                className={`rounded-lg px-2.5 py-1.5 transition ${
                  layer === key ? "bg-tide-500 text-abyss-950" : "text-[#bfe4e0] hover:bg-white/10"
                }`}
              >
                {LAYERS[key].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowPins((v) => !v)}
            title={showPins ? "Hide other pins" : "Show other pins"}
            className={`glass rounded-xl px-2.5 py-2 text-[11.5px] font-bold ${showPins ? "text-tide-300" : "text-[#8fb9b6]"}`}
          >
            Pins
          </button>
        </div>
      </div>

      {/* bottom-left: pegman + street view + aim. Lifted on mobile to clear the sheet grabber. */}
      <div className="absolute bottom-14 left-2.5 z-[500] flex flex-col items-start gap-2 sm:bottom-9">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              dragOrigin.current = { x: e.clientX, y: e.clientY };
              setPegman({ x: e.clientX, y: e.clientY, over: false });
            }}
            title="Drag me onto a road for street level"
            aria-label="Drag to street level view"
            className="glass grid h-11 w-11 cursor-grab touch-none place-items-center rounded-full active:cursor-grabbing"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="4.6" r="2.6" fill="#ffc531" />
              <path
                d="M12 8c-2.6 0-3.6 1.3-3.6 3.1V14H7v6h2.5v-5h5v5H17v-6h-1.4v-2.9C15.6 9.3 14.6 8 12 8Z"
                fill="#ffc531"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={openStreetView}
            className="glass rounded-full px-3 py-2 text-[12px] font-bold text-sand-100"
          >
            Street View
          </button>
          {mode === "pick" ? (
            <button
              type="button"
              onClick={() => {
                setAim((v) => !v);
                if (!aim && map) {
                  const c = map.getCenter();
                  const z = Math.max(map.getZoom(), 18);
                  map.setView([c.lat, c.lng], z, { animate: true });
                  placePin(c.lat, c.lng, { zoomTo: z });
                }
              }}
              className={`glass rounded-full px-3 py-2 text-[12px] font-bold ${
                aim ? "bg-sun-500 text-abyss-950" : "text-sand-100"
              }`}
            >
              {aim ? "Aim locked" : "Aim at centre"}
            </button>
          ) : null}
        </div>

        <div className="glass hidden rounded-xl px-2.5 py-1.5 text-[10.5px] font-semibold text-[#9fc4c9] sm:block">
          zoom {zoomNow} · {precisionLabel(zoomNow, centerPt[0])} on screen · {mPerPx.toFixed(2)} m/px
        </div>
      </div>

      {/* pin control deck. On phones we move it to the top so the aim crosshair is not occluded. */}
      {mode === "pick" ? (
        <div className="absolute right-2.5 z-[500] w-[min(300px,84vw)] top-14 sm:top-auto sm:bottom-2.5">
          <div className="glass rounded-xl p-2.5 text-[12px] shadow-[0_18px_40px_rgba(0,0,0,.5)]">
            {pick ? (
              <>
                <p className="font-mono text-[11.5px] text-tide-300">
                  {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#bfe4e0]">
                  {geoNote ?? (aim ? "Nudge the map, not the pin — the crosshair is the pin." : "Drag the pin tip, or use the arrows.")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
                    {[
                      { g: "", dN: 0, dE: 0 },
                      { g: "\u2191", dN: 1, dE: 0 },
                      { g: "", dN: 0, dE: 0 },
                      { g: "\u2190", dN: 0, dE: -1 },
                      { g: "\u25c7", dN: 0, dE: 0 },
                      { g: "\u2192", dN: 0, dE: 1 },
                      { g: "", dN: 0, dE: 0 },
                      { g: "\u2193", dN: -1, dE: 0 },
                      { g: "", dN: 0, dE: 0 },
                    ].map((cell, i) =>
                      cell.g && cell.dN + cell.dE !== 0 ? (
                        <button
                          key={i}
                          type="button"
                          onClick={() => nudge(cell.dN * step, cell.dE * step)}
                          className="h-6 w-6 rounded-md bg-white/10 text-[11px] font-bold text-sand-100 hover:bg-tide-500 hover:text-abyss-950"
                          title={`Move ${Math.abs(cell.dN * step)} m`}
                        >
                          {cell.g}
                        </button>
                      ) : (
                        <span key={i} className="grid h-6 w-6 place-items-center text-[9px] text-[#4f7a83]">
                          {cell.g || "\u00b7"}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-[10.5px] leading-tight text-[#8fb9b6]">
                      Nudge the pin tip onto the kerb, gate or drain.
                    </p>
                    <div className="flex gap-1">
                      {[1, 5, 25].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStep(s)}
                          className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
                            step === s ? "bg-tide-500 text-abyss-950" : "bg-white/10 text-[#bfe4e0]"
                          }`}
                        >
                          {s} m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!map) return;
                      map.setView([pick.lat, pick.lng], 19, { animate: true });
                    }}
                    className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11.5px] font-bold hover:bg-white/20"
                  >
                    Zoom to 19
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${pick.lat.toFixed(6)},${pick.lng.toFixed(6)}`);
                    }}
                    className="rounded-lg bg-white/10 px-2 py-1.5 text-[11.5px] font-bold hover:bg-white/20"
                  >
                    Copy
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-[#bfe4e0]">
                Tap the exact spot on the map, or search a street. Then drag the pin tip onto the kerb, gate or pothole.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {fallbackNote ? (
        <div className="absolute inset-x-2.5 top-[76px] z-[500] sm:top-[74px]">
          <p className="glass rounded-lg border-l-[3px] border-sun-500 px-3 py-2 text-[11.5px] text-sand-100">
            {fallbackNote}
          </p>
        </div>
      ) : null}

      {pegman ? (
        <div
          className="pointer-events-none fixed z-[900] -translate-x-1/2 -translate-y-1/2"
          style={{ left: pegman.x, top: pegman.y }}
        >
          <div className={`grid h-10 w-10 place-items-center rounded-full ${pegman.over ? "bg-tide-500" : "bg-sun-500"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="4.6" r="2.6" fill="#03121b" />
              <path d="M12 8c-2.6 0-3.6 1.3-3.6 3.1V14H7v6h2.5v-5h5v5H17v-6h-1.4v-2.9C15.6 9.3 14.6 8 12 8Z" fill="#03121b" />
            </svg>
          </div>
          {pegman.over ? <p className="mt-1 rounded bg-abyss-950/85 px-2 py-0.5 text-[10px] font-bold">Drop for street level</p> : null}
        </div>
      ) : null}

      {streetView ? (
        <div className="absolute inset-0 z-[600] flex flex-col bg-abyss-950/92 p-2.5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="display text-[15px] font-bold">Street level</p>
              <p className="text-[11px] text-[#8fb9b6]">
                {formatCoord(streetView.lat, "lat")} · {formatCoord(streetView.lng, "lng")}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  placePin(streetView.lat, streetView.lng, { zoomTo: 19 });
                  map?.flyTo([streetView.lat, streetView.lng], 19, { duration: 0.5 });
                  setStreetView(null);
                }}
                className="rounded-lg bg-tide-500 px-2.5 py-1.5 text-[11.5px] font-bold text-abyss-950"
              >
                Pin here
              </button>
              <button
                type="button"
                onClick={() => setStreetView(null)}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
          <div className="relative mt-2 flex-1 overflow-hidden rounded-xl border border-tide-500/25 bg-abyss-900">
            {googleKey && !svError ? (
              // eslint-disable-next-line @next/next/no-img-element -- an external Google Street View photo, not a local asset
              <img
                src={`https://maps.googleapis.com/maps/api/streetview?size=800x480&location=${streetView.lat},${streetView.lng}&fov=85&heading=0&pitch=0&key=${googleKey}`}
                alt="Street level photo at the pin"
                className="h-full w-full object-cover"
                onError={() => setSvError(true)}
              />
            ) : (
              <div className="grid h-full place-items-center p-5 text-center">
                <div className="max-w-[420px] space-y-2">
                  <p className="display text-[15px] font-bold text-sun-400">
                    {googleKey ? "No Street View photos at this exact spot" : "Street level opens in Google Maps"}
                  </p>
                  <p className="text-[12.5px] text-[#bfe4e0]">
                    {googleKey
                      ? "Coverage in The Bahamas is strongest around Nassau, Paradise Island and Freeport. Zoom the satellite layer for the closest thing to a photo."
                      : "Street photos are not built into NowBey yet. Open this exact spot in Google Maps to look around at street level."}
                  </p>
                  <a
                    className="inline-block rounded-lg bg-tide-500 px-3 py-2 text-[12.5px] font-bold text-abyss-950"
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetView.lat},${streetView.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open street level in Google Maps
                  </a>
                  <p className="text-[11px] text-[#7fa7a9]">
                    This opens Google Maps in a new tab.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
