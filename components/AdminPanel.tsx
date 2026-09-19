"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, Database, Eye, LocateFixed, Plus, UsersRound } from "lucide-react";
import type { TransportCardData } from "@/components/TransportExplorer";

type Stats = { users: number; transports: number; liveVehicles: number; updatesToday: number; watchers: number; travellers: number };
type ReviewFlag = { id: string; reason: string; note: string; createdAt: string; transportName: string; coordinates: [number, number] | null; vehicleUpdatedAt: string | null; updateCount: number };

export function AdminPanel({ transports, stats, flags }: { transports: TransportCardData[]; stats: Stats; flags: ReviewFlag[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  async function addTransport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), routeName: form.get("routeName"), routeStops: String(form.get("routeStops")).split(/,|→/).map((item) => item.trim()).filter(Boolean), imageUrl: form.get("imageUrl"), color: form.get("color"), fareMin: form.get("fareMin") ? Number(form.get("fareMin")) : null, fareMax: form.get("fareMax") ? Number(form.get("fareMax")) : null, fareNote: form.get("fareNote"), fareSourceUrl: form.get("fareSourceUrl") };
    const response = await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) setMessage({ type: "error", text: data.error || "Could not add transport." });
    else { setMessage({ type: "success", text: `${body.name} was added.` }); (event.currentTarget as HTMLFormElement).reset(); router.refresh(); }
    setLoading(false);
  }
  async function reviewFlag(id: string, decision: "confirmed" | "dismissed") {
    const response = await fetch("/api/admin/flags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
    if (response.ok) router.refresh();
  }
  const cards = [
    ["Users", stats.users, UsersRound], ["Transports", stats.transports, BusFront], ["Live vehicles", stats.liveVehicles, LocateFixed],
    ["Updates today", stats.updatesToday, Database], ["Watching now", stats.watchers, Eye], ["Travelling now", stats.travellers, UsersRound],
  ] as const;
  return <><div className="stat-grid">{cards.map(([label, value, Icon]) => <div className="stat-card" key={label}><span><Icon size={17} />{label}</span><strong>{value}</strong></div>)}</div><div className="admin-layout"><section className="dashboard-card"><h2>Transport directory</h2><div className="admin-list">{transports.map((item) => <div className="admin-transport" key={item.id}><div><h3>{item.name}</h3><p>{item.routeName}</p></div><span className="route-badge">{item.vehicles} live · {item.watchers} watching</span></div>)}</div></section><section className="dashboard-card"><h2><Plus size={16} /> Add transport</h2><form className="form-grid" onSubmit={addTransport}><div className="field"><label>Company name</label><input name="name" placeholder="e.g. Alif Paribahan" required /></div><div className="field"><label>Route title</label><input name="routeName" placeholder="Mirpur 14 → Motijheel" required /></div><div className="field"><label>Stops</label><textarea name="routeStops" placeholder="Mirpur 14, Kazipara, Farmgate, Motijheel" required /></div><div className="field"><label>Fare range (BDT)</label><div className="inline-fields"><input name="fareMin" type="number" min="0" placeholder="Min" /><input name="fareMax" type="number" min="0" placeholder="Max" /></div></div><div className="field"><label>Fare note</label><input name="fareNote" placeholder="Verify onboard / distance based" /></div><div className="field"><label>Official fare source</label><input name="fareSourceUrl" type="url" placeholder="https://…" /></div><div className="field"><label>Image URL (optional)</label><input name="imageUrl" type="url" placeholder="https://…" /></div><div className="field"><label>Route color</label><input name="color" type="color" defaultValue="#ff5c35" /></div>{message && <div className={`alert ${message.type}`}>{message.text}</div>}<button className="button wide" disabled={loading}>{loading ? "Adding…" : "Add transport"}</button></form><p style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.5, marginTop: 15 }}>No dependable current public Dhaka bus API is connected. Add and verify operators and fares manually here.</p></section></div><section className="dashboard-card review-queue"><h2>Report review queue <span className="route-badge">{flags.length} pending</span></h2>{flags.length ? flags.map((flag) => <div className="review-row" key={flag.id}><div><strong>{flag.transportName} · {flag.reason.replace("_", " ")}</strong><small>{flag.note || "No additional note"} · {flag.updateCount} reports · {flag.vehicleUpdatedAt ? new Date(flag.vehicleUpdatedAt).toLocaleString() : "vehicle expired"}</small>{flag.coordinates && <a href={`https://www.openstreetmap.org/?mlat=${flag.coordinates[1]}&mlon=${flag.coordinates[0]}#map=17/${flag.coordinates[1]}/${flag.coordinates[0]}`} target="_blank" rel="noreferrer">Inspect location ↗</a>}</div><div><button onClick={() => reviewFlag(flag.id, "dismissed")}>Dismiss</button><button className="danger" onClick={() => reviewFlag(flag.id, "confirmed")}>Confirm issue</button></div></div>) : <div className="empty-state"><Database size={28} /><h3>No reports waiting</h3><p>Passenger flags will appear here for review.</p></div>}</section></>;
}
