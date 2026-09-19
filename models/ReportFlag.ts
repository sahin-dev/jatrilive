import { Schema, model, models } from "mongoose";

const ReportFlagSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accusedUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    vehicleId: { type: Schema.Types.ObjectId, ref: "LiveVehicle", required: true, index: true },
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", required: true, index: true },
    reason: { type: String, enum: ["inaccurate", "wrong_route", "spam", "other"], required: true },
    note: { type: String, default: "", maxlength: 300 },
    snapshot: {
      coordinates: { type: [Number], default: undefined },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updateCount: { type: Number, default: 0 },
      vehicleUpdatedAt: { type: Date, default: null },
      capturedAt: { type: Date, default: Date.now },
    },
    status: { type: String, enum: ["pending", "confirmed", "dismissed"], default: "pending", index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ReportFlagSchema.index({ reporterId: 1, vehicleId: 1, status: 1 });
export const ReportFlag = models.ReportFlag || model("ReportFlag", ReportFlagSchema);
