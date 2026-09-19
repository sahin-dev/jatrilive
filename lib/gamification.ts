export type Badge = { id: string; icon: string; title: string; description: string; earned: boolean };

export function contributionStats(dates: Array<Date | string>, trustLevel: string) {
  const dayKeys = new Set(dates.map((date) => dhakaDayKey(new Date(date))));
  let streak = 0;
  const cursor = new Date();
  while (dayKeys.has(dhakaDayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  if (streak === 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (dayKeys.has(dhakaDayKey(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }
  const total = dates.length;
  const badges: Badge[] = [
    { id: "first_update", icon: "📍", title: "First signal", description: "Shared a first live update", earned: total >= 1 },
    { id: "route_helper", icon: "🚌", title: "Route helper", description: "Shared 10 updates", earned: total >= 10 },
    { id: "city_mover", icon: "🌆", title: "City mover", description: "Shared 50 updates", earned: total >= 50 },
    { id: "week_streak", icon: "🔥", title: "7-day streak", description: "Helped seven days in a row", earned: streak >= 7 },
    { id: "trusted", icon: "✓", title: "Trusted contributor", description: "Reports are regularly corroborated", earned: trustLevel === "trusted" },
  ];
  return { streak, total, badges };
}

function dhakaDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
