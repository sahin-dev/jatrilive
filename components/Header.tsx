import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { BusFront, CircleUserRound } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationsBell } from "@/components/NotificationsBell";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand" aria-label="JatriLive home">
          <span className="brand-mark"><BusFront size={22} strokeWidth={2.5} /></span>
          <span>Jatri<span>Live</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/#transports">Find transport</Link>
          {user && <Link href="/dashboard">My activity</Link>}
          {user?.role === "admin" && <Link href="/admin">Admin</Link>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="points-pill"><span>●</span> {user.points} points</span>
              <NotificationsBell />
              <span className="user-name"><CircleUserRound size={18} /> {user.name.split(" ")[0]}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="text-button" href="/login">Sign in</Link>
              <Link className="button button-small" href="/signup">Join free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
