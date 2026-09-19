import { estimateEtas, type StopCoord } from "@/lib/eta";
import { createUserNotification } from "@/lib/notifications";
import { StopAlert } from "@/models/StopAlert";
import { STOP_ALERT_COOLDOWN_MS } from "@/lib/constants";

export async function processStopAlerts(input: {
  vehicleId: unknown;
  transportId: unknown;
  transportName: string;
  transportNameBn?: string;
  transportSlug: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading?: number | null;
  lastUpdatedAt: Date;
  stops: StopCoord[];
}) {
  if (input.stops.length < 2) return 0;
  const eta = estimateEtas({
    latitude: input.latitude,
    longitude: input.longitude,
    heading: input.heading ?? null,
    speed: input.speed,
    lastUpdatedAt: input.lastUpdatedAt,
  }, input.stops);
  if (eta.nextStopIndex < 0) return 0;
  const alerts = await StopAlert.find({ transportId: input.transportId, active: true }).lean();
  let sent = 0;
  for (const alert of alerts) {
    const stopsAway = eta.direction === "forward"
      ? alert.stopIndex - eta.nextStopIndex + 1
      : eta.nextStopIndex - alert.stopIndex + 1;
    const stopEta = eta.etas[alert.stopIndex];
    if (stopsAway < 1 || stopsAway > alert.stopsBefore || stopEta?.etaMinutes === null || stopEta?.etaMinutes === undefined) continue;
    const claimed = await StopAlert.findOneAndUpdate(
      {
        _id: alert._id,
        active: true,
        $or: [
          { lastTriggeredVehicleId: { $ne: input.vehicleId } },
          { lastTriggeredAt: null },
          { lastTriggeredAt: { $lte: new Date(Date.now() - STOP_ALERT_COOLDOWN_MS) } },
        ],
      },
      { $set: { lastTriggeredVehicleId: input.vehicleId, lastTriggeredAt: new Date() } },
      { new: true },
    );
    if (!claimed) continue;
    const bangla = alert.language === "bn";
    await createUserNotification({
      userId: alert.userId,
      transportId: input.transportId,
      title: bangla ? `${input.transportNameBn || input.transportName} কাছে আসছে` : `${input.transportName} is approaching`,
      message: bangla
        ? `একটি বাস ${alert.stopName} থেকে প্রায় ${stopsAway} স্টপ দূরে (প্রায় ${stopEta.etaMinutes} মিনিট)।`
        : `A bus is about ${stopsAway} ${stopsAway === 1 ? "stop" : "stops"} from ${alert.stopName} (around ${stopEta.etaMinutes} min).`,
      kind: "stop_alert",
      url: `/transports/${input.transportSlug}`,
    });
    sent += 1;
  }
  return sent;
}
