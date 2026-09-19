"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Bell, BusFront, Coins, Eye, LocateFixed, Navigation, RefreshCw, ShieldAlert, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false, loading: () => <div className="live-map" /> });
type Vehicle = { id: string; latitude: number; longitude: number; lastUpdatedAt: string; updateCount: number; confidence: number };
type Transport = { id: string; name: string; routeName: string; routeStops: string[]; routeVariants?: Array<{ routeName: string; routeStops: string[]; source: string }> };

export function TransportLiveClient({ transport }: { transport: Transport }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [watchers, setWatchers] = useState(0);
  const [travellers, setTravellers] = useState(0);
  const [points, setPoints] = useState(0);
  const [modes, setModes] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [permissionHelp, setPermissionHelp] = useState<"blocked" | "insecure" | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/live/${transport.id}`, { cache: "no-store" });
    if (response.status === 401) { router.push(`/login?next=/transports/${transport.id}`); return; }
    const data = await response.json();
    if (response.ok) { setVehicles(data.vehicles); setWatchers(data.watchers); setTravellers(data.travellers); setPoints(data.points); setModes(data.myModes); }
  }, [router, transport.id]);

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 15_000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      modes.forEach((mode) => fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transportId: transport.id, mode, active: true }) }));
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [modes, transport.id]);

  async function toggleMode(mode: "watching" | "travelling") {
    setMessage(null);
    const active = !modes.includes(mode);
    if (mode === "travelling" && active && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    const response = await fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transportId: transport.id, mode, active }) });
    const data = await response.json();
    if (!response.ok) { setMessage({ type: "error", text: data.error }); return; }
    setModes((current) => active ? [...current, mode] : current.filter((item) => item !== mode));
    setPoints(data.points);
    await refresh();
  }

  async function shareLocation() {
    setMessage(null);
    setPermissionHelp(null);
    if (!window.isSecureContext) {
      setPermissionHelp("insecure");
      setMessage({ type: "error", text: "Location access requires HTTPS or localhost." });
      return;
    }
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Location is not supported by this browser." });
      return;
    }
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (permission.state === "denied") {
          setPermissionHelp("blocked");
          setMessage({ type: "error", text: "Location is blocked for this site. Change the site permission to Allow, then try again." });
          return;
        }
      } catch {
        // Some browsers support geolocation but not permission queries.
      }
    }
    setUpdating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      if (position.coords.accuracy > 250) {
        const accuracyLabel = position.coords.accuracy >= 1000
          ? `${(position.coords.accuracy / 1000).toFixed(1)} km`
          : `${Math.round(position.coords.accuracy)} m`;
        setMessage({ type: "error", text: `Location found, but it is only accurate to about ${accuracyLabel}. Turn on precise location/GPS, move near a window, or use your phone, then try again.` });
        setUpdating(false);
        return;
      }
      const response = await fetch("/api/live/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transportId: transport.id, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, heading: position.coords.heading, speed: position.coords.speed }) });
      const data = await response.json();
      if (!response.ok) setMessage({ type: "error", text: data.error });
      else { setPoints(data.points); setMessage({ type: "success", text: data.merged ? "Update added to a nearby vehicle. You earned 1 point." : "A new live vehicle was added. You earned 1 point." }); await refresh(); }
      setUpdating(false);
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionHelp("blocked");
        setMessage({ type: "error", text: "Location is blocked for this site. Change the site permission to Allow, then try again." });
      } else if (error.code === error.TIMEOUT) {
        setMessage({ type: "error", text: "Getting your location took too long. Move near a window and try again." });
      } else {
        setMessage({ type: "error", text: "Your location is currently unavailable. Check that device location is turned on." });
      }
      setUpdating(false);
    }, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  }

  return <div className="live-layout">
    <div className="map-panel">
      <LiveMap vehicles={vehicles} />
      {!vehicles.length && <div className="map-empty-overlay"><BusFront size={30} /><h3>No fresh location yet</h3><p>If you are on this bus, share a safe update to put it on the map.</p></div>}
    </div>
    <aside className="live-sidebar">
      <div className="side-card"><h3>Live passenger activity</h3><p>Counts include people active in the last five minutes.</p><div className="live-counts"><div className="count-box"><Eye size={17} /><strong>{watchers}</strong><small>Watching</small></div><div className="count-box"><UsersRound size={17} /><strong>{travellers}</strong><small>Travelling</small></div></div><div className="action-stack"><button className={`mode-button ${modes.includes("watching") ? "active" : ""}`} onClick={() => toggleMode("watching")}><Eye size={16} />{modes.includes("watching") ? "Stop watching" : "Watch · 1 point"}</button><button className={`mode-button orange ${modes.includes("travelling") ? "active" : ""}`} onClick={() => toggleMode("travelling")}><Navigation size={16} />{modes.includes("travelling") ? "I'm travelling" : "Mark as travelling"}</button></div><p className="point-note"><Coins size={12} /> You have <strong>{points} points</strong></p></div>
      <div className="side-card"><h3>On this bus now?</h3><p>Use your device location to help nearby passengers. Close reports automatically merge into one vehicle.</p><button className="button update-button" onClick={shareLocation} disabled={updating}><LocateFixed size={17} />{updating ? "Getting location…" : "Share live location"}</button><p className="point-note">A useful update earns <strong>+1 point</strong>.</p></div>
      {message && <div className={`alert ${message.type}`}>{message.text}</div>}
      {permissionHelp && <div className="permission-help"><span><ShieldAlert size={19} /></span><div><strong>{permissionHelp === "blocked" ? "Allow location for this site" : "Open JatriLive securely"}</strong>{permissionHelp === "blocked" ? <ol><li>Click the lock or site-controls icon beside the address.</li><li>Set <b>Location</b> to <b>Allow</b>.</li><li>Reload the page and try again.</li></ol> : <p>Use <b>http://localhost:3000</b> during development. A network address such as <b>http://192.168…</b> needs HTTPS.</p>}<button onClick={() => window.location.reload()}><RefreshCw size={13} /> Reload page</button></div></div>}
      <div className="side-card"><h3><Bell size={15} /> Update reminders</h3><p>Travellers can receive an alert when people are watching and no fresh update has arrived for one minute.</p></div>
      <div className="side-card"><h3>Documented routes</h3>{transport.routeVariants?.length ? <div className="route-variants">{transport.routeVariants.map((variant, index) => <details key={`${variant.routeName}-${index}`} open={transport.routeVariants?.length === 1}><summary>{variant.routeName}</summary><div className="route-stops">{variant.routeStops.map((stop, stopIndex) => <span key={`${stop}-${stopIndex}`}>{stop}</span>)}</div><small>Source: {variant.source}</small></details>)}</div> : <div className="route-stops">{transport.routeStops.map((stop) => <span key={stop}>{stop}</span>)}</div>}</div>
    </aside>
  </div>;
}
