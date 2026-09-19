import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ReportFlag } from "@/models/ReportFlag";
import { User } from "@/models/User";
import { trustLevelFor } from "@/lib/trust";
import { Types } from "mongoose";

const schema = z.object({ id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid report."), decision: z.enum(["confirmed", "dismissed"]) });

export async function PATCH(request: Request) {
  try {
    const admin = await requireApiUser();
    if (admin.role !== "admin") throw new Error("FORBIDDEN");
    const input = schema.parse(await request.json());
    const flag = await ReportFlag.findOneAndUpdate(
      { _id: input.id, status: "pending" },
      { $set: { status: input.decision, resolvedBy: admin._id, resolvedAt: new Date() } },
      { new: true },
    );
    if (!flag) return NextResponse.json({ error: "Pending report not found." }, { status: 404 });
    if (input.decision === "confirmed" && flag.accusedUserId) {
      const accused = await User.findById(flag.accusedUserId);
      if (accused) {
        accused.flaggedReports = (accused.flaggedReports || 0) + 1;
        accused.trustLevel = trustLevelFor(accused);
        await accused.save();
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
    return apiError(error);
  }
}
