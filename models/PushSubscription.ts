import { Schema, model, models } from "mongoose";

const PushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

export const PushSubscription = models.PushSubscription || model("PushSubscription", PushSubscriptionSchema);
