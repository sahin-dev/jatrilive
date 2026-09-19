import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { PushSubscription } from "@/models/PushSubscription";

const schema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    await PushSubscription.findOneAndUpdate(
      { endpoint: input.endpoint },
      { $set: { userId: user._id, keys: input.keys, userAgent: request.headers.get("user-agent") || "" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser();
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(await request.json());
    await PushSubscription.deleteOne({ userId: user._id, endpoint });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    return apiError(error);
  }
}
