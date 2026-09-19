"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, Database, Eye, LocateFixed, Plus, UsersRound } from "lucide-react";
import type { TransportCardData } from "@/components/TransportExplorer";

type Stats = { users: number; transports: number; liveVehicles: number; updatesToday: number; watchers: number; travellers: number };

export function AdminPanel({ transports, stats }: { transports: TransportCardData[]; stats: Stats }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  async function addTransport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), routeName: form.get("routeName"), routeStops: String(form.get("routeStops")).split(/,|→/).map((item) => item.trim()).filter(Boolean), imageUrl: form.get("imageUrl"), color: form.get("color") };
    const response = await fetch("/api/transports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) setMessage({ type: "error", text: data.error || "Could not add transport." });
    else { setMessage({ type: "success", text: `${body.name} was added.` }); (event.currentTarget as HTMLFormElement).reset(); router.refresh(); }
    setLoading(false);
  }
  const cards = [
    ["Users", stats.users, UsersRound], ["Transports", stats.transports, BusFront], ["Live vehicles", stats.liveVehicles, LocateFixed],
    ["Updates today", stats.updatesToday, Database], ["Watching now", stats.watchers, Eye], ["Travelling now", stats.travellers, UsersRound],
  ] as const;
  return <><div className="stat-grid">{cards.map(([label, value, Icon]) => <div className="stat-card" key={label}><span><Icon size={17} />{label}</span><strong>{value}</strong></div>)}</div><div className="admin-layout"><section className="dashboard-card"><h2>Transport directory</h2><div className="admin-list">{transports.map((item) => <div className="admin-transport" key={item.id}><div><h3>{item.name}</h3><p>{item.routeName}</p></div><span className="route-badge">{item.vehicles} live · {item.watchers} watching</span></div>)}</div></section><section className="dashboard-card"><h2><Plus size={16} /> Add transport</h2><form className="form-grid" onSubmit={addTransport}><div className="field"><label>Company name</label><input name="name" placeholder="e.g. Alif Paribahan" required /></div><div className="field"><label>Route title</label><input name="routeName" placeholder="Mirpur 14 → Motijheel" required /></div><div className="field"><label>Stops</label><textarea name="routeStops" placeholder="Mirpur 14, Kazipara, Farmgate, Motijheel" required /></div><div className="field"><label>Image URL (optional)</label><input name="imageUrl" type="url" placeholder="https://…" /></div><div className="field"><label>Route color</label><input name="color" type="color" defaultValue="#ff5c35" /></div>{message && <div className={`alert ${message.type}`}>{message.text}</div>}<button className="button wide" disabled={loading}>{loading ? "Adding…" : "Add transport"}</button></form><p style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.5, marginTop: 15 }}>No dependable current public Dhaka bus API is connected. Add and verify operators manually here; GTFS import can be added when an official maintained feed is available.</p></section></div></>;
}
