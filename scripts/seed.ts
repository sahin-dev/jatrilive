import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const transports = [
  { name: "Alif Paribahan", slug: "alif-paribahan", routeName: "Mirpur 14 → Banasree", routeStops: ["Mirpur 14", "Mirpur 10", "Kazipara", "Agargaon", "Farmgate", "Karwan Bazar", "Shahbag", "Paltan", "Kamalapur", "Banasree"], color: "#ff5c35" },
  { name: "Baishakhi Paribahan", slug: "baishakhi-paribahan", routeName: "Savar → Notun Bazar", routeStops: ["Savar", "Gabtoli", "Technical", "Shyamoli", "Asad Gate", "Farmgate", "Mohakhali", "Gulshan 1", "Notun Bazar"], color: "#21765b" },
  { name: "Bihanga Paribahan", slug: "bihanga-paribahan", routeName: "Mirpur 12 → Sadarghat", routeStops: ["Mirpur 12", "Mirpur 10", "Agargaon", "Farmgate", "Shahbag", "Gulistan", "Sadarghat"], color: "#4969d1" },
  { name: "Trust Transport", slug: "trust-transport", routeName: "Mirpur 10 → Motijheel", routeStops: ["Mirpur 10", "Kazipara", "Shewrapara", "Agargaon", "Farmgate", "Bangla Motor", "Paltan", "Motijheel"], color: "#f2a734" },
  { name: "Victor Classic", slug: "victor-classic", routeName: "Sadarghat → Abdullahpur", routeStops: ["Sadarghat", "Gulistan", "Paltan", "Kakrail", "Mohakhali", "Airport", "Abdullahpur"], color: "#923f87" },
  { name: "Raida Enterprise", slug: "raida-enterprise", routeName: "Postogola → Diabari", routeStops: ["Postogola", "Jatrabari", "Kamalapur", "Moghbazar", "Mohakhali", "Airport", "Uttara", "Diabari"], color: "#1689a8" },
];

async function seed() {
  const [{ connectDB }, { Transport }] = await Promise.all([
    import("../lib/db"),
    import("../models/Transport"),
  ]);
  await connectDB();
  for (const transport of transports) {
    await Transport.findOneAndUpdate({ slug: transport.slug }, { $set: transport }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`Seeded ${transports.length} sample transports. Verify routes in the admin dashboard before production use.`);
  process.exit(0);
}

seed().catch((error) => { console.error(error); process.exit(1); });
