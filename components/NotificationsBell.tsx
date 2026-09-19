"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";

type Item = { id: string; title: string; message: string; read: boolean; createdAt: string; url?: string };

export function NotificationsBell({ lang = "en" }: { lang?: Lang }) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const known = useRef(new Set<string>());
  const wrapper = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const next: Item[] = data.notifications;
    next.forEach((item) => {
      if (!known.current.has(item.id) && !item.read && known.current.size && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(item.title, { body: item.message, icon: "/icon.svg" });
        notification.onclick = () => { window.focus(); window.location.assign(item.url || "/dashboard"); };
      }
      known.current.add(item.id);
    });
    setItems(next);
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 30_000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);
  async function markRead() { const response = await fetch("/api/notifications", { method: "PATCH" }); if (response.ok) setItems((current) => current.map((item) => ({ ...item, read: true }))); }
  const unread = items.filter((item) => !item.read).length;

  return <div className="notifications-wrap" ref={wrapper}><button className="bell-button" aria-label={lang === "bn" ? "নোটিফিকেশন" : "Notifications"} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={18} />{unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}</button>{open && <div className="notification-popover" role="dialog" aria-label={lang === "bn" ? "নোটিফিকেশন" : "Notifications"}><div className="notification-head"><strong>{lang === "bn" ? "নোটিফিকেশন" : "Notifications"}</strong>{unread > 0 && <button onClick={markRead}><Check size={13} /> {lang === "bn" ? "পঠিত করুন" : "Mark read"}</button>}</div>{items.length ? <div className="notification-list">{items.slice(0, 6).map((item) => <Link href={item.url || "/dashboard"} onClick={() => setOpen(false)} className={`notification-item ${item.read ? "" : "unread"}`} key={item.id}><span /><p><strong>{item.title}</strong><small>{item.message}</small></p></Link>)}</div> : <div className="notification-empty">{lang === "bn" ? "এখনও কোনো নোটিফিকেশন নেই।" : "No notifications yet."}</div>}</div>}</div>;
}
