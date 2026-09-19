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

  return Promise.all(
    transports.map(async (transport) => {
      const [watchers, travellers, vehicles] = await Promise.all([
        Presence.countDocuments({ transportId: transport._id, mode: "watching", active: true, lastSeenAt: { $gte: cutoff } }),
        Presence.countDocuments({ transportId: transport._id, mode: "travelling", active: true, lastSeenAt: { $gte: cutoff } }),
        LiveVehicle.countDocuments({ transportId: transport._id, lastUpdatedAt: { $gte: vehicleCutoff } }),
      ]);
      return {
        id: String(transport._id),
        name: transport.name,
        slug: transport.slug,
        imageUrl: transport.imageUrl,
        routeName: transport.routeName,
        routeStops: transport.routeStops,
        color: transport.color,
        watchers,
        travellers,
        vehicles,
      };
    })
  );
}

export async function getTransportBySlug(slug: string) {
  await connectDB();
  const transport = await Transport.findOne({ slug, active: true }).lean() as unknown as { _id: unknown; name: string; slug: string; imageUrl: string; routeName: string; routeStops: string[]; color: string } | null;
  if (!transport) return null;
  return {
    id: String(transport._id), name: transport.name, slug: transport.slug,
    imageUrl: transport.imageUrl, routeName: transport.routeName,
    routeStops: transport.routeStops, color: transport.color,
  };
}
