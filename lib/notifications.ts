import { Notification } from "@/models/Notification";
import { sendPushToUser } from "@/lib/push";

export async function createUserNotification(input: {
  userId: unknown;
  transportId: unknown;
  title: string;
  message: string;
  kind?: "stale" | "stop_alert" | "impact" | "system";
  url?: string;
}) {
  const notification = await Notification.create({
    ...input,
    url: input.url || "/dashboard",
    kind: input.kind || "system",
  });
  await sendPushToUser(input.userId, { title: input.title, body: input.message, url: input.url || "/dashboard" }).catch((error) => {
    console.error("Push delivery failed", error);
    return 0;
  });
  return notification;
}
