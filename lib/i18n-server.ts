import { cookies } from "next/headers";
import { getDict, normalizeLang, LANG_COOKIE, type Lang } from "@/lib/i18n";

/** Server-only language read (server components, route handlers). */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}

export { getDict };
