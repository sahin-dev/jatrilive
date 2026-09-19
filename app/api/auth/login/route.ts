import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { User } from "@/models/User";

const schema = z.object({ email: z.email().toLowerCase(), password: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await connectDB();
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    await createSession({ userId: String(user._id), role: user.role });
    return NextResponse.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, points: user.points } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
