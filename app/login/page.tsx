import { LocateFixed, ShieldCheck, UsersRound } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return <div className="auth-shell">
    <aside className="auth-aside"><span className="eyebrow light">WELCOME BACK</span><h1>Dhaka keeps moving.</h1><p>See the latest passenger updates and help someone else make their bus.</p><div className="auth-benefits"><div><span><LocateFixed size={19} /></span>See live community locations</div><div><span><UsersRound size={19} /></span>Know who is watching and travelling</div><div><span><ShieldCheck size={19} /></span>Private by design</div></div></aside>
    <section className="auth-panel"><AuthForm mode="login" /></section>
  </div>;
}
