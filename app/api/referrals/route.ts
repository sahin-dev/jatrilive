import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { ensureReferralCode } from "@/lib/referrals";
import { User } from "@/models/User";
import { REFERRAL_REWARD } from "@/lib/constants";

export async function GET() {
  try {
    const user = await requireApiUser();
    const code = await ensureReferralCode(user._id);
    const invited = await User.countDocuments({ referredBy: user._id });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({ code, invited, reward: REFERRAL_REWARD, link: `${baseUrl}/signup?ref=${encodeURIComponent(code)}` });
  } catch (error) { return apiError(error); }
}
