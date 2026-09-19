import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getTransportCards } from "@/lib/transport-data";
import { slugify } from "@/lib/utils";
import { Transport } from "@/models/Transport";

const baseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  nameBn: z.string().trim().max(100).optional().default(""),
  routeName: z.string().trim().min(3).max(200),
  routeNameBn: z.string().trim().max(200).optional().default(""),
  routeStops: z.array(z.string().trim().min(1)).min(2),
  routeStopsBn: z.array(z.string().trim().min(1)).optional().default([]),
  stopCoords: z.array(z.object({
    name: z.string().trim().min(1),
    nameBn: z.string().trim().optional().default(""),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).optional().default([]),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff5c35"),
  fareMin: z.number().min(0).nullable().optional(),
  fareMax: z.number().min(0).nullable().optional(),
  fareNote: z.string().trim().max(300).optional().default(""),
  fareSourceUrl: z.string().url().or(z.literal("")).optional().default(""),
});
const validateTransport = (value: z.infer<typeof baseSchema>, context: z.RefinementCtx) => {
  if (value.fareMin !== null && value.fareMin !== undefined && value.fareMax !== null && value.fareMax !== undefined && value.fareMax < value.fareMin) {
    context.addIssue({ code: "custom", path: ["fareMax"], message: "Maximum fare must be at least the minimum fare." });
  }
  if (value.routeStopsBn.length && value.routeStopsBn.length !== value.routeStops.length) {
    context.addIssue({ code: "custom", path: ["routeStopsBn"], message: "Bangla stops must match the English stop count." });
  }
  if (value.stopCoords.length && value.stopCoords.length !== value.routeStops.length) {
    context.addIssue({ code: "custom", path: ["stopCoords"], message: "Coordinates must be provided for every stop, in route order." });
  }
};
const schema = baseSchema.superRefine(validateTransport);
const updateSchema = baseSchema.extend({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transport.") }).superRefine(validateTransport);

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") || "";
  return NextResponse.json({ transports: await getTransportCards(q) });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (user.role !== "admin") throw new Error("FORBIDDEN");
    const input = schema.parse(await request.json());
    const transport = await Transport.create({ ...input, slug: slugify(input.name) });
    return NextResponse.json({ transport }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    if (user.role !== "admin") throw new Error("FORBIDDEN");
    const input = updateSchema.parse(await request.json());
    const { id, ...changes } = input;
    const transport = await Transport.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
    if (!transport) return NextResponse.json({ error: "Transport not found." }, { status: 404 });
    return NextResponse.json({ transport });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
