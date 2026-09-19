import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Coins, Eye, LocateFixed, Navigation, Route } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LocationUpdate } from "@/models/LocationUpdate";
import { Notification } from "@/models/Notification";
import { PointTransaction } from "@/models/PointTransaction";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";

export const dynamic = "force-dynamic";
export const metadata = { title: "My activity" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await connectDB();
  const [updateCount, activeWatching, activeTravelling, transactions, notifications] = await Promise.all([
    LocationUpdate.countDocuments({ userId: user._id }),
    Presence.countDocuments({ userId: user._id, mode: "watching", active: true }),
    Presence.countDocuments({ userId: user._id, mode: "travelling", active: true }),
    PointTransaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(8).populate("transportId", "name slug").lean(),
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).populate("transportId", "name slug").lean(),
  ]);
  void Transport;
  return <div className="page-shell"><div className="container">
    <div className="page-title-row"><div><span className="eyebrow accent">YOUR JOURNEY</span><h1>Hello, {user.name.split(" ")[0]}</h1><p>Your contributions help Dhaka move with less uncertainty.</p></div><Link href="/#transports" className="button">Find a transport</Link></div>
    <div className="stat-grid"><div className="stat-card"><span><Coins size={17} /> Point balance</span><strong>{user.points}</strong></div><div className="stat-card"><span><LocateFixed size={17} /> Updates shared</span><strong>{updateCount}</strong></div><div className="stat-card"><span><Eye size={17} /> Active modes</span><strong>{activeWatching + activeTravelling}</strong></div></div>
    <div className="dashboard-grid">
      <section className="dashboard-card"><h2>Point activity</h2><div className="activity-list">{transactions.length ? transactions.map((item) => { const transport = item.transportId as unknown as { name?: string }; const label = item.reason === "signup_bonus" ? "Welcome bonus" : item.reason === "location_update" ? `Location update${transport?.name ? ` · ${transport.name}` : ""}` : `Started watching${transport?.name ? ` · ${transport.name}` : ""}`; return <div className="activity-row" key={String(item._id)}><span className="activity-icon">{item.amount > 0 ? <LocateFixed size={17} /> : <Eye size={17} />}</span><p><strong>{label}</strong><small>{new Date(item.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</small></p><span className={`point-change ${item.amount < 0 ? "negative" : ""}`}>{item.amount > 0 ? "+" : ""}{item.amount}</span></div>; }) : <div className="empty-state"><Coins size={28} /><h3>No point activity</h3><p>Share a transport location to earn your first point.</p></div>}</div></section>
      <section className="dashboard-card"><h2>Recent notifications</h2><div className="activity-list">{notifications.length ? notifications.map((item) => <div className="activity-row" key={String(item._id)}><span className="activity-icon"><Bell size={17} /></span><p><strong>{item.title}</strong><small>{item.message}</small></p></div>) : <div className="empty-state"><Bell size={28} /><h3>All quiet</h3><p>Traveller requests will appear here.</p></div>}</div><div style={{ marginTop: 18 }}><p style={{ color: "var(--muted)", fontSize: 10 }}><Navigation size={13} /> Watching: {activeWatching} · Travelling: {activeTravelling}</p></div></section>
    </div>
  </div></div>;
}
