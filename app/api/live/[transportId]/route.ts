import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ACTIVE_PRESENCE_MS, CROWD_REPORT_MS, LIVE_VEHICLE_MS } from "@/lib/constants";
import { estimateEtas } from "@/lib/eta";
import { LiveVehicle } from "@/models/LiveVehicle";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";
import { CrowdReport, type CrowdLevel } from "@/models/CrowdReport";
import { getLang } from "@/lib/i18n-server";
import { LocationUpdate } from "@/models/LocationUpdate";
import { StopAlert } from "@/models/StopAlert";
import { reliabilityForTransport } from "@/lib/reliability";

type CrowdReportRow = {
  vehicleId: unknown;
  userId: unknown;
  level: CrowdLevel;
  createdAt: Date;
};

export async function GET(_: Request, { params }: { params: Promise<{ transportId: string }> }) {
  try {
    const user = await requireApiUser();
    const { transportId } = await params;
    if (!Types.ObjectId.isValid(transportId)) return NextResponse.json({ error: "Invalid transport." }, { status: 400 });
    const [lang, transport, vehicles, crowdReports, witnessRows, watchers, travellers, myPresences, myAlerts, reliability] = await Promise.all([
      getLang(),
      Transport.findOne({ _id: transportId, active: true }).select("stopCoords").lean(),
      LiveVehicle.find({ transportId, lastUpdatedAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) } }).sort({ lastUpdatedAt: -1 }).lean(),
      CrowdReport.find({ transportId, createdAt: { $gte: new Date(Date.now() - CROWD_REPORT_MS) }, expiresAt: { $gt: new Date() } })
        .select("vehicleId userId level createdAt")
        .sort({ createdAt: -1 })
        .lean() as unknown as Promise<CrowdReportRow[]>,
      LocationUpdate.aggregate([
        { $match: { transportId: new Types.ObjectId(transportId), createdAt: { $gte: new Date(Date.now() - LIVE_VEHICLE_MS) } } },
        { $group: { _id: "$vehicleId", contributors: { $addToSet: "$userId" } } },
        { $project: { witnessCount: { $size: "$contributors" } } },
      ]),
      Presence.countDocuments({ transportId, mode: "watching", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
      Presence.countDocuments({ transportId, mode: "travelling", active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }),
      Presence.find({ transportId, userId: user._id, active: true, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_PRESENCE_MS) } }).lean(),
      StopAlert.find({ transportId, userId: user._id, active: true }).lean(),
      reliabilityForTransport(transportId),
    ]);
    if (!transport) return NextResponse.json({ error: "Transport not found." }, { status: 404 });

    const reportsByVehicle = new Map<string, CrowdReportRow[]>();
    const seenReporters = new Set<string>();
    for (const report of crowdReports) {
      const key = String(report.vehicleId);
      const reporterKey = `${key}:${String(report.userId)}`;
      if (seenReporters.has(reporterKey)) continue;
      seenReporters.add(reporterKey);
      reportsByVehicle.set(key, [...(reportsByVehicle.get(key) || []), report]);
    }

    const stopCoords = ((transport as unknown as { stopCoords?: Array<{ name: string; nameBn?: string; lat: number; lng: number }> }).stopCoords || [])
      .map((stop) => ({ name: lang === "bn" && stop.nameBn ? stop.nameBn : stop.name, lat: stop.lat, lng: stop.lng }));
    const witnessMap = new Map(witnessRows.map((row) => [String(row._id), row.witnessCount]));
    return NextResponse.json({
      vehicles: vehicles.map((vehicle) => {
        const id = String(vehicle._id);
        const latitude = vehicle.location.coordinates[1];
        const longitude = vehicle.location.coordinates[0];
        const reports = reportsByVehicle.get(id) || [];
        const crowding = crowdConsensus(reports);
        const eta = stopCoords.length >= 2
          ? estimateEtas({ latitude, longitude, heading: vehicle.heading ?? null, speed: vehicle.speed ?? null, lastUpdatedAt: vehicle.lastUpdatedAt }, stopCoords)
          : null;
        return {
          id, latitude, longitude,
          accuracy: vehicle.accuracy, heading: vehicle.heading, speed: vehicle.speed,
          lastUpdatedAt: vehicle.lastUpdatedAt, updateCount: vehicle.updateCount, confidence: vehicle.confidence,
          witnessCount: witnessMap.get(id) || 1, crowding, eta,
          lastConfirmedStop: eta && eta.nextStopIndex >= 0
            ? stopCoords[eta.direction === "forward" ? eta.nextStopIndex - 1 : eta.nextStopIndex + 1]?.name || null
            : null,
        };
      }),
      watchers, travellers, points: user.points,
      myModes: myPresences.map((presence) => presence.mode),
      alerts: myAlerts.map((alert) => ({ id: String(alert._id), stopIndex: alert.stopIndex, stopName: alert.stopName, stopsBefore: alert.stopsBefore })),
      reliability,
    });
  } catch (error) { return apiError(error); }
}

function crowdConsensus(reports: CrowdReportRow[]) {
  if (!reports.length) return null;
  const counts = new Map<CrowdLevel, number>();
  for (const report of reports) counts.set(report.level, (counts.get(report.level) || 0) + 1);
  const level = [...counts.entries()].sort((a, b) => b[1] - a[1] || newestIndex(reports, a[0]) - newestIndex(reports, b[0]))[0][0];
  return { level, reports: reports.length, updatedAt: reports[0].createdAt };
}

function newestIndex(reports: CrowdReportRow[], level: CrowdLevel) {
  return reports.findIndex((report) => report.level === level);
}
