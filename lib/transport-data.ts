import { connectDB } from "@/lib/db";
import { ACTIVE_PRESENCE_MS, LIVE_VEHICLE_MS } from "@/lib/constants";
import { Transport } from "@/models/Transport";
import { Presence } from "@/models/Presence";
import { LiveVehicle } from "@/models/LiveVehicle";

export async function getTransportCards(query = "") {
  await connectDB();
  const filter = query
    ? { active: true, $or: [{ name: { $regex: query, $options: "i" } }, { routeName: { $regex: query, $options: "i" } }, { routeStops: { $regex: query, $options: "i" } }] }
    : { active: true };
  const transports = await Transport.find(filter).sort({ name: 1 }).lean();
  const cutoff = new Date(Date.now() - ACTIVE_PRESENCE_MS);
  const vehicleCutoff = new Date(Date.now() - LIVE_VEHICLE_MS);
  const transportIds = transports.map((transport) => transport._id);
  const [presenceCounts, vehicleCounts] = await Promise.all([
    Presence.aggregate([
      { $match: { transportId: { $in: transportIds }, active: true, lastSeenAt: { $gte: cutoff } } },
      { $group: { _id: { transportId: "$transportId", mode: "$mode" }, count: { $sum: 1 } } },
    ]),
    LiveVehicle.aggregate([
      { $match: { transportId: { $in: transportIds }, lastUpdatedAt: { $gte: vehicleCutoff } } },
      { $group: { _id: "$transportId", count: { $sum: 1 } } },
    ]),
  ]);
  const presenceMap = new Map(presenceCounts.map((item) => [`${String(item._id.transportId)}:${item._id.mode}`, item.count]));
  const vehicleMap = new Map(vehicleCounts.map((item) => [String(item._id), item.count]));

  return transports.map((transport) => ({
    id: String(transport._id),
    name: transport.name,
    slug: transport.slug,
    imageUrl: transport.imageUrl,
    routeName: transport.routeName,
    routeStops: transport.routeStops,
    color: transport.color,
    watchers: presenceMap.get(`${String(transport._id)}:watching`) || 0,
    travellers: presenceMap.get(`${String(transport._id)}:travelling`) || 0,
    vehicles: vehicleMap.get(String(transport._id)) || 0,
  }));
}

export async function getTransportBySlug(slug: string) {
  await connectDB();
  const transport = await Transport.findOne({ slug, active: true }).lean() as unknown as { _id: unknown; name: string; slug: string; imageUrl: string; routeName: string; routeStops: string[]; routeVariants?: Array<{ routeName: string; routeStops: string[]; source: string }>; color: string } | null;
  if (!transport) return null;
  return {
    id: String(transport._id), name: transport.name, slug: transport.slug,
    imageUrl: transport.imageUrl, routeName: transport.routeName,
    routeStops: transport.routeStops, routeVariants: transport.routeVariants || [], color: transport.color,
  };
}
