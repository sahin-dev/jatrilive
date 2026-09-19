import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTransportBySlug } from "@/lib/transport-data";
import { TransportLiveClient } from "@/components/TransportLiveClient";

export const dynamic = "force-dynamic";

export default async function TransportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const transport = await getTransportBySlug(slug);
  if (!transport) notFound();
  if (!(await getCurrentUser())) redirect(`/login?next=/transports/${slug}`);
  return <div className="page-shell"><div className="container"><div className="breadcrumbs"><Link href="/">Home</Link> &nbsp;/&nbsp; Live transport &nbsp;/&nbsp; {transport.name}</div><div className="page-title-row"><div><span className="eyebrow accent">LIVE ROUTE</span><h1>{transport.name}</h1><p>{transport.routeName}</p></div><span className="route-badge">Community powered</span></div><TransportLiveClient transport={transport} /></div></div>;
}
