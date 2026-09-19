"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BusFront, CircleDot, Repeat2, Search } from "lucide-react";
import type { TransportCardData } from "@/components/TransportExplorer";
import type { Lang } from "@/lib/i18n";

type DirectPlan = { type: "direct"; route: TransportCardData; from: string; to: string; stops: number };
type TransferPlan = { type: "transfer"; first: TransportCardData; second: TransportCardData; from: string; transfer: string; to: string; stops: number };
type Plan = DirectPlan | TransferPlan;

export function JourneyPlanner({ transports, lang }: { transports: TransportCardData[]; lang: Lang }) {
  const allStops = useMemo(() => [...new Set(transports.flatMap((route) => route.routeStops))].sort((a, b) => a.localeCompare(b)), [transports]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [plans, setPlans] = useState<Plan[] | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const origin = resolveStop(from, allStops);
    const destination = resolveStop(to, allStops);
    if (!origin || !destination || origin === destination) { setPlans([]); return; }
    setPlans(buildPlans(transports, origin, destination));
  }

  return <div className="journey-shell">
    <form className="journey-form" onSubmit={submit}>
      <label><span><CircleDot size={15} /> {lang === "bn" ? "কোথা থেকে" : "From"}</span><input list="journey-stops" value={from} onChange={(event) => setFrom(event.target.value)} placeholder={lang === "bn" ? "যেমন মিরপুর ১০" : "e.g. Mirpur 10"} required /></label>
      <ArrowRight className="journey-arrow" />
      <label><span><CircleDot size={15} /> {lang === "bn" ? "কোথায়" : "To"}</span><input list="journey-stops" value={to} onChange={(event) => setTo(event.target.value)} placeholder={lang === "bn" ? "যেমন ফার্মগেট" : "e.g. Farmgate"} required /></label>
      <datalist id="journey-stops">{allStops.map((stop) => <option key={stop} value={stop} />)}</datalist>
      <button className="button"><Search size={17} /> {lang === "bn" ? "রুট খুঁজুন" : "Find routes"}</button>
    </form>
    {plans && <div className="journey-results">
      <div className="result-head"><p><strong>{plans.length}</strong> {lang === "bn" ? "টি যাত্রার বিকল্প" : "journey options"}</p></div>
      {plans.length ? plans.map((plan, index) => plan.type === "direct" ? <DirectResult plan={plan} key={`${plan.route.id}-${index}`} lang={lang} /> : <TransferResult plan={plan} key={`${plan.first.id}-${plan.second.id}-${index}`} lang={lang} />) : <div className="empty-state"><BusFront size={34} /><h3>{lang === "bn" ? "কোনো সংযোগ পাওয়া যায়নি" : "No connection found"}</h3><p>{lang === "bn" ? "তালিকা থেকে কাছাকাছি অন্য স্টপ দিয়ে চেষ্টা করুন।" : "Try nearby stops from the suggestions."}</p></div>}
    </div>}
  </div>;
}

function DirectResult({ plan, lang }: { plan: DirectPlan; lang: Lang }) {
  return <article className="journey-card"><span className="plan-kind"><BusFront size={14} /> {lang === "bn" ? "সরাসরি" : "Direct"}</span><div><h3>{plan.route.name}</h3><p>{plan.from} → {plan.to} · {plan.stops} {lang === "bn" ? "স্টপ" : "stops"}</p></div><RouteMeta route={plan.route} lang={lang} /><Link href={`/transports/${plan.route.slug}`} className="button button-small">{lang === "bn" ? "লাইভ দেখুন" : "View live"}</Link></article>;
}

function TransferResult({ plan, lang }: { plan: TransferPlan; lang: Lang }) {
  return <article className="journey-card transfer"><span className="plan-kind"><Repeat2 size={14} /> {lang === "bn" ? "১ বার বদল" : "1 transfer"}</span><div><h3>{plan.first.name} → {plan.second.name}</h3><p>{plan.from} → <strong>{plan.transfer}</strong> → {plan.to} · {plan.stops} {lang === "bn" ? "স্টপ" : "stops"}</p></div><div className="journey-links"><Link href={`/transports/${plan.first.slug}`}>{plan.first.name}</Link><Link href={`/transports/${plan.second.slug}`}>{plan.second.name}</Link></div></article>;
}

function RouteMeta({ route, lang }: { route: TransportCardData; lang: Lang }) {
  return <div className="route-meta"><span className={`reliability reliability-${route.reliability?.label || "limited"}`}>{route.reliability?.score || 0}% {lang === "bn" ? "নির্ভরযোগ্য" : "reliability"}</span>{route.fareMin !== null && route.fareMin !== undefined ? <span>৳{route.fareMin}{route.fareMax ? `–৳${route.fareMax}` : "+"}</span> : route.fareSourceUrl ? <a href={route.fareSourceUrl} target="_blank" rel="noreferrer">{lang === "bn" ? "ভাড়ার তালিকা ↗" : "Fare chart ↗"}</a> : null}</div>;
}

function resolveStop(input: string, stops: string[]) {
  const query = normalize(input);
  return stops.find((stop) => normalize(stop) === query) || stops.find((stop) => normalize(stop).includes(query));
}

function buildPlans(routes: TransportCardData[], from: string, to: string): Plan[] {
  const direct: DirectPlan[] = routes.flatMap((route) => {
    const a = route.routeStops.indexOf(from); const b = route.routeStops.indexOf(to);
    return a >= 0 && b >= 0 ? [{ type: "direct" as const, route, from, to, stops: Math.abs(b - a) }] : [];
  }).sort((a, b) => a.stops - b.stops || (b.route.reliability?.score || 0) - (a.route.reliability?.score || 0));
  if (direct.length) return direct.slice(0, 6);
  const transfer: TransferPlan[] = [];
  for (const first of routes.filter((route) => route.routeStops.includes(from))) {
    for (const second of routes.filter((route) => route.id !== first.id && route.routeStops.includes(to))) {
      for (const shared of first.routeStops.filter((stop) => second.routeStops.includes(stop))) {
        const stops = Math.abs(first.routeStops.indexOf(shared) - first.routeStops.indexOf(from)) + Math.abs(second.routeStops.indexOf(to) - second.routeStops.indexOf(shared));
        transfer.push({ type: "transfer", first, second, from, transfer: shared, to, stops });
      }
    }
  }
  return transfer.sort((a, b) => a.stops - b.stops).filter((plan, index, all) => all.findIndex((item) => item.type === "transfer" && item.first.id === plan.first.id && item.second.id === plan.second.id) === index).slice(0, 6);
}

function normalize(value: string) { return value.trim().toLocaleLowerCase(); }
