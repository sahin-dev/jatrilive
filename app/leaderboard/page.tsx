import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n-server";
import { LocationUpdate } from "@/models/LocationUpdate";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLang()]);
  await connectDB();
  void User;
  const since = new Date(Date.now() - 7 * 86_400_000);
  const rows = await LocationUpdate.aggregate([
    { $match: { createdAt: { $gte: since }, rewarded: true } },
    { $group: { _id: "$userId", updates: { $sum: 1 }, routes: { $addToSet: "$transportId" }, helped: { $sum: "$helpedCount" } } },
    { $sort: { updates: -1, helped: -1 } },
    { $limit: 50 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { updates: 1, helped: 1, routeCount: { $size: "$routes" }, "user.name": 1, "user.leaderboardOptIn": 1, "user.trustLevel": 1 } },
  ]);
  return <div className="page-shell"><div className="container leaderboard-page"><div className="page-title-row"><div><span className="eyebrow accent"><Trophy size={14} /> {lang === "bn" ? "সাপ্তাহিক অবদান" : "WEEKLY CONTRIBUTIONS"}</span><h1>{lang === "bn" ? "ঢাকার সহায়ক যাত্রীরা" : "Dhaka's route helpers"}</h1><p>{lang === "bn" ? "গত ৭ দিনের গ্রহণযোগ্য লোকেশন আপডেট অনুযায়ী।" : "Ranked by accepted location updates from the last seven days."}</p></div>{!user && <Link href="/signup" className="button">Join the community</Link>}</div><div className="leaderboard-list">{rows.length ? rows.map((row, index) => {
    const isMe = user && String(row._id) === String(user._id);
    const label = isMe ? (lang === "bn" ? "আপনি" : "You") : row.user.leaderboardOptIn ? row.user.name.split(" ")[0] : `${lang === "bn" ? "যাত্রী" : "Rider"} •${String(row._id).slice(-4).toUpperCase()}`;
    return <div className={`leaderboard-row ${isMe ? "me" : ""}`} key={String(row._id)}><span className="rank">{index < 3 ? <Medal size={20} /> : index + 1}</span><div><strong>{label}</strong><small>{row.user.trustLevel} · {row.routeCount} {lang === "bn" ? "রুট" : "routes"}</small></div><span><strong>{row.updates}</strong><small>{lang === "bn" ? "আপডেট" : "updates"}</small></span><span><strong>{row.helped || 0}</strong><small>{lang === "bn" ? "ওয়াচার রিচ" : "watcher reach"}</small></span></div>;
  }) : <div className="empty-state"><Trophy size={32} /><h3>{lang === "bn" ? "এই সপ্তাহে কোনো অবদান নেই" : "No contributions yet this week"}</h3><p>{lang === "bn" ? "প্রথম হতে একটি লাইভ লোকেশন শেয়ার করুন।" : "Share a live location to take the first spot."}</p></div>}</div></div></div>;
}
