"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, Database, Eye, LocateFixed, Pencil, Plus, UsersRound, X } from "lucide-react";
import type { TransportCardData } from "@/components/TransportExplorer";

type Stats = { users: number; transports: number; liveVehicles: number; updatesToday: number; watchers: number; travellers: number };
type ReviewFlag = { id: string; reason: string; note: string; createdAt: string; transportName: string; coordinates: [number, number] | null; vehicleUpdatedAt: string | null; updateCount: number };

export function AdminPanel({ transports, stats, flags }: { transports: TransportCardData[]; stats: Stats; flags: ReviewFlag[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<TransportCardData | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function saveTransport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const body = transportBody(form, editing?.id);
      const response = await fetch("/api/transports", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Could not ${editing ? "update" : "add"} transport.`);
      setMessage({ type: "success", text: `${body.name} was ${editing ? "updated" : "added"}.` });
      formElement.reset(); setEditing(null); router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not save transport." });
    } finally { setLoading(false); }
  }

  async function reviewFlag(id: string, decision: "confirmed" | "dismissed") {
    const response = await fetch("/api/admin/flags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
    if (response.ok) router.refresh();
    else setMessage({ type: "error", text: "Could not review this report." });
  }

  const cards = [
    ["Users", stats.users, UsersRound], ["Transports", stats.transports, BusFront], ["Live vehicles", stats.liveVehicles, LocateFixed],
    ["Updates today", stats.updatesToday, Database], ["Watching now", stats.watchers, Eye], ["Travelling now", stats.travellers, UsersRound],
  ] as const;

  return <>
    <div className="stat-grid">{cards.map(([label, value, Icon]) => <div className="stat-card" key={label}><span><Icon size={17} />{label}</span><strong>{value}</strong></div>)}</div>
    <div className="admin-layout">
      <section className="dashboard-card"><h2>Transport directory</h2><div className="admin-list">{transports.map((item) => <div className="admin-transport" key={item.id}><div><h3>{item.name}</h3><p>{item.routeName}</p></div><div className="admin-transport-actions"><span className="route-badge">{item.vehicles} live · {item.watchers} watching</span><button onClick={() => { setEditing(item); setMessage(null); }}><Pencil size={13} /> Edit</button></div></div>)}</div></section>
      <section className="dashboard-card">
        <div className="card-heading"><h2>{editing ? <><Pencil size={16} /> Edit transport</> : <><Plus size={16} /> Add transport</>}</h2>{editing && <button className="icon-button" onClick={() => setEditing(null)} aria-label="Cancel editing"><X size={17} /></button>}</div>
        <TransportForm key={editing?.id || "new"} transport={editing} loading={loading} message={message} onSubmit={saveTransport} />
        <p className="admin-form-help">Coordinates enable ETA and approaching-stop alerts. Enter one stop per line as <code>Name | Bangla name | latitude | longitude</code>.</p>
      </section>
    </div>
    <section className="dashboard-card review-queue"><h2>Report review queue <span className="route-badge">{flags.length} pending</span></h2>{flags.length ? flags.map((flag) => <div className="review-row" key={flag.id}><div><strong>{flag.transportName} · {flag.reason.replace("_", " ")}</strong><small>{flag.note || "No additional note"} · {flag.updateCount} reports · {flag.vehicleUpdatedAt ? new Date(flag.vehicleUpdatedAt).toLocaleString() : "vehicle expired"}</small>{flag.coordinates && <a href={`https://www.openstreetmap.org/?mlat=${flag.coordinates[1]}&mlon=${flag.coordinates[0]}#map=17/${flag.coordinates[1]}/${flag.coordinates[0]}`} target="_blank" rel="noreferrer">Inspect captured location ↗</a>}</div><div><button onClick={() => reviewFlag(flag.id, "dismissed")}>Dismiss</button><button className="danger" onClick={() => reviewFlag(flag.id, "confirmed")}>Confirm issue</button></div></div>) : <div className="empty-state"><Database size={28} /><h3>No reports waiting</h3><p>Passenger flags will appear here for review.</p></div>}</section>
  </>;
}

function TransportForm({ transport, loading, message, onSubmit }: { transport: TransportCardData | null; loading: boolean; message: { type: "error" | "success"; text: string } | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="form-grid" onSubmit={onSubmit}>
    <div className="inline-fields"><div className="field"><label>Company name</label><input name="name" defaultValue={transport?.name || ""} required /></div><div className="field"><label>Company name (Bangla)</label><input name="nameBn" defaultValue={transport?.nameBn || ""} /></div></div>
    <div className="inline-fields"><div className="field"><label>Route title</label><input name="routeName" defaultValue={transport?.routeName || ""} required /></div><div className="field"><label>Route title (Bangla)</label><input name="routeNameBn" defaultValue={transport?.routeNameBn || ""} /></div></div>
    <div className="field"><label>Stops</label><textarea name="routeStops" defaultValue={transport?.routeStops.join(", ") || ""} required /></div>
    <div className="field"><label>Stops (Bangla, same order)</label><textarea name="routeStopsBn" defaultValue={transport?.routeStopsBn?.join(", ") || ""} /></div>
    <div className="field"><label>Stop coordinates</label><textarea name="stopCoords" placeholder="Mirpur 10 | মিরপুর ১০ | 23.8067 | 90.3687" defaultValue={formatCoordinates(transport?.stopCoords)} /></div>
    <div className="field"><label>Fare range (BDT)</label><div className="inline-fields"><input name="fareMin" type="number" min="0" placeholder="Min" defaultValue={transport?.fareMin ?? ""} /><input name="fareMax" type="number" min="0" placeholder="Max" defaultValue={transport?.fareMax ?? ""} /></div></div>
    <div className="field"><label>Fare note</label><input name="fareNote" defaultValue={transport?.fareNote || ""} /></div>
    <div className="field"><label>Official fare source</label><input name="fareSourceUrl" type="url" defaultValue={transport?.fareSourceUrl || ""} /></div>
    <div className="field"><label>Image URL (optional)</label><input name="imageUrl" type="url" defaultValue={transport?.imageUrl || ""} /></div>
    <div className="field"><label>Route color</label><input name="color" type="color" defaultValue={transport?.color || "#ff5c35"} /></div>
    {message && <div className={`alert ${message.type}`}>{message.text}</div>}
    <button className="button wide" disabled={loading}>{loading ? "Saving…" : transport ? "Save changes" : "Add transport"}</button>
  </form>;
}

function transportBody(form: FormData, id?: string) {
  return {
    ...(id ? { id } : {}), name: String(form.get("name")), nameBn: String(form.get("nameBn") || ""),
    routeName: String(form.get("routeName")), routeNameBn: String(form.get("routeNameBn") || ""),
    routeStops: splitStops(form.get("routeStops")), routeStopsBn: splitStops(form.get("routeStopsBn")),
    stopCoords: parseCoordinates(String(form.get("stopCoords") || "")), imageUrl: String(form.get("imageUrl") || ""), color: String(form.get("color") || "#ff5c35"),
    fareMin: form.get("fareMin") ? Number(form.get("fareMin")) : null, fareMax: form.get("fareMax") ? Number(form.get("fareMax")) : null,
    fareNote: String(form.get("fareNote") || ""), fareSourceUrl: String(form.get("fareSourceUrl") || ""),
  };
}

function splitStops(value: FormDataEntryValue | null) { return String(value || "").split(/,|→/).map((item) => item.trim()).filter(Boolean); }
function parseCoordinates(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, nameBn = "", lat, lng] = line.split("|").map((part) => part.trim());
    return { name, nameBn, lat: Number(lat), lng: Number(lng) };
  });
}
function formatCoordinates(values?: Array<{ name: string; nameBn?: string; lat: number; lng: number }>) { return values?.map((stop) => `${stop.name} | ${stop.nameBn || ""} | ${stop.lat} | ${stop.lng}`).join("\n") || ""; }
