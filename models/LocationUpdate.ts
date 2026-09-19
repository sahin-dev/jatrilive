import { Schema, model, models } from "mongoose";

const LocationUpdateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "LiveVehicle", required: true },
    location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
    accuracy: Number,
    rewarded: { type: Boolean, default: true },
    helpedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

LocationUpdateSchema.index({ userId: 1, transportId: 1, createdAt: -1 });
export const LocationUpdate = models.LocationUpdate || model("LocationUpdate", LocationUpdateSchema);
