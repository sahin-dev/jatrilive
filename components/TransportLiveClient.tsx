"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Bell, BusFront, Coins, Eye, Flag, Gauge, LocateFixed, MapPin, Navigation, RefreshCw, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDict, type Lang } from "@/lib/i18n";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false, loading: () => <div className="live-map" /> });

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
  lastConfirmedStop: string | null;
  crowding: { level: string; reports: number; updatedAt: string } | null;
  eta: { nextStopIndex: number; direction: "forward" | "reverse"; etas: Array<{ stopIndex: number; stopName: string; etaMinutes: null | number }> } | null;
};
type Transport = {
  id: string; slug: string; name: string; routeName: string; routeStops: string[];
  routeVariants?: Array<{ routeName: string; routeStops: string[]; source: string }>;
  stopCoords?: Array<{ name: string; lat: number; lng: number }>;
  reliability?: { score: number; label: "strong" | "fair" | "limited"; updates7d: number; activeDays7d: number; averageMinutesBetweenUpdates: number | null };
  fareMin?: number | null; fareMax?: number | null; fareCurrency?: string; fareNote?: string; fareSourceUrl?: string;
};
type StopAlertItem = { id: string; stopIndex: number; stopName: string; stopsBefore: number };

export function TransportLiveClient({ transport, lang }: { transport: Transport; lang: Lang }) {
  const router = useRouter();
  const t = getDict(lang);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [watchers, setWatchers] = useState(0);
  const [travellers, setTravellers] = useState(0);
  const [points, setPoints] = useState(0);
  const [modes, setModes] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [permissionHelp, setPermissionHelp] = useState<"blocked" | "insecure" | null>(null);
  const [crowdChoice, setCrowdChoice] = useState<string | null>(null);
  const [crowdSent, setCrowdSent] = useState(false);
  const [alerts, setAlerts] = useState<StopAlertItem[]>([]);
  const [alertStop, setAlertStop] = useState(0);
  const [alertDistance, setAlertDistance] = useState<1 | 2 | 3>(2);
  const [alertBusy, setAlertBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/${transport.id}`, { cache: "no-store" });
      if (response.status === 401) { router.push(`/login?next=${encodeURIComponent(`/transports/${transport.slug}`)}`); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh live data.");
      setVehicles(data.vehicles); setWatchers(data.watchers); setTravellers(data.travellers);
      setPoints(data.points); setModes(data.myModes);
      setAlerts(data.alerts || []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not refresh live data." });
    }
  }, [router, transport.id, transport.slug]);

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 15_000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      modes.forEach((mode) => fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transportId: transport.id, mode, active: true }) }).catch(() => undefined));
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [modes, transport.id]);

  async function toggleMode(mode: "watching" | "travelling") {
    setMessage(null);
    try {
      const active = !modes.includes(mode);
      if (mode === "travelling" && active && "Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      const response = await fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transportId: transport.id, mode, active }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your status.");
      setModes((current) => active ? [...current, mode] : current.filter((item) => item !== mode));
      setPoints(data.points);
      await refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not update your status." });
    }
  }

  async function shareLocation() {
    setMessage(null);
    setCrowdSent(false);
    setPermissionHelp(null);
    if (!window.isSecureContext) { setPermissionHelp("insecure"); setMessage({ type: "error", text: "Location access requires HTTPS or localhost." }); return; }
    if (!navigator.geolocation) { setMessage({ type: "error", text: "Location is not supported by this browser." }); return; }
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
        const accuracyLabel = position.coords.accuracy >= 1000 ? `${(position.coords.accuracy / 1000).toFixed(1)} km` : `${Math.round(position.coords.accuracy)} m`;
        setMessage({ type: "error", text: `Location found, but it is only accurate to about ${accuracyLabel}. Turn on precise location/GPS, move near a window, or use your phone, then try again.` });
        setUpdating(false);
        return;
      }
      try {
        const response = await fetch("/api/live/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          transportId: transport.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          crowding: crowdChoice,
        }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not share this location.");
        setPoints(data.points);
        setMessage({ type: "success", text: data.rewarded === false ? (lang === "bn" ? "লোকেশন আপডেট হয়েছে। পরবর্তী পয়েন্টের জন্য একটু অপেক্ষা করুন।" : "Location updated. Wait briefly before earning another point.") : data.merged ? t.updateMergedMsg : t.updateNewMsg });
        setCrowdSent(Boolean(crowdChoice));
        setCrowdChoice(null);
        await refresh();
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not share this location." });
      } finally {
        setUpdating(false);
      }
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

  function etaSummary(vehicle: Vehicle) {
    if (!vehicle.eta) return null;
    const next = vehicle.eta.etas.find((entry) => entry.stopIndex === vehicle.eta?.nextStopIndex);
    if (!next || next.etaMinutes === null) return null;
    return { name: next.stopName, minutes: next.etaMinutes, stopsAway: 1 };
  }

  function crowdLabel(value: string | null) {
    switch (value) {
      case "empty": return t.crowdEmptyShort;
      case "seats": return t.crowdSeatsShort;
      case "standing": return t.crowdStandingShort;
      case "packed": return t.crowdPackedShort;
      default: return null;
    }
  }

  async function saveAlert() {
    setAlertBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/stop-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transportId: transport.id, stopIndex: alertStop, stopsBefore: alertDistance }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save alert.");
      setMessage({ type: "success", text: lang === "bn" ? "স্টপ অ্যালার্ট চালু হয়েছে।" : "Stop alert enabled." });
      await refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not save alert." });
    } finally { setAlertBusy(false); }
  }

  async function removeAlert(id: string) {
    try {
      const response = await fetch(`/api/stop-alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove alert.");
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not remove alert." }); }
  }

  async function flagVehicle(vehicleId: string) {
    if (!window.confirm(lang === "bn" ? "এই লোকেশনটি ভুল বলে রিপোর্ট করবেন?" : "Report this live location as inaccurate?")) return;
    try {
      const response = await fetch("/api/reports/flag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId, reason: "inaccurate" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not report this update.");
      setMessage({ type: "success", text: lang === "bn" ? "অ্যাডমিন পর্যালোচনার জন্য পাঠানো হয়েছে।" : "Sent to the admin review queue." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not report this update." }); }
  }

  const hasCoords = (transport.stopCoords?.length ?? 0) > 0;
  const stops = hasCoords ? transport.stopCoords!.map((s) => s.name) : transport.routeStops;
  const number = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en");

  return <div className="live-layout">
    <div className="map-panel">
      <LiveMap vehicles={vehicles} stopCoords={transport.stopCoords} lang={lang} />
      {!vehicles.length && <div className="map-empty-overlay"><BusFront size={30} /><h3>{t.noFreshLocation}</h3><p>{t.noFreshHelp}</p></div>}
    </div>
    <aside className="live-sidebar">
      <div className="side-card"><h3>{t.liveActivity}</h3><p>{t.countsInclude}</p>
        <div className="live-counts"><div className="count-box"><Eye size={17} /><strong>{watchers}</strong><small>{t.watching}</small></div><div className="count-box"><UsersRound size={17} /><strong>{travellers}</strong><small>{t.travelling}</small></div></div>
        <div className="action-stack">
          <button className={`mode-button ${modes.includes("watching") ? "active" : ""}`} onClick={() => toggleMode("watching")}><Eye size={16} />{modes.includes("watching") ? t.stopWatching : t.watchCost}</button>
          <button className={`mode-button orange ${modes.includes("travelling") ? "active" : ""}`} onClick={() => toggleMode("travelling")}><Navigation size={16} />{modes.includes("travelling") ? t.imTravelling : t.markTravelling}</button>
        </div>
        <p className="point-note"><Coins size={12} /> {t.youHavePoints} <strong>{points} {t.pointsWord}</strong></p>
      </div>

      <div className="side-card share-card"><h3>{t.onThisBus}</h3><p>{t.shareHelp}</p>
        <div className="crowd-picker">
          <span className="crowd-title">{t.crowdLabelTitle}</span>
          <div className="crowd-options">
            {[["empty", t.crowdEmpty], ["seats", t.crowdSeats], ["standing", t.crowdStanding], ["packed", t.crowdPacked]].map(([value, label]) => (
              <button type="button" key={value} className={`crowd-chip ${crowdChoice === value ? "selected" : ""}`} onClick={() => setCrowdChoice(crowdChoice === value ? null : value)}>{label}</button>
            ))}
          </div>
          {crowdSent && <span className="crowd-sent">{t.crowdPending}</span>}
        </div>
        <button className="button update-button" onClick={shareLocation} disabled={updating}><LocateFixed size={17} />{updating ? t.gettingLocation : t.shareLiveLocation}</button>
        <p className="point-note">{lang === "bn" ? "যোগ্য আপডেটে" : "Eligible updates earn"} <strong>+1 {t.pointsWord}</strong></p>
      </div>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      {hasCoords && vehicles.length > 0 && (
        <div className="side-card">
          <h3>{t.upNext}</h3>
          <div className="eta-list">
            {vehicles.map((vehicle, index) => {
              const summary = etaSummary(vehicle);
              return <div className="eta-row" key={vehicle.id}>
                <span className="eta-bus"><BusFront size={14} /> {t.bus} {number.format(index + 1)}</span>
                <span className="eta-details">
                  {summary ? <span className="eta-value">≈ {number.format(summary.minutes)} {t.minutesShort} → {summary.name}</span> : <span className="eta-unknown">{t.etaUnknown}</span>}
                  {vehicle.crowding && <span className={`crowd-status crowd-${vehicle.crowding.level}`}>{crowdLabel(vehicle.crowding.level)} · {number.format(vehicle.crowding.reports)} {t.reports}</span>}
                </span>
              </div>;
            })}
          </div>
        </div>
      )}

      {vehicles.length > 0 && <div className="side-card"><h3>{lang === "bn" ? "লাইভ বাসের বিস্তারিত" : "Live vehicle details"}</h3><div className="vehicle-detail-list">{vehicles.map((vehicle, index) => <div className="vehicle-detail" key={vehicle.id}><div className="vehicle-detail-head"><strong><BusFront size={14} /> {t.bus} {number.format(index + 1)}</strong><span className={`confidence-chip ${vehicle.witnessCount >= 3 ? "high" : ""}`}>{vehicle.witnessCount} {lang === "bn" ? "সাক্ষী" : "witnesses"}</span></div><div className="vehicle-metrics"><span><Gauge size={13} /> {vehicle.speed !== null ? `${number.format(Math.round(vehicle.speed * 3.6))} km/h` : "—"}</span><span><Navigation size={13} style={{ transform: `rotate(${vehicle.heading || 0}deg)` }} /> {vehicle.heading !== null ? `${number.format(Math.round(vehicle.heading))}°` : "—"}</span><span><ShieldCheck size={13} /> {number.format(vehicle.confidence)}</span></div>{vehicle.lastConfirmedStop && <small><MapPin size={12} /> {lang === "bn" ? "শেষ নিশ্চিত" : "Last confirmed near"} {vehicle.lastConfirmedStop}</small>}<button className="flag-button" onClick={() => flagVehicle(vehicle.id)}><Flag size={11} /> {lang === "bn" ? "সমস্যা জানান" : "Report issue"}</button></div>)}</div></div>}

      {hasCoords && <div className="side-card"><h3><Bell size={15} /> {lang === "bn" ? "স্টপ অ্যালার্ট" : "Approaching-stop alert"}</h3><p>{lang === "bn" ? "বাস আপনার স্টপের কাছাকাছি এলে জানুন।" : "Get notified when a bus is close to your stop."}</p><div className="alert-form"><select value={alertStop} onChange={(event) => setAlertStop(Number(event.target.value))}>{transport.stopCoords!.map((stop, index) => <option value={index} key={`${stop.name}-${index}`}>{stop.name}</option>)}</select><select value={alertDistance} onChange={(event) => setAlertDistance(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>1 {t.etaStops}</option><option value={2}>2 {t.etaStops}</option><option value={3}>3 {t.etaStops}</option></select><button className="mode-button" onClick={saveAlert} disabled={alertBusy}><Bell size={14} /> {lang === "bn" ? "অ্যালার্ট চালু করুন" : "Set alert"}</button></div>{alerts.length > 0 && <div className="saved-alerts">{alerts.map((alert) => <span key={alert.id}>{alert.stopName} · {alert.stopsBefore} {t.etaStops}<button onClick={() => removeAlert(alert.id)}>×</button></span>)}</div>}</div>}

      <div className="side-card route-insight-card"><h3>{lang === "bn" ? "রুটের নির্ভরযোগ্যতা ও ভাড়া" : "Reliability & fare"}</h3><div className="reliability-meter"><span style={{ width: `${transport.reliability?.score || 0}%` }} /></div><p>{transport.reliability?.updates7d ? <><strong>{transport.reliability.score}% {lang === "bn" ? reliabilityLabelBn(transport.reliability.label) : transport.reliability.label}</strong> · {transport.reliability.updates7d} {lang === "bn" ? "আপডেট / ৭ দিন" : "updates in 7 days"}</> : <strong>{lang === "bn" ? "সাম্প্রতিক তথ্য নেই" : "No recent reliability data"}</strong>}</p>{transport.fareMin !== null && transport.fareMin !== undefined ? <p className="fare-line"><strong>৳{transport.fareMin}{transport.fareMax ? `–৳${transport.fareMax}` : "+"}</strong> {transport.fareNote}</p> : <p className="fare-line">{transport.fareNote || (lang === "bn" ? "ভাড়ার তথ্য যাচাই করা হচ্ছে।" : "Fare details are awaiting verification.")}</p>}{transport.fareSourceUrl && <a href={transport.fareSourceUrl} target="_blank" rel="noreferrer" className="source-link">{lang === "bn" ? "বিআরটিএ ভাড়ার তালিকা ↗" : "Official BRTA fare chart ↗"}</a>}</div>

      {permissionHelp && <div className="permission-help"><span><ShieldAlert size={19} /></span><div><strong>{permissionHelp === "blocked" ? (lang === "bn" ? "এই সাইটের জন্য লোকেশন অনুমোদন দিন" : "Allow location for this site") : (lang === "bn" ? "নিরাপদে JatriLive খুলুন" : "Open JatriLive securely")}</strong>{permissionHelp === "blocked" ? <ol><li>{lang === "bn" ? "ঠিকানার পাশের লক আইকনে ক্লিক করুন।" : "Click the lock or site-controls icon beside the address."}</li><li>{lang === "bn" ? "Location কে Allow করুন।" : "Set Location to Allow."}</li><li>{lang === "bn" ? "পেজ রিলোড করে আবার চেষ্টা করুন।" : "Reload the page and try again."}</li></ol> : <p>{lang === "bn" ? "ডেভেলপমেন্টে http://localhost:3000 ব্যবহার করুন। নেটওয়ার্ক অ্যাড্রেসে HTTPS দরকার।" : "Use http://localhost:3000 during development. A network address such as http://192.168… needs HTTPS."}</p>}<button onClick={() => window.location.reload()}><RefreshCw size={13} /> {lang === "bn" ? "রিলোড" : "Reload page"}</button></div></div>}
      <div className="side-card"><h3><Bell size={15} /> {t.updateReminders}</h3><p>{t.remindersHelp}</p></div>
      <div className="side-card"><h3>{t.documentedRoutes}</h3>{transport.routeVariants?.length ? <div className="route-variants">{transport.routeVariants.map((variant, index) => <details key={`${variant.routeName}-${index}`} open={transport.routeVariants?.length === 1}><summary>{variant.routeName}</summary><div className="route-stops">{variant.routeStops.map((stop, stopIndex) => <span key={`${stop}-${stopIndex}`}>{stop}</span>)}</div><small>{lang === "bn" ? "উৎস" : "Source"}: {variant.source}</small></details>)}</div> : <div className="route-stops">{stops.map((stop) => <span key={stop}>{stop}</span>)}</div>}</div>
    </aside>
  </div>;
}

function reliabilityLabelBn(label?: "strong" | "fair" | "limited") {
  return label === "strong" ? "শক্তিশালী" : label === "fair" ? "মাঝারি" : "সীমিত";
}
