import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Coins, Eye, Flame, LocateFixed, Navigation, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDict, getLang } from "@/lib/i18n-server";
import { connectDB } from "@/lib/db";
import { ACTIVE_PRESENCE_MS } from "@/lib/constants";
import { contributionStats } from "@/lib/gamification";
import { LocationUpdate } from "@/models/LocationUpdate";
import { Notification } from "@/models/Notification";
import { PointTransaction } from "@/models/PointTransaction";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";
import { ReferralCard } from "@/components/ReferralCard";
import { PwaControls } from "@/components/PwaControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "My activity" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const lang = await getLang();
  const t = getDict(lang);
  await connectDB();
  const activeCutoff = new Date(Date.now() - ACTIVE_PRESENCE_MS);
  const weekCutoff = new Date(Date.now() - 7 * 86_400_000);
  const [updates, activeWatching, activeTravelling, transactions, notifications, weeklyRanks] = await Promise.all([
    LocationUpdate.find({ userId: user._id, rewarded: true }).select("createdAt helpedCount transportId").sort({ createdAt: -1 }).lean(),
    Presence.countDocuments({ userId: user._id, mode: "watching", active: true, lastSeenAt: { $gte: activeCutoff } }),
    Presence.countDocuments({ userId: user._id, mode: "travelling", active: true, lastSeenAt: { $gte: activeCutoff } }),
    PointTransaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(8).populate("transportId", "name slug").lean(),
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).populate("transportId", "name slug").lean(),
    LocationUpdate.aggregate([
      { $match: { createdAt: { $gte: weekCutoff }, rewarded: true } },
      { $group: { _id: "$userId", updates: { $sum: 1 } } },
      { $sort: { updates: -1 } },
    ]),
  ]);
  void Transport;
  const game = contributionStats(updates.map((update) => update.createdAt), user.trustLevel || "newcomer");
  const weekUpdates = updates.filter((update) => update.createdAt >= weekCutoff);
  const peopleHelped = weekUpdates.reduce((sum, update) => sum + (update.helpedCount || 0), 0);
  const routesHelped = new Set(weekUpdates.map((update) => String(update.transportId))).size;
  const weeklyRankIndex = weeklyRanks.findIndex((row) => String(row._id) === String(user._id));
  const rank = weeklyRankIndex >= 0 ? weeklyRankIndex + 1 : null;
  const bn = lang === "bn";
  const number = new Intl.NumberFormat(bn ? "bn-BD" : "en");

  return <div className="page-shell"><div className="container">
    <div className="page-title-row"><div><span className="eyebrow accent">{t.yourJourney}</span><h1>{t.hello}, {user.name.split(" ")[0]}</h1><p>{t.dashboardSub}</p></div><Link href="/#transports" className="button">{t.findTransportCta}</Link></div>

    <div className="stat-grid dashboard-stats">
      <div className="stat-card"><span><Coins size={17} /> {t.pointBalance}</span><strong>{user.points}</strong></div>
      <div className="stat-card"><span><LocateFixed size={17} /> {t.updatesShared}</span><strong>{updates.length}</strong></div>
      <div className="stat-card"><span><Flame size={17} /> {bn ? "চলমান স্ট্রিক" : "Current streak"}</span><strong>{number.format(game.streak)} {bn ? "দিন" : "days"}</strong></div>
      <div className="stat-card"><span><ShieldCheck size={17} /> {bn ? "বিশ্বাসের স্তর" : "Trust level"}</span><strong className="trust-level">{trustLabel(user.trustLevel, bn)}</strong></div>
    </div>

    <section className="impact-card">
      <div><span className="eyebrow light">{bn ? "আপনার সাপ্তাহিক প্রভাব" : "YOUR WEEKLY IMPACT"}</span><h2>{bn ? `${number.format(weekUpdates.length)}টি আপডেটে ${number.format(routesHelped)}টি রুট সচল ছিল` : `${weekUpdates.length} updates kept ${routesHelped} routes moving`}</h2><p>{peopleHelped ? (bn ? `আপনার লাইভ রিপোর্ট ${number.format(peopleHelped)} জন অপেক্ষমাণ যাত্রীর কাছে পৌঁছেছে।` : `Your live reports reached ${peopleHelped} people who were actively watching.`) : (bn ? "আপনার পরের রিপোর্ট এখনই অপেক্ষমাণ কাউকে সাহায্য করতে পারে।" : "Your next report can help someone waiting for a bus right now.")}</p></div>
      <div className="impact-numbers"><span><strong>{number.format(peopleHelped)}</strong><small>{bn ? "ওয়াচার রিচ" : "watcher reach"}</small></span><span><strong>{rank ? `#${number.format(rank)}` : "—"}</strong><small>{bn ? "সাপ্তাহিক র‍্যাঙ্ক" : "weekly rank"}</small></span><span><strong>{number.format(user.corroboratedUpdates || 0)}</strong><small>{bn ? "সমর্থিত রিপোর্ট" : "corroborations"}</small></span></div>
    </section>

    <section className="dashboard-card badge-section"><div className="card-heading"><div><h2><Trophy size={18} /> {bn ? "ব্যাজ" : "Badges"}</h2><p>{bn ? "নিয়মিত ও সমর্থিত আপডেটে স্বীকৃতি আনলক হয়।" : "Consistent, corroborated updates unlock recognition."}</p></div><Link href="/leaderboard">{bn ? "লিডারবোর্ড দেখুন" : "View leaderboard"} →</Link></div><div className="badge-grid">{game.badges.map((badge) => <div className={`badge-card ${badge.earned ? "earned" : "locked"}`} key={badge.id}><span>{badge.icon}</span><div><strong>{badgeTitle(badge.id, badge.title, bn)}</strong><small>{badgeDescription(badge.id, badge.description, bn)}</small></div></div>)}</div></section>

    <div className="dashboard-grid">
      <section className="dashboard-card"><h2>{t.pointActivity}</h2><div className="activity-list">{transactions.length ? transactions.map((item) => {
        const transport = item.transportId as unknown as { name?: string };
        const label = item.reason === "signup_bonus" ? t.welcomeBonus : item.reason === "location_update" ? `${t.locationUpdate}${transport?.name ? ` · ${transport.name}` : ""}` : item.reason === "referral_bonus" ? "Referral reward" : `${t.startedWatching}${transport?.name ? ` · ${transport.name}` : ""}`;
        return <div className="activity-row" key={String(item._id)}><span className="activity-icon">{item.amount > 0 ? <LocateFixed size={17} /> : <Eye size={17} />}</span><p><strong>{label}</strong><small>{new Date(item.createdAt).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-BD", { day: "numeric", month: "short", year: "numeric" })}</small></p><span className={`point-change ${item.amount < 0 ? "negative" : ""}`}>{item.amount > 0 ? "+" : ""}{item.amount}</span></div>;
      }) : <div className="empty-state"><Coins size={28} /><h3>{t.noPointActivity}</h3><p>{t.shareToEarn}</p></div>}</div></section>
      <section className="dashboard-card"><h2>{t.recentNotifications}</h2><div className="activity-list">{notifications.length ? notifications.map((item) => <Link href={item.url || "/dashboard"} className="activity-row" key={String(item._id)}><span className="activity-icon"><Bell size={17} /></span><p><strong>{item.title}</strong><small>{item.message}</small></p></Link>) : <div className="empty-state"><Bell size={28} /><h3>{t.allQuiet}</h3><p>{t.traveltersAppear}</p></div>}</div><div className="mode-summary"><Navigation size={13} /> {t.watching}: {activeWatching} · {t.travelling}: {activeTravelling}</div><PwaControls lang={lang} /></section>
    </div>

    <section className="dashboard-card growth-section"><h2><UsersRound size={18} /> {bn ? "কমিউনিটি বড় করুন" : "Grow the community"}</h2><ReferralCard initialOptIn={Boolean(user.leaderboardOptIn)} lang={lang} /></section>
  </div></div>;
}

function trustLabel(level: string | undefined, bn: boolean) {
  if (!bn) return level || "newcomer";
  return level === "trusted" ? "বিশ্বস্ত" : level === "contributor" ? "অবদানকারী" : "নতুন";
}

function badgeTitle(id: string, fallback: string, bn: boolean) {
  if (!bn) return fallback;
  return ({ first_update: "প্রথম সংকেত", route_helper: "রুট সহায়ক", city_mover: "সিটি মুভার", week_streak: "৭ দিনের স্ট্রিক", trusted: "বিশ্বস্ত অবদানকারী" } as Record<string, string>)[id] || fallback;
}

function badgeDescription(id: string, fallback: string, bn: boolean) {
  if (!bn) return fallback;
  return ({ first_update: "প্রথম লাইভ আপডেট দিয়েছেন", route_helper: "১০টি আপডেট দিয়েছেন", city_mover: "৫০টি আপডেট দিয়েছেন", week_streak: "টানা সাত দিন সাহায্য করেছেন", trusted: "রিপোর্ট নিয়মিত সমর্থিত হয়েছে" } as Record<string, string>)[id] || fallback;
}
