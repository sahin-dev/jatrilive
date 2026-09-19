import { randomBytes } from "crypto";
import { User } from "@/models/User";

export async function createUniqueReferralCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `JATRI-${randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`;
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  throw new Error("Could not generate a referral code.");
}

export async function ensureReferralCode(userId: unknown) {
  const existing = await User.findById(userId).select("referralCode").lean() as unknown as { referralCode?: string } | null;
  if (existing?.referralCode) return existing.referralCode;
  const referralCode = await createUniqueReferralCode();
  const updated = await User.findOneAndUpdate(
    { _id: userId, $or: [{ referralCode: null }, { referralCode: { $exists: false } }, { referralCode: "" }] },
    { $set: { referralCode } },
    { new: true },
  ).select("referralCode").lean() as unknown as { referralCode?: string } | null;
  return updated?.referralCode || existing?.referralCode || referralCode;
}
