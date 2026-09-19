"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BusFront, Eye, MapPin, Search, UsersRound } from "lucide-react";
import { getDict, type Lang } from "@/lib/i18n";

export type TransportCardData = {
  id: string; name: string; slug: string; imageUrl?: string; routeName: string;
  routeStops: string[]; color: string; watchers: number; travellers: number; vehicles: number;
  nameBn?: string; routeNameBn?: string; routeStopsBn?: string[];
  stopCoords?: Array<{ name: string; nameBn?: string; lat: number; lng: number }>;
  searchText?: string;
  reliability?: { score: number; label: "strong" | "fair" | "limited"; updates7d: number; activeDays7d: number; averageMinutesBetweenUpdates: number | null; lastUpdateAt: string | null };
  fareMin?: number | null; fareMax?: number | null; fareCurrency?: string; fareNote?: string; fareSourceUrl?: string;
};

export function TransportExplorer({ transports, lang = "en" }: { transports: TransportCardData[]; lang?: Lang }) {
  const t = getDict(lang);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transports;
    return transports.filter((item) => `${item.name} ${item.routeName} ${item.routeStops.join(" ")} ${item.searchText || ""}`.toLowerCase().includes(q));
  }, [search, transports]);

  return (
    <>
      <div className="search-box">
        <Search size={22} />
        <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === "bn" ? "বাস, রুট বা স্টপ খুঁজুন — যেমন আলিফ, মিরপুর" : "Search bus, route, or stop — e.g. Alif, Mirpur"} aria-label="Search transports" />
        <span className="kbd">Ctrl K</span>
      </div>
      <div className="result-head">
        <p><strong>{filtered.length}</strong> {t.routesAvailable}</p>
        <span><i className="live-dot" /> {t.updatedByPassengers}</span>
      </div>
      {filtered.length ? (
        <div className="transport-grid">
          {filtered.map((transport) => (
            <Link href={`/transports/${transport.slug}`} className="transport-card" key={transport.id}>
              <div className="route-visual" style={{ "--route-color": transport.color } as React.CSSProperties}>
                <div className="bus-icon"><BusFront size={25} /></div>
                <div className="route-line"><i /><i /><i /><i /></div>
                <span className="vehicle-chip">{transport.vehicles ? `${transport.vehicles} ${t.live}` : t.awaitingUpdate}</span>
              </div>
              <div className="card-content">
                <div className="card-title-row"><div><span className="eyebrow">{t.publicBus}</span><h3>{transport.name}</h3></div><ArrowRight size={20} /></div>
                <p className="route-name"><MapPin size={16} /> {transport.routeName}</p>
                <div className="stops-preview">{transport.routeStops.slice(0, 3).map((stop) => <span key={stop}>{stop}</span>)}</div>
                <div className="card-stats">
                  <span><Eye size={17} /><strong>{transport.watchers}</strong> {t.watching.toLowerCase()}</span>
                  <span><UsersRound size={17} /><strong>{transport.travellers}</strong> {t.travelling.toLowerCase()}</span>
                  <span className={`reliability reliability-${transport.reliability?.label || "limited"}`}><strong>{transport.reliability?.updates7d ? `${transport.reliability.score}%` : "—"}</strong> {transport.reliability?.updates7d ? (lang === "bn" ? "নির্ভরযোগ্য" : "reliable") : (lang === "bn" ? "তথ্য নেই" : "no data")}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <div className="empty-state"><BusFront size={36} /><h3>{t.noRouteFound}</h3><p>{t.noRouteHelp}</p></div>}
    </>
  );
}
