import { BellRing, Coins, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { getTransportCards } from "@/lib/transport-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join" };

export default async function SignupPage() {
  const transports = await getTransportCards();
  return <div className="auth-shell">
    <aside className="auth-aside"><span className="eyebrow light">MOVE DHAKA TOGETHER</span><h1>A clearer commute starts with you.</h1><p>Share what you see. Get the live information you need. Your identity always stays private.</p><div className="auth-benefits"><div><span><Coins size={19} /></span>10 free points when you join</div><div><span><BellRing size={19} /></span>Helpful updates from real passengers</div><div><span><ShieldCheck size={19} /></span>No personal information shown publicly</div></div></aside>
    <section className="auth-panel"><AuthForm mode="signup" transports={transports.map((item) => ({ id: item.id, name: item.name }))} /></section>
  </div>;
}
