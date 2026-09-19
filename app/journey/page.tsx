import { Route } from "lucide-react";
import { getTransportCards } from "@/lib/transport-data";
import { getLang } from "@/lib/i18n-server";
import { JourneyPlanner } from "@/components/JourneyPlanner";
import type { TransportCardData } from "@/components/TransportExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journey planner" };

export default async function JourneyPage() {
  const lang = await getLang();
  const transports = await getTransportCards("", lang);
  return <div className="page-shell"><div className="container"><div className="page-title-row"><div><span className="eyebrow accent"><Route size={14} /> {lang === "bn" ? "যাত্রা পরিকল্পনা" : "JOURNEY PLANNER"}</span><h1>{lang === "bn" ? "কোন বাসে যাবেন?" : "Find your way across Dhaka"}</h1><p>{lang === "bn" ? "শুরুর ও গন্তব্য স্টপ দিয়ে সরাসরি বা একবার বদলের রুট খুঁজুন।" : "Enter two stops to find direct routes or a simple one-transfer connection."}</p></div></div><JourneyPlanner transports={transports as TransportCardData[]} lang={lang} /></div></div>;
}
