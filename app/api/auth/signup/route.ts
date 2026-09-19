import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { SIGNUP_POINTS } from "@/lib/constants";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(100),
  regularTransports: z.array(z.string()).max(10).default([]),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await connectDB();
    if (await User.exists({ email: input.email })) return NextResponse.json({ error: "An account already uses this email." }, { status: 409 });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const firstUser = (await User.countDocuments()) === 0;
    const user = await User.create({ ...input, passwordHash, points: SIGNUP_POINTS, role: firstUser ? "admin" : "user" });
    await PointTransaction.create({ userId: user._id, amount: SIGNUP_POINTS, reason: "signup_bonus" });
    await createSession({ userId: String(user._id), role: user.role });
    return NextResponse.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, points: user.points } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }
}
