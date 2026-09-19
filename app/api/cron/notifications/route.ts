import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ACTIVE_PRESENCE_MS, NOTIFICATION_COOLDOWN_MS, STALE_NOTIFICATION_MS } from "@/lib/constants";
import { LiveVehicle } from "@/models/LiveVehicle";
import { Notification } from "@/models/Notification";
import { Presence } from "@/models/Presence";
import { Transport } from "@/models/Transport";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const now = Date.now();
  const activeCutoff = new Date(now - ACTIVE_PRESENCE_MS);
  const travellers = await Presence.find({ mode: "travelling", active: true, lastSeenAt: { $gte: activeCutoff }, $or: [{ lastNotifiedAt: null }, { lastNotifiedAt: { $lt: new Date(now - NOTIFICATION_COOLDOWN_MS) } }] }).lean();
  let sent = 0;
  for (const traveller of travellers) {
    const [latest, watcherCount, transport] = await Promise.all([
      LiveVehicle.findOne({ transportId: traveller.transportId }).sort({ lastUpdatedAt: -1 }).lean() as unknown as Promise<{ lastUpdatedAt: Date } | null>,
      Presence.countDocuments({ transportId: traveller.transportId, mode: "watching", active: true, lastSeenAt: { $gte: activeCutoff } }),
      Transport.findById(traveller.transportId).select("name").lean() as unknown as Promise<{ name: string } | null>,
    ]);
    if (watcherCount > 0 && (!latest || latest.lastUpdatedAt < new Date(now - STALE_NOTIFICATION_MS))) {
      await Promise.all([
        Notification.create({ userId: traveller.userId, transportId: traveller.transportId, title: "Passengers need an update", message: `${watcherCount} ${watcherCount === 1 ? "person is" : "people are"} watching ${transport?.name || "this transport"}. Share your location if it is safe.` }),
        Presence.updateOne({ _id: traveller._id }, { $set: { lastNotifiedAt: new Date() } }),
      ]);
      sent += 1;
    }
  }
  return NextResponse.json({ ok: true, sent });
}
