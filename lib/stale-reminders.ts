import { ACTIVE_PRESENCE_MS, NOTIFICATION_COOLDOWN_MS, STALE_NOTIFICATION_MS } from "@/lib/constants";
import { LiveVehicle } from "@/models/LiveVehicle";
import { Notification } from "@/models/Notification";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";

export async function sendStaleTransportReminders(transportId: string) {
  const now = Date.now();
  const activeCutoff = new Date(now - ACTIVE_PRESENCE_MS);
  const reminderCutoff = new Date(now - NOTIFICATION_COOLDOWN_MS);

  const [latest, watcherCount, transport] = await Promise.all([
    LiveVehicle.findOne({ transportId }).sort({ lastUpdatedAt: -1 }).select("lastUpdatedAt").lean() as unknown as Promise<{ lastUpdatedAt: Date } | null>,
    Presence.countDocuments({ transportId, mode: "watching", active: true, lastSeenAt: { $gte: activeCutoff } }),
    Transport.findById(transportId).select("name").lean() as unknown as Promise<{ name: string } | null>,
  ]);

  if (!watcherCount || (latest && latest.lastUpdatedAt >= new Date(now - STALE_NOTIFICATION_MS))) return 0;

  const travellers = await Presence.find({
    transportId,
    mode: "travelling",
    active: true,
    lastSeenAt: { $gte: activeCutoff },
    $or: [{ lastNotifiedAt: null }, { lastNotifiedAt: { $lt: reminderCutoff } }],
  }).select("_id userId").lean();

  let sent = 0;
  for (const traveller of travellers) {
    const claimed = await Presence.findOneAndUpdate(
      {
        _id: traveller._id,
        $or: [{ lastNotifiedAt: null }, { lastNotifiedAt: { $lt: reminderCutoff } }],
      },
      { $set: { lastNotifiedAt: new Date(now) } },
      { new: true }
    );
    if (!claimed) continue;
    await Notification.create({
      userId: traveller.userId,
      transportId,
      title: "Passengers need an update",
      message: `${watcherCount} ${watcherCount === 1 ? "person is" : "people are"} watching ${transport?.name || "this transport"}. Share your location if it is safe.`,
    });
    sent += 1;
  }
  return sent;
}
