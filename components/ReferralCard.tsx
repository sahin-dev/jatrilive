"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, Trophy } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type Referral = { code: string; link: string; invited: number; reward: number };

export function ReferralCard({ initialOptIn, lang = "en" }: { initialOptIn: boolean; lang?: Lang }) {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [copied, setCopied] = useState(false);
  const [optIn, setOptIn] = useState(initialOptIn);
  useEffect(() => { fetch("/api/referrals").then((response) => response.ok ? response.json() : null).then(setReferral).catch(() => undefined); }, []);

  async function copy() {
    if (!referral) return;
    await navigator.clipboard.writeText(referral.link);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }
  async function toggleOptIn() {
    const next = !optIn;
    const response = await fetch("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leaderboardOptIn: next }) });
    if (response.ok) setOptIn(next);
  }

  return <div className="growth-grid">
    <div className="growth-box"><span><Gift size={18} /></span><div><strong>{lang === "bn" ? "বন্ধুকে ডাকুন, দুজনেই পয়েন্ট পান" : "Invite friends, both earn points"}</strong><small>{referral ? (lang === "bn" ? `${referral.invited} জন যোগ দিয়েছেন · প্রত্যেকে +${referral.reward} পয়েন্ট` : `${referral.invited} joined · +${referral.reward} points each`) : (lang === "bn" ? "আমন্ত্রণ লোড হচ্ছে…" : "Loading your invite…")}</small>{referral && <div className="referral-code"><code>{referral.code}</code><button onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "লিংক কপি" : "Copy link")}</button></div>}</div></div>
    <div className="growth-box"><span><Trophy size={18} /></span><div><strong>{lang === "bn" ? "পাবলিক লিডারবোর্ড" : "Public leaderboard"}</strong><small>{lang === "bn" ? "আপনি না চাইলে আপনার পরিচয় গোপন থাকবে।" : "Your identity stays hidden unless you choose to show your first name."}</small><button className={`privacy-toggle ${optIn ? "on" : ""}`} onClick={toggleOptIn}>{optIn ? (lang === "bn" ? "প্রথম নাম দেখা যাবে" : "First name visible") : (lang === "bn" ? "বেনামী" : "Anonymous")}</button></div></div>
  </div>;
}
