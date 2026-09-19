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
import { ReportFlag } from "@/models/ReportFlag";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  await connectDB();
  const [transports, users, transportCount, liveVehicles, updatesToday, watchers, travellers, flags] = await Promise.all([
    getTransportCards(), User.countDocuments(), Transport.countDocuments({ active: true }),
    LiveVehicle.countDocuments({ lastUpdatedAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) } }),
    LocationUpdate.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86_400_000) } }),
    Presence.countDocuments({ mode: "watching", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
    Presence.countDocuments({ mode: "travelling", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
    ReportFlag.find({ status: "pending" }).sort({ createdAt: -1 }).limit(30).populate("transportId", "name").populate("vehicleId", "location lastUpdatedAt updateCount").lean(),
  ]);
  const reviewFlags = flags.map((flag) => {
    const vehicle = flag.vehicleId as unknown as { location?: { coordinates?: [number, number] }; lastUpdatedAt?: Date; updateCount?: number };
    const snapshot = flag.snapshot as undefined | { coordinates?: [number, number]; vehicleUpdatedAt?: Date; updateCount?: number };
    return { id: String(flag._id), reason: flag.reason, note: flag.note, createdAt: flag.createdAt.toISOString(), transportName: (flag.transportId as unknown as { name?: string })?.name || "Unknown route", coordinates: snapshot?.coordinates || vehicle?.location?.coordinates || null, vehicleUpdatedAt: snapshot?.vehicleUpdatedAt?.toISOString() || vehicle?.lastUpdatedAt?.toISOString() || null, updateCount: snapshot?.updateCount ?? vehicle?.updateCount ?? 0 };
  });
  return <div className="page-shell"><div className="container"><div className="page-title-row"><div><span className="eyebrow accent">SYSTEM OVERVIEW</span><h1>Operations dashboard</h1><p>Live community activity and transport data.</p></div><span className="route-badge">Admin access</span></div><AdminPanel transports={transports as TransportCardData[]} stats={{ users, transports: transportCount, liveVehicles, updatesToday, watchers, travellers }} flags={reviewFlags} /></div></div>;
}
