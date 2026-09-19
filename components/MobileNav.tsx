"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

type Labels = { find: string; journey: string; leaderboard: string; activity: string; admin: string; signIn: string; join: string };

export function MobileNav({ authenticated, isAdmin, labels }: { authenticated: boolean; isAdmin: boolean; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, []);
  return <div className="mobile-menu" ref={wrapper}>
    <button className="mobile-menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"}>
      {open ? <X size={20} /> : <Menu size={20} />}
    </button>
    {open && <nav className="mobile-menu-panel" aria-label="Mobile navigation">
      <Link href="/#transports" onClick={close}>{labels.find}</Link>
      <Link href="/journey" onClick={close}>{labels.journey}</Link>
      <Link href="/leaderboard" onClick={close}>{labels.leaderboard}</Link>
      {authenticated ? <>
        <Link href="/dashboard" onClick={close}>{labels.activity}</Link>
        {isAdmin && <Link href="/admin" onClick={close}>{labels.admin}</Link>}
        <LogoutButton />
      </> : <>
        <Link href="/login" onClick={close}>{labels.signIn}</Link>
        <Link href="/signup" className="mobile-join" onClick={close}>{labels.join}</Link>
      </>}
    </nav>}
  </div>;
}
