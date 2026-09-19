import { Schema, model, models } from "mongoose";

const TransportSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    imageUrl: { type: String, default: "" },
    routeName: { type: String, required: true, trim: true },
    routeStops: [{ type: String, trim: true }],
    routeVariants: [{
      routeName: { type: String, required: true },
      routeStops: [{ type: String, trim: true }],
      source: { type: String, required: true },
    }],
    sourceInfo: [{
      fileName: { type: String, required: true },
      importedAt: { type: Date, required: true },
    }],
    dataStatus: { type: String, enum: ["manual", "unverified_import", "verified"], default: "manual" },
    color: { type: String, default: "#ff5c35" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TransportSchema.index({ name: "text", routeName: "text", routeStops: "text" });
export const Transport = models.Transport || model("Transport", TransportSchema);
