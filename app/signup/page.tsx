import { BellRing, Coins, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { getTransportCards } from "@/lib/transport-data";
import { getDict, getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join" };

export default async function SignupPage() {
  const lang = await getLang();
  const transports = await getTransportCards("", lang);
  const t = getDict(lang);
  return <div className="auth-shell">
    <aside className="auth-aside"><span className="eyebrow light">{t.moveDhaka}</span><h1>{t.authSignupAsideTitle}</h1><p>{t.authSignupAsideSub}</p><div className="auth-benefits"><div><span><Coins size={19} /></span>{t.benefit10}</div><div><span><BellRing size={19} /></span>{t.benefitUpdates}</div><div><span><ShieldCheck size={19} /></span>{t.benefitPrivacy}</div></div></aside>
    <section className="auth-panel"><AuthForm mode="signup" transports={transports.map((item) => ({ id: item.id, name: item.name }))} lang={lang} /></section>
  </div>;
}
