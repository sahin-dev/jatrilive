import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getTransportCards } from "@/lib/transport-data";
import { ACTIVE_PRESENCE_MS, LIVE_VEHICLE_MS } from "@/lib/constants";
import { LiveVehicle } from "@/models/LiveVehicle";
import { LocationUpdate } from "@/models/LocationUpdate";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";
import { User } from "@/models/User";
import { AdminPanel } from "@/components/AdminPanel";
import type { TransportCardData } from "@/components/TransportExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  await connectDB();
  const [transports, users, transportCount, liveVehicles, updatesToday, watchers, travellers] = await Promise.all([
    getTransportCards(), User.countDocuments(), Transport.countDocuments({ active: true }),
    LiveVehicle.countDocuments({ lastUpdatedAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) } }),
    LocationUpdate.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86_400_000) } }),
    Presence.countDocuments({ mode: "watching", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
    Presence.countDocuments({ mode: "travelling", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
  ]);
  return <div className="page-shell"><div className="container"><div className="page-title-row"><div><span className="eyebrow accent">SYSTEM OVERVIEW</span><h1>Operations dashboard</h1><p>Live community activity and transport data.</p></div><span className="route-badge">Admin access</span></div><AdminPanel transports={transports as TransportCardData[]} stats={{ users, transports: transportCount, liveVehicles, updatesToday, watchers, travellers }} /></div></div>;
}
