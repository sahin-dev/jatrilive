import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { Notification } from "@/models/Notification";

export async function GET() {
  try {
    const user = await requireApiUser();
    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ notifications: notifications.map((item) => ({ id: String(item._id), title: item.title, message: item.message, read: item.read, createdAt: item.createdAt })) });
  } catch (error) { return apiError(error); }
}

export async function PATCH() {
  try {
    const user = await requireApiUser();
    await Notification.updateMany({ userId: user._id, read: false }, { $set: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
