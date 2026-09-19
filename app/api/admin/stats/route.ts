import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ACTIVE_PRESENCE_MS, LIVE_VEHICLE_MS } from "@/lib/constants";
import { LiveVehicle } from "@/models/LiveVehicle";
import { LocationUpdate } from "@/models/LocationUpdate";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";
import { User } from "@/models/User";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (user.role !== "admin") throw new Error("FORBIDDEN");
    const [users, transports, liveVehicles, updatesToday, watchers, travellers] = await Promise.all([
      User.countDocuments(), Transport.countDocuments({ active: true }),
      LiveVehicle.countDocuments({ lastUpdatedAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) } }),
      LocationUpdate.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86_400_000) } }),
      Presence.countDocuments({ mode: "watching", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
      Presence.countDocuments({ mode: "travelling", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
    ]);
    return NextResponse.json({ users, transports, liveVehicles, updatesToday, watchers, travellers });
  } catch (error) { return apiError(error); }
}
