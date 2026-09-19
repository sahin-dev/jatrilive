import { Schema, model, models } from "mongoose";

const PresenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", required: true },
    mode: { type: String, enum: ["watching", "travelling"], required: true },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    lastNotifiedAt: { type: Date, default: null },
    /** Paid watch pass: live locations on this transport are visible until this instant. */
    paidUntil: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

PresenceSchema.index({ userId: 1, transportId: 1, mode: 1 }, { unique: true });
PresenceSchema.index({ transportId: 1, mode: 1, active: 1, lastSeenAt: -1 });
export const Presence = models.Presence || model("Presence", PresenceSchema);
