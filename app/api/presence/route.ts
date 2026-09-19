import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ACTIVE_PRESENCE_MS, WATCH_COST } from "@/lib/constants";
import { Presence } from "@/models/Presence";
import { PointTransaction } from "@/models/PointTransaction";
import { sendStaleTransportReminders } from "@/lib/stale-reminders";
import { Types } from "mongoose";
import { Transport } from "@/models/Transport";
import { User } from "@/models/User";

const schema = z.object({
  transportId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid transport."),
  mode: z.enum(["watching", "travelling"]),
  active: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    if (!await Transport.exists({ _id: input.transportId, active: true })) return NextResponse.json({ error: "Transport not found." }, { status: 404 });
    const existing = await Presence.findOne({ userId: user._id, transportId: input.transportId, mode: input.mode });
    const wasRecentlyActive = existing?.active && existing.lastSeenAt >= new Date(Date.now() - ACTIVE_PRESENCE_MS);
    let points = user.points;

    if (input.active && input.mode === "watching" && !wasRecentlyActive) {
      const charged = await User.findOneAndUpdate({ _id: user._id, points: { $gte: WATCH_COST } }, { $inc: { points: -WATCH_COST } }, { new: true });
      if (!charged) throw new Error("NO_POINTS");
      points = charged.points;
      await PointTransaction.create({ userId: user._id, amount: -WATCH_COST, reason: "watch_started", transportId: input.transportId });
    }

    await Presence.findOneAndUpdate(
      { userId: user._id, transportId: input.transportId, mode: input.mode },
      { $set: { active: input.active, lastSeenAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (input.active && input.mode === "watching") {
      await sendStaleTransportReminders(input.transportId);
    }
    return NextResponse.json({ ok: true, points });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid presence request." }, { status: 400 });
    return apiError(error);
  }
}
