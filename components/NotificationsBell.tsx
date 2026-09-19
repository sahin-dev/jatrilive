"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";

type Item = { id: string; title: string; message: string; read: boolean; createdAt: string };

export function NotificationsBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const known = useRef(new Set<string>());

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const next: Item[] = data.notifications;
    next.forEach((item) => {
      if (!known.current.has(item.id) && !item.read && known.current.size && "Notification" in window && Notification.permission === "granted") {
        new Notification(item.title, { body: item.message, icon: "/icon.svg" });
      }
      known.current.add(item.id);
    });
    setItems(next);
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 30_000); return () => window.clearInterval(timer); }, [load]);
  async function markRead() { await fetch("/api/notifications", { method: "PATCH" }); setItems((current) => current.map((item) => ({ ...item, read: true }))); }
  const unread = items.filter((item) => !item.read).length;

  return <div className="notifications-wrap"><button className="bell-button" aria-label="Notifications" onClick={() => setOpen((value) => !value)}><Bell size={18} />{unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}</button>{open && <div className="notification-popover"><div className="notification-head"><strong>Notifications</strong>{unread > 0 && <button onClick={markRead}><Check size={13} /> Mark read</button>}</div>{items.length ? <div className="notification-list">{items.slice(0, 6).map((item) => <div className={`notification-item ${item.read ? "" : "unread"}`} key={item.id}><span /><p><strong>{item.title}</strong><small>{item.message}</small></p></div>)}</div> : <div className="notification-empty">No notifications yet.</div>}</div>}</div>;
}
