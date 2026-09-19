"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

export function LangToggle({ lang }: { lang: "en" | "bn" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = lang === "en" ? "bn" : "en";
    document.cookie = `jatrilive_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      className="lang-toggle"
      onClick={toggle}
      disabled={pending}
      aria-label={lang === "en" ? "Switch language to Bangla" : "Switch language to English"}
      title={lang === "en" ? "বাংলা" : "English"}
    >
      <Languages size={16} />
      <span>{lang === "en" ? "বাংলা" : "EN"}</span>
    </button>
  );
}
