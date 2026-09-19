"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { BusFront, Users } from "lucide-react";
import { getDict, type Lang } from "@/lib/i18n";

type Vehicle = {
  id: string;
  latitude: number;
  longitude: number;
  lastUpdatedAt: string;
  updateCount: number;
  confidence: number;
  heading: number | null;
  speed: number | null;
  witnessCount: number;
  crowding: { level: string; reports: number; updatedAt: string } | null;
};
type StopCoord = { name: string; lat: number; lng: number };

function markerIcon(heading: number | null) {
  const rotation = 45 + (heading || 0);
  return L.divIcon({ className: "bus-map-marker", html: `<div><span style="transform:rotate(${rotation}deg)">➤</span></div>`, iconSize: [38, 38], iconAnchor: [19, 35] });
}

function FitVehicles({ vehicles }: { vehicles: Vehicle[] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = vehicles.map((v) => [v.latitude, v.longitude]);
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }, [map, vehicles]);
  return null;
}

function relativeTime(date: string, lang: Lang) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const number = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en");
  if (seconds < 10) return lang === "bn" ? "এইমাত্র" : "just now";
  if (seconds < 60) return lang === "bn" ? `${number.format(seconds)} সেকেন্ড আগে` : `${seconds}s ago`;
  return lang === "bn" ? `${number.format(Math.floor(seconds / 60))} মিনিট আগে` : `${Math.floor(seconds / 60)}m ago`;
}

export default function LiveMap({ vehicles, stopCoords = [], lang = "en" }: { vehicles: Vehicle[]; stopCoords?: StopCoord[]; lang?: Lang }) {
  const t = getDict(lang);
  return <MapContainer center={[23.7806, 90.407]} zoom={12} scrollWheelZoom className="live-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FitVehicles vehicles={vehicles} />
    {stopCoords.map((stop, index) => <Marker key={`stop-${stop.name}-${index}`} position={[stop.lat, stop.lng]} icon={stopIcon}><Popup><strong style={{ display: "flex", gap: 6, alignItems: "center" }}><Users size={14} /> {stop.name}</strong></Popup></Marker>)}
    {vehicles.map((vehicle, index) => <Marker key={vehicle.id} position={[vehicle.latitude, vehicle.longitude]} icon={markerIcon(vehicle.heading)}><Popup><strong style={{ display: "flex", gap: 6, alignItems: "center" }}><BusFront size={15} /> {lang === "bn" ? "বাস" : "Vehicle"} {index + 1}</strong><br />{lang === "bn" ? "আপডেট" : "Updated"} {relativeTime(vehicle.lastUpdatedAt, lang)}<br /><small>{vehicle.witnessCount} {lang === "bn" ? "সাক্ষী" : "witnesses"} · {vehicle.speed !== null ? `${Math.round(vehicle.speed * 3.6)} km/h` : (lang === "bn" ? "গতি অজানা" : "speed unknown")}{vehicle.crowding ? ` · ${crowdLabelLocalized(vehicle.crowding.level, t)}` : ""}</small></Popup></Marker>)}
  </MapContainer>;
}

const stopIcon = L.divIcon({
  className: "stop-map-marker",
  html: '<div><span>◉</span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function crowdLabelLocalized(value: string, t: ReturnType<typeof getDict>) {
  return value === "empty" ? t.crowdEmptyShort : value === "seats" ? t.crowdSeatsShort : value === "standing" ? t.crowdStandingShort : value === "packed" ? t.crowdPackedShort : "";
}
