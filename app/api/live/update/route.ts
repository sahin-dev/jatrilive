import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { CLUSTER_RADIUS_METERS, LIVE_VEHICLE_MS, UPDATE_REWARD } from "@/lib/constants";
import { haversineMeters } from "@/lib/utils";
import { LiveVehicle } from "@/models/LiveVehicle";
import { LocationUpdate } from "@/models/LocationUpdate";
import { PointTransaction } from "@/models/PointTransaction";
import { Transport } from "@/models/Transport";

const schema = z.object({
  transportId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(100).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    if (!(await Transport.exists({ _id: input.transportId, active: true }))) return NextResponse.json({ error: "Transport not found." }, { status: 404 });
    if (input.accuracy && input.accuracy > 250) return NextResponse.json({ error: "Location accuracy is too low. Move near a window and try again." }, { status: 400 });

    const candidates = await LiveVehicle.find({
      transportId: input.transportId,
      lastUpdatedAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) },
    }).lean();
    const point: [number, number] = [input.longitude, input.latitude];
    const closest = candidates
      .map((vehicle) => ({ vehicle, distance: haversineMeters(point, vehicle.location.coordinates as [number, number]) }))
      .filter(({ distance }) => distance <= CLUSTER_RADIUS_METERS)
      .sort((a, b) => a.distance - b.distance)[0];

    let vehicle;
    if (closest) {
      const weight = Math.min(closest.vehicle.updateCount, 5);
      const old = closest.vehicle.location.coordinates as [number, number];
      const smoothed: [number, number] = [(old[0] * weight + point[0]) / (weight + 1), (old[1] * weight + point[1]) / (weight + 1)];
      vehicle = await LiveVehicle.findByIdAndUpdate(
        closest.vehicle._id,
        {
          $set: { location: { type: "Point", coordinates: smoothed }, accuracy: input.accuracy, heading: input.heading, speed: input.speed, lastUpdatedAt: new Date(), lastContributorId: user._id },
          $inc: { updateCount: 1, confidence: closest.distance < 75 ? 1 : 0 },
        },
        { new: true }
      );
    } else {
      vehicle = await LiveVehicle.create({ transportId: input.transportId, location: { type: "Point", coordinates: point }, accuracy: input.accuracy, heading: input.heading, speed: input.speed, lastUpdatedAt: new Date(), lastContributorId: user._id });
    }

    await Promise.all([
      LocationUpdate.create({ userId: user._id, transportId: input.transportId, vehicleId: vehicle._id, location: { type: "Point", coordinates: point }, accuracy: input.accuracy, rewarded: true }),
      PointTransaction.create({ userId: user._id, amount: UPDATE_REWARD, reason: "location_update", transportId: input.transportId }),
    ]);
    user.points += UPDATE_REWARD;
    await user.save();
    return NextResponse.json({ ok: true, merged: Boolean(closest), vehicleId: String(vehicle._id), points: user.points, earned: UPDATE_REWARD });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
