import { Schema, model, models } from "mongoose";

const PointTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, enum: ["signup_bonus", "location_update", "watch_started"], required: true },
    transportId: { type: Schema.Types.ObjectId, ref: "Transport", default: null },
  },
  { timestamps: true }
);

export const PointTransaction = models.PointTransaction || model("PointTransaction", PointTransactionSchema);
