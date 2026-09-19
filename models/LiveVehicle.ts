import { Schema, model, models } from "mongoose";

const LiveVehicleSchema = new Schema(
  {
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", required: true, index: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    accuracy: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    lastUpdatedAt: { type: Date, default: Date.now, index: true },
    updateCount: { type: Number, default: 1 },
    confidence: { type: Number, default: 1 },
    lastContributorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LiveVehicleSchema.index({ location: "2dsphere" });
LiveVehicleSchema.index({ transportId: 1, lastUpdatedAt: -1 });
export const LiveVehicle = models.LiveVehicle || model("LiveVehicle", LiveVehicleSchema);
