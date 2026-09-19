import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getTransportCards } from "@/lib/transport-data";
import { slugify } from "@/lib/utils";
import { Transport } from "@/models/Transport";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  routeName: z.string().trim().min(3).max(200),
  routeStops: z.array(z.string().trim().min(1)).min(2),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff5c35"),
  fareMin: z.number().min(0).nullable().optional(),
  fareMax: z.number().min(0).nullable().optional(),
  fareNote: z.string().trim().max(300).optional().default(""),
  fareSourceUrl: z.string().url().or(z.literal("")).optional().default(""),
});

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
