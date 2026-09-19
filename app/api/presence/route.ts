import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ACTIVE_PRESENCE_MS, WATCH_COST } from "@/lib/constants";
import { Presence } from "@/models/Presence";
import { PointTransaction } from "@/models/PointTransaction";

const schema = z.object({
  transportId: z.string().min(1),
  mode: z.enum(["watching", "travelling"]),
  active: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    const existing = await Presence.findOne({ userId: user._id, transportId: input.transportId, mode: input.mode });
    const wasRecentlyActive = existing?.active && existing.lastSeenAt >= new Date(Date.now() - ACTIVE_PRESENCE_MS);

    if (input.active && input.mode === "watching" && !wasRecentlyActive) {
      if (user.points < WATCH_COST) throw new Error("NO_POINTS");
      user.points -= WATCH_COST;
      await Promise.all([
        user.save(),
        PointTransaction.create({ userId: user._id, amount: -WATCH_COST, reason: "watch_started", transportId: input.transportId }),
      ]);
    }

    await Presence.findOneAndUpdate(
      { userId: user._id, transportId: input.transportId, mode: input.mode },
      { $set: { active: input.active, lastSeenAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ ok: true, points: user.points });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid presence request." }, { status: 400 });
    return apiError(error);
  }
}
