import Link from "next/link";
import { ArrowRight, BellRing, Coins, LocateFixed, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { getTransportCards } from "@/lib/transport-data";
import { getDict, getLang } from "@/lib/i18n-server";
import { TransportExplorer, type TransportCardData } from "@/components/TransportExplorer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = await getLang();
  const transports = await getTransportCards("", lang);
  const t = getDict(lang);
  const liveVehicles = transports.reduce((sum, item) => sum + item.vehicles, 0);
  const activePeople = transports.reduce((sum, item) => sum + item.watchers + item.travellers, 0);

  return (
    <>
      <section className="hero">
        <div className="hero-glow one" /><div className="hero-glow two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="status-label"><span><i className="live-dot" /> {t.communityLive}</span><span>{t.homeTagline}</span></div>
            <h1>{t.heroTitleLine1}<br />{t.heroTitleLine2} <em>{t.heroTitleLive}</em></h1>
            <p className="hero-lead">{t.heroLead}</p>
            <div className="hero-actions">
              <Link href="#transports" className="button">{t.findMyBus} <ArrowRight size={19} /></Link>
              <Link href="/signup" className="button button-ghost">{t.shareLocation} <LocateFixed size={19} /></Link>
            </div>
            <div className="trust-row"><ShieldCheck size={19} /><span>{t.privacyNote}</span></div>
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
              <div><span className="icon-tile"><MapPin size={20} /></span><p><strong>{liveVehicles || "—"} {t.vehiclesLive}</strong><small>{t.acrossActiveRoutes}</small></p></div>
              <div className="avatar-stack"><i>R</i><i>S</i><i>T</i><span>+{activePeople}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-strip">
        <div className="container how-grid">
          <div><span>01</span><LocateFixed /><p><strong>{t.step1}</strong><small>{t.step1Sub}</small></p></div>
          <div><span>02</span><UsersRound /><p><strong>{t.step2}</strong><small>{t.step2Sub}</small></p></div>
          <div><span>03</span><Coins /><p><strong>{t.step3}</strong><small>{t.step3Sub}</small></p></div>
          <div><span>04</span><BellRing /><p><strong>{t.step4}</strong><small>{t.step4Sub}</small></p></div>
        </div>
      </section>

      <section className="transport-section container" id="transports">
        <div className="section-heading">
          <div><span className="eyebrow accent"><Sparkles size={14} /> {t.communityLive}</span><h2>{t.whereHeading}</h2><p>{t.whereSub}</p></div>
          <div className="points-explain"><Coins size={24} /><p><strong>{t.freePointsTitle}</strong><small>{t.freePointsSub}</small></p></div>
        </div>
        <TransportExplorer transports={transports as TransportCardData[]} lang={lang} />
      </section>

      <section className="cta-band">
        <div className="container cta-inner"><div><span className="eyebrow light">{t.betterTogether}</span><h2>{t.onABusNow}</h2><p>{t.oneUpdateHelps}</p></div><Link href="/signup" className="button button-light">{t.startHelping} <ArrowRight size={19} /></Link></div>
      </section>
    </>
  );
}
