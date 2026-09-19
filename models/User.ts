import { Schema, model, models } from "mongoose";
import { SIGNUP_POINTS } from "@/lib/constants";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    regularTransports: [{ type: Schema.Types.ObjectId, ref: "Transport" }],
    points: { type: Number, default: SIGNUP_POINTS, min: 0 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
