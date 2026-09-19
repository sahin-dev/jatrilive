import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import type { Types } from "mongoose";

const COOKIE_NAME = "jatrilive_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "development-secret-change-me");

type SessionPayload = { userId: string; role: "user" | "admin" };
export type CurrentUser = {
  _id: Types.ObjectId; name: string; email: string; role: "user" | "admin"; points: number;
  regularTransports: Types.ObjectId[]; referralCode?: string; leaderboardOptIn: boolean;
  acceptedUpdates: number; corroboratedUpdates: number; flaggedReports: number; trustLevel: "newcomer" | "contributor" | "trusted";
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.userId).select("name email role points regularTransports referralCode leaderboardOptIn acceptedUpdates corroboratedUpdates flaggedReports trustLevel").lean();
  return user as CurrentUser | null;
}

export async function requireApiUser() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await connectDB();
  const user = await User.findById(session.userId);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
