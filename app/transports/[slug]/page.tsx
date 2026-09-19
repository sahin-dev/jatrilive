import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTransportBySlug } from "@/lib/transport-data";
import { getDict, getLang } from "@/lib/i18n-server";
import { TransportLiveClient } from "@/components/TransportLiveClient";

export const dynamic = "force-dynamic";

export default async function TransportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, lang] = await Promise.all([getCurrentUser(), getLang()]);
  const transport = await getTransportBySlug(slug, lang);
  if (!transport) notFound();
  if (!user) redirect(`/login?next=/transports/${slug}`);
  const t = getDict(lang);
  return <div className="page-shell"><div className="container"><div className="breadcrumbs"><Link href="/">{lang === "bn" ? "হোম" : "Home"}</Link> &nbsp;/&nbsp; {t.liveRoute} &nbsp;/&nbsp; {transport.name}</div><div className="page-title-row"><div><span className="eyebrow accent">{t.liveRoute}</span><h1>{transport.name}</h1><p>{transport.routeName}</p></div><span className="route-badge">{t.communityPowered}</span></div><TransportLiveClient transport={transport} lang={lang} /></div></div>;
}
