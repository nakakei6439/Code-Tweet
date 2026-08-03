"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LIST, type LocaleId } from "@/lib/locales";

// 同じページのまま言語だけ切り替える。usePathname はロケール接頭辞を除いたパスを返すので、
// router.replace に locale を渡すだけで対応するロケールの URL に移動できる。
export default function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    startTransition(() => {
      // 動的セグメントを持つページでも同じ URL を組み立て直せるよう params をそのまま渡す。
      router.replace(
        // @ts-expect-error -- pathname は routing 定義の型と一致するが params は動的に決まる
        { pathname, params },
        { locale: next as LocaleId },
      );
    });
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        aria-label={t("label")}
        className="cursor-pointer appearance-none rounded-lg border border-gray-800 bg-gray-900 py-1.5 pl-2.5 pr-7
          text-xs text-gray-300 transition-colors hover:text-white focus:outline-none focus:ring-1
          focus:ring-cyan-500 disabled:opacity-60"
      >
        {LOCALE_LIST.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nativeName}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 h-3 w-3 text-gray-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
