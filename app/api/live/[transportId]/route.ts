import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ACTIVE_PRESENCE_MS, LIVE_VEHICLE_MS } from "@/lib/constants";
import { LiveVehicle } from "@/models/LiveVehicle";
import { Presence } from "@/models/Presence";

export async function GET(_: Request, { params }: { params: Promise<{ transportId: string }> }) {
  try {
    const user = await requireApiUser();
    const { transportId } = await params;
    if (!Types.ObjectId.isValid(transportId)) return NextResponse.json({ error: "Invalid transport." }, { status: 400 });
    const [vehicles, watchers, travellers, myPresences] = await Promise.all([
      LiveVehicle.find({ transportId, lastUpdatedAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) } }).sort({ lastUpdatedAt: -1 }).lean(),
      Presence.countDocuments({ transportId, mode: "watching", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
      Presence.countDocuments({ transportId, mode: "travelling", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
      Presence.find({ transportId, userId: user._id, active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }).lean(),
    ]);
    return NextResponse.json({
      vehicles: vehicles.map((vehicle) => ({
        id: String(vehicle._id), latitude: vehicle.location.coordinates[1], longitude: vehicle.location.coordinates[0],
        accuracy: vehicle.accuracy, heading: vehicle.heading, speed: vehicle.speed,
        lastUpdatedAt: vehicle.lastUpdatedAt, updateCount: vehicle.updateCount, confidence: vehicle.confidence,
      })),
      watchers, travellers, points: user.points,
      myModes: myPresences.map((presence) => presence.mode),
    });
  } catch (error) { return apiError(error); }
}
