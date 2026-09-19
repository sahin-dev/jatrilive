import { Schema, model, models } from "mongoose";

const TransportSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    nameBn: { type: String, default: "", trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    imageUrl: { type: String, default: "" },
    routeName: { type: String, required: true, trim: true },
    routeNameBn: { type: String, default: "", trim: true },
    routeStops: [{ type: String, trim: true }],
    routeStopsBn: [{ type: String, trim: true }],
    stopCoords: [{
      name: { type: String, required: true },
      nameBn: { type: String, default: "" },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    }],
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
    fareMin: { type: Number, default: null, min: 0 },
    fareMax: { type: Number, default: null, min: 0 },
    fareCurrency: { type: String, default: "BDT" },
    fareNote: { type: String, default: "" },
    fareNoteBn: { type: String, default: "" },
    fareSourceUrl: { type: String, default: "" },
    fareVerifiedAt: { type: Date, default: null },
    color: { type: String, default: "#ff5c35" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TransportSchema.index({ name: "text", routeName: "text", routeStops: "text" });
export const Transport = models.Transport || model("Transport", TransportSchema);
