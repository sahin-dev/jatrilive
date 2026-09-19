"use client";

import { useEffect, useState } from "react";
import { BellRing, Download } from "lucide-react";
import type { Lang } from "@/lib/i18n";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PwaControls({ lang = "en" }: { lang?: Lang }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setPushEnabled(Boolean(subscription))).catch(() => undefined);
    }
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function enablePush() {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (response.ok) setPushEnabled(true);
    } finally { setBusy(false); }
  }

  return <div className="pwa-controls">
    {installPrompt && <button className="mode-button" onClick={install}><Download size={16} /> {lang === "bn" ? "JatriLive ইনস্টল করুন" : "Install JatriLive"}</button>}
    <button className={`mode-button ${pushEnabled ? "active" : ""}`} onClick={enablePush} disabled={busy || pushEnabled || !publicKey}>
      <BellRing size={16} /> {pushEnabled ? (lang === "bn" ? "পুশ অ্যালার্ট চালু" : "Push alerts enabled") : publicKey ? (lang === "bn" ? "ব্যাকগ্রাউন্ড অ্যালার্ট চালু করুন" : "Enable background alerts") : (lang === "bn" ? "পুশ সেটআপ প্রয়োজন" : "Push setup required")}
    </button>
  </div>;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
