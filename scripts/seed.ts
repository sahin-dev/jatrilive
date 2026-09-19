import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

type Stop = [name: string, nameBn: string, lat: number, lng: number];
const FARE_SOURCE = "https://brta.gov.bd/pages/static-pages/6922de89933eb65569e1b600";

function transport(input: {
  name: string;
  nameBn: string;
  slug: string;
  routeName: string;
  routeNameBn: string;
  stops: Stop[];
  color: string;
}) {
  return {
    name: input.name,
    nameBn: input.nameBn,
    slug: input.slug,
    routeName: input.routeName,
    routeNameBn: input.routeNameBn,
    routeStops: input.stops.map(([name]) => name),
    routeStopsBn: input.stops.map(([, nameBn]) => nameBn),
    stopCoords: input.stops.map(([name, nameBn, lat, lng]) => ({ name, nameBn, lat, lng })),
    fareCurrency: "BDT",
    fareNote: "Fare varies by boarding and destination stop. Check the current official BRTA Dhaka Metro fare chart.",
    fareNoteBn: "ওঠা ও নামার স্টপ অনুযায়ী ভাড়া পরিবর্তিত হয়। বর্তমান বিআরটিএ ঢাকা মেট্রো ভাড়ার তালিকা দেখুন।",
    fareSourceUrl: FARE_SOURCE,
    fareVerifiedAt: new Date("2026-04-23T00:00:00+06:00"),
    color: input.color,
  };
}

const transports = [
  transport({
    name: "Alif Paribahan", nameBn: "আলিফ পরিবহন", slug: "alif-paribahan",
    routeName: "Mirpur 14 → Banasree", routeNameBn: "মিরপুর ১৪ → বনশ্রী", color: "#ff5c35",
    stops: [
      ["Mirpur 14", "মিরপুর ১৪", 23.7994, 90.3656], ["Mirpur 10", "মিরপুর ১০", 23.8069, 90.3687],
      ["Kazipara", "কাজীপাড়া", 23.7972, 90.3728], ["Agargaon", "আগারগাঁও", 23.7776, 90.3803],
      ["Farmgate", "ফার্মগেট", 23.7588, 90.3890], ["Karwan Bazar", "কারওয়ান বাজার", 23.7516, 90.3933],
      ["Shahbag", "শাহবাগ", 23.7382, 90.3950], ["Paltan", "পল্টন", 23.7369, 90.4143],
      ["Kamalapur", "কমলাপুর", 23.7316, 90.4260], ["Banasree", "বনশ্রী", 23.7637, 90.4344],
    ],
  }),
  transport({
    name: "Baishakhi Paribahan", nameBn: "বৈশাখী পরিবহন", slug: "baishakhi-paribahan",
    routeName: "Savar → Notun Bazar", routeNameBn: "সাভার → নতুন বাজার", color: "#21765b",
    stops: [
      ["Savar", "সাভার", 23.8583, 90.2667], ["Gabtoli", "গাবতলী", 23.7830, 90.3443],
      ["Technical", "টেকনিক্যাল", 23.7810, 90.3510], ["Shyamoli", "শ্যামলী", 23.7741, 90.3657],
      ["Asad Gate", "আসাদ গেট", 23.7603, 90.3720], ["Farmgate", "ফার্মগেট", 23.7588, 90.3890],
      ["Mohakhali", "মহাখালী", 23.7778, 90.3998], ["Gulshan 1", "গুলশান ১", 23.7809, 90.4161],
      ["Notun Bazar", "নতুন বাজার", 23.7976, 90.4237],
    ],
  }),
  transport({
    name: "Bihanga Paribahan", nameBn: "বিহঙ্গ পরিবহন", slug: "bihanga-paribahan",
    routeName: "Mirpur 12 → Sadarghat", routeNameBn: "মিরপুর ১২ → সদরঘাট", color: "#4969d1",
    stops: [
      ["Mirpur 12", "মিরপুর ১২", 23.8280, 90.3640], ["Mirpur 10", "মিরপুর ১০", 23.8069, 90.3687],
      ["Agargaon", "আগারগাঁও", 23.7776, 90.3803], ["Farmgate", "ফার্মগেট", 23.7588, 90.3890],
      ["Shahbag", "শাহবাগ", 23.7382, 90.3950], ["Gulistan", "গুলিস্তান", 23.7259, 90.4117],
      ["Sadarghat", "সদরঘাট", 23.7104, 90.4110],
    ],
  }),
  transport({
    name: "Trust Transport", nameBn: "ট্রাস্ট পরিবহন", slug: "trust-transport",
    routeName: "Mirpur 10 → Motijheel", routeNameBn: "মিরপুর ১০ → মতিঝিল", color: "#f2a734",
    stops: [
      ["Mirpur 10", "মিরপুর ১০", 23.8069, 90.3687], ["Kazipara", "কাজীপাড়া", 23.7972, 90.3728],
      ["Shewrapara", "শেওড়াপাড়া", 23.7902, 90.3759], ["Agargaon", "আগারগাঁও", 23.7776, 90.3803],
      ["Farmgate", "ফার্মগেট", 23.7588, 90.3890], ["Bangla Motor", "বাংলা মোটর", 23.7457, 90.3940],
      ["Paltan", "পল্টন", 23.7369, 90.4143], ["Motijheel", "মতিঝিল", 23.7330, 90.4172],
    ],
  }),
  transport({
    name: "Victor Classic", nameBn: "ভিক্টর ক্লাসিক", slug: "victor-classic",
    routeName: "Sadarghat → Abdullahpur", routeNameBn: "সদরঘাট → আব্দুল্লাহপুর", color: "#923f87",
    stops: [
      ["Sadarghat", "সদরঘাট", 23.7104, 90.4110], ["Gulistan", "গুলিস্তান", 23.7259, 90.4117],
      ["Paltan", "পল্টন", 23.7369, 90.4143], ["Kakrail", "কাকরাইল", 23.7389, 90.4083],
      ["Mohakhali", "মহাখালী", 23.7778, 90.3998], ["Airport", "বিমানবন্দর", 23.8514, 90.4081],
      ["Abdullahpur", "আব্দুল্লাহপুর", 23.8796, 90.4003],
    ],
  }),
  transport({
    name: "Raida Enterprise", nameBn: "রাইদা এন্টারপ্রাইজ", slug: "raida-enterprise",
    routeName: "Postogola → Diabari", routeNameBn: "পোস্তগোলা → দিয়াবাড়ি", color: "#1689a8",
    stops: [
      ["Postogola", "পোস্তগোলা", 23.6936, 90.4321], ["Jatrabari", "যাত্রাবাড়ী", 23.7108, 90.4346],
      ["Kamalapur", "কমলাপুর", 23.7316, 90.4260], ["Moghbazar", "মগবাজার", 23.7489, 90.4129],
      ["Mohakhali", "মহাখালী", 23.7778, 90.3998], ["Airport", "বিমানবন্দর", 23.8514, 90.4081],
      ["Uttara", "উত্তরা", 23.8759, 90.3795], ["Diabari", "দিয়াবাড়ি", 23.8805, 90.3593],
    ],
  }),
];

async function seed() {
  const [{ connectDB }, { Transport }] = await Promise.all([
    import("../lib/db"),
    import("../models/Transport"),
  ]);
  await connectDB();
  for (const item of transports) {
    await Transport.findOneAndUpdate({ slug: item.slug }, { $set: item }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`Seeded ${transports.length} sample transports with localized stops, coordinates, and official fare-source links. Verify route and fare details before production use.`);
  process.exit(0);
}

seed().catch((error) => { console.error(error); process.exit(1); });
