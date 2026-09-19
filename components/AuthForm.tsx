"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDict, type Lang } from "@/lib/i18n";

type TransportOption = { id: string; name: string };

export function AuthForm({ mode, transports = [], lang = "en" }: { mode: "login" | "signup"; transports?: TransportOption[]; lang?: Lang }) {
  const t = getDict(lang);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  useEffect(() => { if (mode === "signup") setReferralCode(new URLSearchParams(window.location.search).get("ref") || ""); }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = mode === "signup"
      ? { name: form.get("name"), email: form.get("email"), password: form.get("password"), regularTransports: form.get("regularTransport") ? [form.get("regularTransport")] : [], referralCode: form.get("referralCode") }
      : { email: form.get("email"), password: form.get("password") };
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h2>{mode === "signup" ? t.createAccount : t.welcomeBackTitle}</h2>
      <p>{mode === "signup" ? t.authSignupSub : t.authLoginSub}</p>
      <div className="form-grid">
        {mode === "signup" && <div className="field"><label htmlFor="name">{t.yourName}</label><input id="name" name="name" placeholder={t.namePlaceholder} required minLength={2} /></div>}
        <div className="field"><label htmlFor="email">{t.email}</label><input id="email" name="email" type="email" placeholder={t.emailPlaceholder} required /></div>
        <div className="field"><label htmlFor="password">{t.password}</label><input id="password" name="password" type="password" placeholder={t.passwordPlaceholder} required minLength={8} /></div>
        {mode === "signup" && <div className="field"><label htmlFor="regularTransport">{t.regularTransport}</label><select id="regularTransport" name="regularTransport" defaultValue=""><option value="">{t.selectOptional}</option>{transports.map((transport) => <option value={transport.id} key={transport.id}>{transport.name}</option>)}</select></div>}
        {mode === "signup" && <div className="field"><label htmlFor="referralCode">{lang === "bn" ? "রেফারেল কোড (ঐচ্ছিক)" : "Referral code (optional)"}</label><input id="referralCode" name="referralCode" value={referralCode} onChange={(event) => setReferralCode(event.target.value.toUpperCase())} placeholder="JATRI-ABC123" /></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button wide" disabled={loading}>{loading ? t.pleaseWait : mode === "signup" ? t.joinPoints : t.signIn}</button>
      </div>
      <p className="form-foot">{mode === "signup" ? <>{t.alreadyMember} <Link href="/login">{t.signIn}</Link></> : <>{t.newHere} <Link href="/signup">{t.createAccountLink}</Link></>}</p>
    </form>
  );
}
