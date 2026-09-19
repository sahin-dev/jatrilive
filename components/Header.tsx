import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDict, getLang } from "@/lib/i18n-server";
import { BusFront, CircleUserRound } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LangToggle } from "@/components/LangToggle";

export async function Header() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLang()]);
  const t = getDict(lang);
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand" aria-label="JatriLive home">
          <span className="brand-mark"><BusFront size={22} strokeWidth={2.5} /></span>
          <span>Jatri<span>Live</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/#transports">{t.findTransport}</Link>
          <Link href="/journey">{lang === "bn" ? "যাত্রা পরিকল্পনা" : "Plan a journey"}</Link>
          <Link href="/leaderboard">{lang === "bn" ? "লিডারবোর্ড" : "Leaderboard"}</Link>
          {user && <Link href="/dashboard">{t.myActivity}</Link>}
          {user?.role === "admin" && <Link href="/admin">{t.admin}</Link>}
        </nav>
        <div className="nav-actions">
          <LangToggle lang={lang} />
          {user ? (
            <>
              <span className="points-pill"><span>●</span> {user.points} {t.points}</span>
              <NotificationsBell />
              <span className="user-name"><CircleUserRound size={18} /> {user.name.split(" ")[0]}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="text-button" href="/login">{t.signIn}</Link>
              <Link className="button button-small" href="/signup">{t.joinFree}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
