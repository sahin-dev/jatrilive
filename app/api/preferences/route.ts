import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";

const schema = z.object({ leaderboardOptIn: z.boolean() });

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    user.leaderboardOptIn = input.leaderboardOptIn;
    await user.save();
    return NextResponse.json({ ok: true, leaderboardOptIn: user.leaderboardOptIn });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid preference." }, { status: 400 });
    return apiError(error);
  }
}
