import { estimateEtas, type StopCoord } from "@/lib/eta";
import { createUserNotification } from "@/lib/notifications";
import { StopAlert } from "@/models/StopAlert";

export async function processStopAlerts(input: {
  vehicleId: unknown;
  transportId: unknown;
  transportName: string;
  transportSlug: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  lastUpdatedAt: Date;
  stops: StopCoord[];
}) {
  if (input.stops.length < 2) return 0;
  const eta = estimateEtas({
    latitude: input.latitude,
    longitude: input.longitude,
    speed: input.speed,
    lastUpdatedAt: input.lastUpdatedAt,
  }, input.stops);
  if (eta.nextStopIndex < 0) return 0;
  const alerts = await StopAlert.find({ transportId: input.transportId, active: true }).lean();
  let sent = 0;
  for (const alert of alerts) {
    const stopsAway = alert.stopIndex - eta.nextStopIndex + 1;
    const stopEta = eta.etas[alert.stopIndex];
    if (stopsAway < 1 || stopsAway > alert.stopsBefore || stopEta?.etaMinutes === null || stopEta?.etaMinutes === undefined) continue;
    const claimed = await StopAlert.findOneAndUpdate(
      { _id: alert._id, active: true, lastTriggeredVehicleId: { $ne: input.vehicleId } },
      { $set: { lastTriggeredVehicleId: input.vehicleId, lastTriggeredAt: new Date() } },
      { new: true },
    );
    if (!claimed) continue;
    await createUserNotification({
      userId: alert.userId,
      transportId: input.transportId,
      title: `${input.transportName} is approaching`,
      message: `A bus is about ${stopsAway} ${stopsAway === 1 ? "stop" : "stops"} from ${alert.stopName} (around ${stopEta.etaMinutes} min).`,
      kind: "stop_alert",
      url: `/transports/${input.transportSlug}`,
    });
    sent += 1;
  }
  return sent;
}
