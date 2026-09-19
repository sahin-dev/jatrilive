import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ACTIVE_PRESENCE_MS, CLUSTER_RADIUS_METERS, CROWD_REPORT_MS, LIVE_VEHICLE_MS, UPDATE_REWARD } from "@/lib/constants";
import { haversineMeters } from "@/lib/utils";
import { LiveVehicle } from "@/models/LiveVehicle";
import { LocationUpdate } from "@/models/LocationUpdate";
import { PointTransaction } from "@/models/PointTransaction";
import { Transport } from "@/models/Transport";
import { CrowdReport, CROWD_LEVELS } from "@/models/CrowdReport";
import { Presence } from "@/models/Presence";
import { User } from "@/models/User";
import { processStopAlerts } from "@/lib/stop-alerts";
import { trustLevelFor, trustWeight } from "@/lib/trust";

const schema = z.object({
  transportId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).max(100).nullable().optional(),
  crowding: z.enum(CROWD_LEVELS).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    const transport = await Transport.findOne({ _id: input.transportId, active: true }).select("name slug stopCoords").lean() as unknown as {
      _id: unknown; name: string; slug: string; stopCoords?: Array<{ name: string; lat: number; lng: number }>;
    } | null;
    if (!transport) return NextResponse.json({ error: "Transport not found." }, { status: 404 });
    const accuracyLimit = user.trustLevel === "trusted" ? 350 : 250;
    if (input.accuracy && input.accuracy > accuracyLimit) {
      const accuracyLabel = input.accuracy >= 1000
        ? `${(input.accuracy / 1000).toFixed(1)} km`
        : `${Math.round(input.accuracy)} m`;
      return NextResponse.json({
        error: `Location found, but it is only accurate to about ${accuracyLabel}. Turn on precise location/GPS, move near a window, or use your phone, then try again.`,
        code: "LOW_ACCURACY",
        accuracy: input.accuracy,
      }, { status: 422 });
    }

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
      const reporterWeight = trustWeight(user.trustLevel);
      const old = closest.vehicle.location.coordinates as [number, number];
      const smoothed: [number, number] = [(old[0] * weight + point[0] * reporterWeight) / (weight + reporterWeight), (old[1] * weight + point[1] * reporterWeight) / (weight + reporterWeight)];
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

    const helpedCount = await Presence.countDocuments({
      transportId: input.transportId, mode: "watching", active: true,
      lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) }, userId: { $ne: user._id },
    });
    const writes = [
      LocationUpdate.create({ userId: user._id, transportId: input.transportId, vehicleId: vehicle._id, location: { type: "Point", coordinates: point }, accuracy: input.accuracy, rewarded: true, helpedCount }),
      PointTransaction.create({ userId: user._id, amount: UPDATE_REWARD, reason: "location_update", transportId: input.transportId }),
    ];
    if (input.crowding) {
      writes.push(CrowdReport.create({
        userId: user._id,
        transportId: input.transportId,
        vehicleId: vehicle._id,
        level: input.crowding,
        expiresAt: new Date(Date.now() + CROWD_REPORT_MS),
      }));
    }
    await Promise.all(writes);
    user.points += UPDATE_REWARD;
    user.acceptedUpdates = (user.acceptedUpdates || 0) + 1;
    if (closest && closest.distance < 75) user.corroboratedUpdates = (user.corroboratedUpdates || 0) + 1;
    user.trustLevel = trustLevelFor(user);
    await user.save();
    if (closest && closest.distance < 75 && closest.vehicle.lastContributorId && String(closest.vehicle.lastContributorId) !== String(user._id)) {
      const previous = await User.findById(closest.vehicle.lastContributorId);
      if (previous) {
        previous.corroboratedUpdates = (previous.corroboratedUpdates || 0) + 1;
        previous.trustLevel = trustLevelFor(previous);
        await previous.save();
      }
    }
    await processStopAlerts({
      vehicleId: vehicle._id, transportId: transport._id, transportName: transport.name, transportSlug: transport.slug,
      latitude: vehicle.location.coordinates[1], longitude: vehicle.location.coordinates[0], speed: vehicle.speed ?? null,
      lastUpdatedAt: vehicle.lastUpdatedAt, stops: transport.stopCoords || [],
    }).catch((error) => console.error("Stop alert processing failed", error));
    return NextResponse.json({ ok: true, merged: Boolean(closest), vehicleId: String(vehicle._id), points: user.points, earned: UPDATE_REWARD, helpedCount, trustLevel: user.trustLevel });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
