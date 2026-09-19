import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { StopAlert } from "@/models/StopAlert";
import { Transport } from "@/models/Transport";
import { getLang } from "@/lib/i18n-server";

const createSchema = z.object({
  transportId: z.string().min(1),
  stopIndex: z.number().int().min(0),
  stopsBefore: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const transportId = new URL(request.url).searchParams.get("transportId");
    const alerts = await StopAlert.find({ userId: user._id, ...(transportId ? { transportId } : {}) }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ alerts: alerts.map((alert) => ({
      id: String(alert._id), transportId: String(alert.transportId), stopIndex: alert.stopIndex,
      stopName: alert.stopName, stopsBefore: alert.stopsBefore, active: alert.active,
    })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = createSchema.parse(await request.json());
    const lang = await getLang();
    const transport = await Transport.findOne({ _id: input.transportId, active: true }).select("stopCoords routeStops routeStopsBn").lean() as unknown as {
      stopCoords?: Array<{ name: string; nameBn?: string }>;
      routeStops: string[]; routeStopsBn?: string[];
    } | null;
    if (!transport) return NextResponse.json({ error: "Transport not found." }, { status: 404 });
    const stops = transport.stopCoords?.length
      ? transport.stopCoords.map((stop) => lang === "bn" && stop.nameBn ? stop.nameBn : stop.name)
      : lang === "bn" && transport.routeStopsBn?.length ? transport.routeStopsBn : transport.routeStops;
    if (!stops[input.stopIndex]) return NextResponse.json({ error: "Stop not found." }, { status: 400 });
    const alert = await StopAlert.findOneAndUpdate(
      { userId: user._id, transportId: input.transportId, stopIndex: input.stopIndex },
      { $set: { stopName: stops[input.stopIndex], stopsBefore: input.stopsBefore, active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ alert: { id: String(alert._id), stopIndex: alert.stopIndex, stopName: alert.stopName, stopsBefore: alert.stopsBefore, active: alert.active } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid stop alert." }, { status: 400 });
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Alert id is required." }, { status: 400 });
    await StopAlert.deleteOne({ _id: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
