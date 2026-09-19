"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { BusFront } from "lucide-react";

type Vehicle = { id: string; latitude: number; longitude: number; lastUpdatedAt: string; updateCount: number; confidence: number };

const markerIcon = L.divIcon({ className: "bus-map-marker", html: "<div><span>●</span></div>", iconSize: [38, 38], iconAnchor: [19, 35] });

function FitVehicles({ vehicles }: { vehicles: Vehicle[] }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length === 1) map.setView([vehicles[0].latitude, vehicles[0].longitude], 15);
    if (vehicles.length > 1) map.fitBounds(vehicles.map((v) => [v.latitude, v.longitude]), { padding: [40, 40], maxZoom: 16 });
  }, [map, vehicles]);
  return null;
}

function relativeTime(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export default function LiveMap({ vehicles }: { vehicles: Vehicle[] }) {
  return <MapContainer center={[23.7806, 90.407]} zoom={12} scrollWheelZoom className="live-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FitVehicles vehicles={vehicles} />
    {vehicles.map((vehicle, index) => <Marker key={vehicle.id} position={[vehicle.latitude, vehicle.longitude]} icon={markerIcon}><Popup><strong style={{ display: "flex", gap: 6, alignItems: "center" }}><BusFront size={15} /> Vehicle {index + 1}</strong><br />Updated {relativeTime(vehicle.lastUpdatedAt)}<br /><small>{vehicle.updateCount} community report{vehicle.updateCount === 1 ? "" : "s"}</small></Popup></Marker>)}
  </MapContainer>;
}
