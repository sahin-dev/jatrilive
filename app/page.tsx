import Link from "next/link";
import { ArrowRight, BellRing, Coins, LocateFixed, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { getTransportCards } from "@/lib/transport-data";
import { TransportExplorer, type TransportCardData } from "@/components/TransportExplorer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const transports = await getTransportCards();
  const liveVehicles = transports.reduce((sum, item) => sum + item.vehicles, 0);
  const activePeople = transports.reduce((sum, item) => sum + item.watchers + item.travellers, 0);

  return (
    <>
      <section className="hero">
        <div className="hero-glow one" /><div className="hero-glow two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="status-label"><span><i className="live-dot" /> COMMUNITY LIVE</span><span>Dhaka, Bangladesh</span></div>
            <h1>Your city.<br />Your bus. <em>Live.</em></h1>
            <p className="hero-lead">Know where your bus is before you step outside. Real-time locations, powered by passengers moving through Dhaka—just like you.</p>
            <div className="hero-actions">
              <Link href="#transports" className="button">Find my bus <ArrowRight size={19} /></Link>
              <Link href="/signup" className="button button-ghost">Share a location <LocateFixed size={19} /></Link>
            </div>
            <div className="trust-row"><ShieldCheck size={19} /><span>Your identity and precise travel history are never shown to other passengers.</span></div>
          </div>
          <div className="hero-map-card">
            <div className="mini-map">
              <div className="map-roads" />
              <span className="map-place p1">MIRPUR</span><span className="map-place p2">FARMGATE</span><span className="map-place p3">GULISTAN</span>
              <div className="map-route route-a" /><div className="map-route route-b" />
              <div className="vehicle-marker v1"><span><LocateFixed size={16} /></span><div><strong>Alif</strong><small>Just now</small></div></div>
              <div className="vehicle-marker v2"><span><LocateFixed size={16} /></span><div><strong>Baishakhi</strong><small>2 min ago</small></div></div>
              <div className="pulse-ring" />
            </div>
            <div className="map-card-footer">
              <div><span className="icon-tile"><MapPin size={20} /></span><p><strong>{liveVehicles || "—"} vehicles live</strong><small>Across active routes</small></p></div>
              <div className="avatar-stack"><i>R</i><i>S</i><i>T</i><span>+{activePeople}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-strip">
        <div className="container how-grid">
          <div><span>01</span><LocateFixed /><p><strong>Spot your bus</strong><small>Search a company or route</small></p></div>
          <div><span>02</span><UsersRound /><p><strong>Join the crowd</strong><small>Watch or mark travelling</small></p></div>
          <div><span>03</span><Coins /><p><strong>Give and get</strong><small>Share updates, earn points</small></p></div>
          <div><span>04</span><BellRing /><p><strong>Move smarter</strong><small>Get timely crowd alerts</small></p></div>
        </div>
      </section>

      <section className="transport-section container" id="transports">
        <div className="section-heading">
          <div><span className="eyebrow accent"><Sparkles size={14} /> LIVE NETWORK</span><h2>Where are you heading?</h2><p>Search Dhaka&apos;s community-powered transport network.</p></div>
          <div className="points-explain"><Coins size={24} /><p><strong>10 free points when you join</strong><small>Earn 1 for every useful location update.</small></p></div>
        </div>
        <TransportExplorer transports={transports as TransportCardData[]} />
      </section>

      <section className="cta-band">
        <div className="container cta-inner"><div><span className="eyebrow light">BETTER TOGETHER</span><h2>On a bus right now?</h2><p>One location update can help dozens of people plan their journey.</p></div><Link href="/signup" className="button button-light">Start helping <ArrowRight size={19} /></Link></div>
      </section>
    </>
  );
}
