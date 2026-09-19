import webpush from "web-push";
import { PushSubscription } from "@/models/PushSubscription";

let configured = false;

function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@jatrilive.local", publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushToUser(userId: unknown, payload: { title: string; body: string; url?: string }) {
  if (!configure()) return 0;
  const subscriptions = await PushSubscription.find({ userId }).lean();
  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      }, JSON.stringify(payload));
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await PushSubscription.deleteOne({ _id: subscription._id });
    }
  }));
  return sent;
}
