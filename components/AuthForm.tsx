"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TransportOption = { id: string; name: string };

export function AuthForm({ mode, transports = [] }: { mode: "login" | "signup"; transports?: TransportOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = mode === "signup"
      ? { name: form.get("name"), email: form.get("email"), password: form.get("password"), regularTransports: form.get("regularTransport") ? [form.get("regularTransport")] : [] }
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
      <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
      <p>{mode === "signup" ? "Join Dhaka's passenger-powered live network." : "Sign in to watch buses and share updates."}</p>
      <div className="form-grid">
        {mode === "signup" && <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" placeholder="e.g. Sahin Ahmed" required minLength={2} /></div>}
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" placeholder="you@example.com" required /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} /></div>
        {mode === "signup" && <div className="field"><label htmlFor="regularTransport">Transport you regularly use</label><select id="regularTransport" name="regularTransport" defaultValue=""><option value="">Select one (optional)</option>{transports.map((transport) => <option value={transport.id} key={transport.id}>{transport.name}</option>)}</select></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button wide" disabled={loading}>{loading ? "Please wait…" : mode === "signup" ? "Join JatriLive — get 10 points" : "Sign in"}</button>
      </div>
      <p className="form-foot">{mode === "signup" ? <>Already a member? <Link href="/login">Sign in</Link></> : <>New to JatriLive? <Link href="/signup">Create an account</Link></>}</p>
    </form>
  );
}
