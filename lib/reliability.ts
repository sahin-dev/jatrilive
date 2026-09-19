import { Types } from "mongoose";
import { LocationUpdate } from "@/models/LocationUpdate";

export type Reliability = {
  score: number;
  label: "strong" | "fair" | "limited";
  updates7d: number;
  activeDays7d: number;
  averageMinutesBetweenUpdates: number | null;
  lastUpdateAt: string | null;
};

export async function reliabilityForTransports(transportIds: unknown[]) {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const ids = transportIds.map((id) => typeof id === "string" ? new Types.ObjectId(id) : id);
  if (!ids.length) return new Map<string, Reliability>();
  const rows = await LocationUpdate.aggregate([
    { $match: { transportId: { $in: ids }, createdAt: { $gte: since } } },
    { $sort: { createdAt: 1 } },
    { $group: {
      _id: "$transportId",
      updates7d: { $sum: 1 },
      lastUpdateAt: { $max: "$createdAt" },
      days: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Dhaka" } } },
      timestamps: { $push: "$createdAt" },
    } },
  ]);
  return new Map(rows.map((row) => {
    const activeDays7d = row.days.length;
    const freshnessMinutes = (Date.now() - new Date(row.lastUpdateAt).getTime()) / 60_000;
    const score = Math.round(
      Math.min(50, activeDays7d / 7 * 50) +
      Math.min(30, row.updates7d / 28 * 30) +
      (freshnessMinutes <= 15 ? 20 : freshnessMinutes <= 60 ? 10 : 0),
    );
    const reliability: Reliability = {
      score,
      label: score >= 70 ? "strong" : score >= 35 ? "fair" : "limited",
      updates7d: row.updates7d,
      activeDays7d,
      averageMinutesBetweenUpdates: averageIntervalMinutes(row.timestamps),
      lastUpdateAt: new Date(row.lastUpdateAt).toISOString(),
    };
    return [String(row._id), reliability] as const;
  }));
}

function averageIntervalMinutes(values: Date[]) {
  if (!values || values.length < 2) return null;
  let total = 0;
  for (let index = 1; index < values.length; index += 1) total += new Date(values[index]).getTime() - new Date(values[index - 1]).getTime();
  return Math.round(total / (values.length - 1) / 60_000);
}

export async function reliabilityForTransport(transportId: unknown) {
  return (await reliabilityForTransports([transportId])).get(String(transportId)) || emptyReliability();
}

export function emptyReliability(): Reliability {
  return { score: 0, label: "limited", updates7d: 0, activeDays7d: 0, averageMinutesBetweenUpdates: null, lastUpdateAt: null };
}
