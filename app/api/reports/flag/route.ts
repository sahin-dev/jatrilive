import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { LiveVehicle } from "@/models/LiveVehicle";
import { ReportFlag } from "@/models/ReportFlag";

const schema = z.object({
  vehicleId: z.string().min(1),
  reason: z.enum(["inaccurate", "wrong_route", "spam", "other"]),
  note: z.string().trim().max(300).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    const vehicle = await LiveVehicle.findById(input.vehicleId).select("transportId lastContributorId").lean() as unknown as {
      transportId: unknown; lastContributorId?: unknown;
    } | null;
    if (!vehicle) return NextResponse.json({ error: "Live vehicle not found." }, { status: 404 });
    if (String(vehicle.lastContributorId || "") === String(user._id)) return NextResponse.json({ error: "You cannot flag your own update." }, { status: 400 });
    const existing = await ReportFlag.exists({ reporterId: user._id, vehicleId: input.vehicleId, status: "pending" });
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
    await ReportFlag.create({
      reporterId: user._id, accusedUserId: vehicle.lastContributorId || null,
      vehicleId: input.vehicleId, transportId: vehicle.transportId, reason: input.reason, note: input.note,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
    return apiError(error);
  }
}
