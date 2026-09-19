import { Schema, model, models } from "mongoose";
import { CROWD_REPORT_MS } from "@/lib/constants";

export const CROWD_LEVELS = ["empty", "seats", "standing", "packed"] as const;
export type CrowdLevel = (typeof CROWD_LEVELS)[number];

const CrowdReportSchema = new Schema(
  {
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "LiveVehicle", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    level: { type: String, enum: CROWD_LEVELS, required: true },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + CROWD_REPORT_MS) },
  },
  { timestamps: true },
);

CrowdReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CrowdReportSchema.index({ transportId: 1, vehicleId: 1, createdAt: -1 });

export const CrowdReport = models.CrowdReport || model("CrowdReport", CrowdReportSchema);
