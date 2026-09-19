import { LocateFixed, ShieldCheck, UsersRound } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { getDict, getLang } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const requested = (await searchParams).next;
  if (user) redirect(safeDestination(requested));
  const lang = await getLang();
  const t = getDict(lang);
  return <div className="auth-shell">
    <aside className="auth-aside"><span className="eyebrow light">{t.welcomeBack}</span><h1>{t.authAsideLoginTitle}</h1><p>{t.authAsideLoginSub}</p><div className="auth-benefits"><div><span><LocateFixed size={19} /></span>{t.benefitLive}</div><div><span><UsersRound size={19} /></span>{t.benefitWho}</div><div><span><ShieldCheck size={19} /></span>{t.benefitPrivate}</div></div></aside>
    <section className="auth-panel"><AuthForm mode="login" lang={lang} /></section>
  </div>;
}

function safeDestination(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}
