"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BusFront, Eye, MapPin, Search, UsersRound } from "lucide-react";

export type TransportCardData = {
  id: string; name: string; slug: string; imageUrl?: string; routeName: string;
  routeStops: string[]; color: string; watchers: number; travellers: number; vehicles: number;
};

export function TransportExplorer({ transports }: { transports: TransportCardData[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transports;
    return transports.filter((item) => `${item.name} ${item.routeName} ${item.routeStops.join(" ")}`.toLowerCase().includes(q));
  }, [search, transports]);

  return (
    <>
      <div className="search-box">
        <Search size={22} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bus, route, or stop — e.g. Alif, Mirpur" aria-label="Search transports" />
        <span className="kbd">⌘ K</span>
      </div>
      <div className="result-head">
        <p><strong>{filtered.length}</strong> routes available</p>
        <span><i className="live-dot" /> Updated by passengers</span>
      </div>
      {filtered.length ? (
        <div className="transport-grid">
          {filtered.map((transport) => (
            <Link href={`/transports/${transport.slug}`} className="transport-card" key={transport.id}>
              <div className="route-visual" style={{ "--route-color": transport.color } as React.CSSProperties}>
                <div className="bus-icon"><BusFront size={25} /></div>
                <div className="route-line"><i /><i /><i /><i /></div>
                <span className="vehicle-chip">{transport.vehicles ? `${transport.vehicles} live` : "Awaiting update"}</span>
              </div>
              <div className="card-content">
                <div className="card-title-row"><div><span className="eyebrow">PUBLIC BUS</span><h3>{transport.name}</h3></div><ArrowRight size={20} /></div>
                <p className="route-name"><MapPin size={16} /> {transport.routeName}</p>
                <div className="stops-preview">{transport.routeStops.slice(0, 3).map((stop) => <span key={stop}>{stop}</span>)}</div>
                <div className="card-stats">
                  <span><Eye size={17} /><strong>{transport.watchers}</strong> watching</span>
                  <span><UsersRound size={17} /><strong>{transport.travellers}</strong> travelling</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <div className="empty-state"><BusFront size={36} /><h3>No route found</h3><p>Try a company name, route, or nearby stop.</p></div>}
    </>
  );
}
