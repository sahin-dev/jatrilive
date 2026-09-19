export type TrustLevel = "newcomer" | "contributor" | "trusted";

export function trustLevelFor(stats: { acceptedUpdates?: number; corroboratedUpdates?: number; flaggedReports?: number }): TrustLevel {
  const accepted = stats.acceptedUpdates || 0;
  const corroborated = stats.corroboratedUpdates || 0;
  const flags = stats.flaggedReports || 0;
  const ratio = accepted ? corroborated / accepted : 0;
  if (accepted >= 50 && ratio >= 0.6 && flags <= 1) return "trusted";
  if (accepted >= 10 && ratio >= 0.35 && flags <= 2) return "contributor";
  return "newcomer";
}

export function trustWeight(level: TrustLevel | undefined) {
  return level === "trusted" ? 1.75 : level === "contributor" ? 1.35 : 1;
}
