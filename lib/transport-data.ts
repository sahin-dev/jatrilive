import { connectDB } from "@/lib/db";
import { ACTIVE_PRESENCE_MS, LIVE_VEHICLE_MS } from "@/lib/constants";
import { Transport } from "@/models/Transport";
import { Presence } from "@/models/Presence";
import { LiveVehicle } from "@/models/LiveVehicle";
import type { Lang } from "@/lib/i18n";
import { emptyReliability, reliabilityForTransport, reliabilityForTransports } from "@/lib/reliability";

export async function getTransportCards(query = "", lang: Lang = "en") {
  await connectDB();
  const filter = query
    ? { active: true, $or: [{ name: { $regex: query, $options: "i" } }, { nameBn: { $regex: query, $options: "i" } }, { routeName: { $regex: query, $options: "i" } }, { routeNameBn: { $regex: query, $options: "i" } }, { routeStops: { $regex: query, $options: "i" } }, { routeStopsBn: { $regex: query, $options: "i" } }] }
    : { active: true };
  const transports = await Transport.find(filter).sort({ name: 1 }).lean();
  const cutoff = new Date(Date.now() - ACTIVE_PRESENCE_MS);
  const vehicleCutoff = new Date(Date.now() - LIVE_VEHICLE_MS);
  const transportIds = transports.map((transport) => transport._id);
  const [presenceCounts, vehicleCounts, reliabilityMap] = await Promise.all([
    Presence.aggregate([
      { $match: { transportId: { $in: transportIds }, active: true, lastSeenAt: { $gte: cutoff } } },
      { $group: { _id: { transportId: "$transportId", mode: "$mode" }, count: { $sum: 1 } } },
    ]),
    LiveVehicle.aggregate([
      { $match: { transportId: { $in: transportIds }, lastUpdatedAt: { $gte: vehicleCutoff } } },
      { $group: { _id: "$transportId", count: { $sum: 1 } } },
    ]),
    reliabilityForTransports(transportIds),
  ]);
  const presenceMap = new Map(presenceCounts.map((item) => [`${String(item._id.transportId)}:${item._id.mode}`, item.count]));
  const vehicleMap = new Map(vehicleCounts.map((item) => [String(item._id), item.count]));

  return transports.map((transport) => ({
    id: String(transport._id),
    name: lang === "bn" && transport.nameBn ? transport.nameBn : transport.name,
    slug: transport.slug,
    imageUrl: transport.imageUrl,
    routeName: lang === "bn" && transport.routeNameBn ? transport.routeNameBn : transport.routeName,
    routeStops: lang === "bn" && transport.routeStopsBn?.length ? transport.routeStopsBn : transport.routeStops,
    color: transport.color,
    watchers: presenceMap.get(`${String(transport._id)}:watching`) || 0,
    travellers: presenceMap.get(`${String(transport._id)}:travelling`) || 0,
    vehicles: vehicleMap.get(String(transport._id)) || 0,
    reliability: reliabilityMap.get(String(transport._id)) || emptyReliability(),
    fareMin: transport.fareMin ?? null,
    fareMax: transport.fareMax ?? null,
    fareCurrency: transport.fareCurrency || "BDT",
    fareNote: lang === "bn" && transport.fareNoteBn ? transport.fareNoteBn : transport.fareNote,
    fareSourceUrl: transport.fareSourceUrl || "",
  }));
}

export async function getTransportBySlug(slug: string, lang: Lang = "en") {
  await connectDB();
  const transport = await Transport.findOne({ slug, active: true }).lean() as unknown as {
    _id: unknown; name: string; nameBn?: string; slug: string; imageUrl: string;
    routeName: string; routeNameBn?: string; routeStops: string[]; routeStopsBn?: string[];
    stopCoords?: Array<{ name: string; nameBn?: string; lat: number; lng: number }>;
    routeVariants?: Array<{ routeName: string; routeStops: string[]; source: string }>; color: string;
    fareMin?: number | null; fareMax?: number | null; fareCurrency?: string; fareNote?: string; fareNoteBn?: string;
    fareSourceUrl?: string; fareVerifiedAt?: Date | null;
  } | null;
  if (!transport) return null;
  const reliability = await reliabilityForTransport(transport._id);
  return {
    id: String(transport._id), name: lang === "bn" && transport.nameBn ? transport.nameBn : transport.name, slug: transport.slug,
    imageUrl: transport.imageUrl,
    routeName: lang === "bn" && transport.routeNameBn ? transport.routeNameBn : transport.routeName,
    routeStops: lang === "bn" && transport.routeStopsBn?.length ? transport.routeStopsBn : transport.routeStops,
    stopCoords: (transport.stopCoords || []).map((stop) => ({
      name: lang === "bn" && stop.nameBn ? stop.nameBn : stop.name,
      lat: stop.lat,
      lng: stop.lng,
    })),
    routeVariants: transport.routeVariants || [], color: transport.color, reliability,
    fareMin: transport.fareMin ?? null, fareMax: transport.fareMax ?? null, fareCurrency: transport.fareCurrency || "BDT",
    fareNote: lang === "bn" && transport.fareNoteBn ? transport.fareNoteBn : transport.fareNote,
    fareSourceUrl: transport.fareSourceUrl || "", fareVerifiedAt: transport.fareVerifiedAt?.toISOString() || null,
  };
}
