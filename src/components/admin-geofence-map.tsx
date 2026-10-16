"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Same value as MILES_TO_METERS in src/lib/command.ts. Kept local because that module pulls in
// node:crypto, which client components cannot import.
const MILES_TO_METERS = 1609.344;

export type GeofenceIncident = { id: string; lat: number; lng: number; title: string; status: string };

function ClickToSet({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 0.6 });
    // Only fly when the typed coordinates commit — not on every keystroke (parent debounces).
  }, [lat, lng, map]);
  return null;
}

/**
 * Geofence picker: click to drop the centre, active incidents on top, the blast radius as a circle.
 * Client-only (loaded with ssr:false by the composer) because Leaflet needs the DOM.
 */
export default function AdminGeofenceMap({
  lat,
  lng,
  radiusMiles,
  incidents,
  onPick,
}: {
  lat: number;
  lng: number;
  radiusMiles: number;
  incidents: GeofenceIncident[];
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={[lat, lng]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abc" attribution="&copy; OpenStreetMap contributors &copy; CARTO" maxZoom={20} />
      <ClickToSet onPick={onPick} />
      <FlyTo lat={lat} lng={lng} />
      <Circle center={[lat, lng]} radius={Math.max(0.1, radiusMiles) * MILES_TO_METERS} pathOptions={{ color: "#ff6b5e", weight: 2, fillColor: "#ff6b5e", fillOpacity: 0.12 }} />
      <CircleMarker center={[lat, lng]} radius={6} pathOptions={{ color: "#ff6b5e", weight: 2, fillColor: "#ff6b5e", fillOpacity: 1 }} />
      {incidents.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={5}
          pathOptions={{ color: p.status === "active" ? "#ffc531" : "#2ee6d0", weight: 2, fillOpacity: 0.85 }}
        >
          <Popup>{p.title}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
