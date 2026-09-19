import { Schema, model, models } from "mongoose";

const StopAlertSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", required: true, index: true },
    stopIndex: { type: Number, required: true, min: 0 },
    stopName: { type: String, required: true },
    stopsBefore: { type: Number, enum: [1, 2, 3], default: 2 },
    active: { type: Boolean, default: true },
    lastTriggeredVehicleId: { type: Schema.Types.ObjectId, ref: "LiveVehicle", default: null },
    lastTriggeredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

StopAlertSchema.index({ userId: 1, transportId: 1, stopIndex: 1 }, { unique: true });
StopAlertSchema.index({ transportId: 1, active: 1 });
export const StopAlert = models.StopAlert || model("StopAlert", StopAlertSchema);
