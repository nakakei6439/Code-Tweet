import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { toLocaleId } from "@/lib/locales";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notePage" });
  return { title: t("title"), description: t("description") };
}

export default async function NotePage({ params }: Props) {
  const { locale } = await params;
  // next/navigation の redirect だとロケール接頭辞が落ち、/en/note から日本語トップへ飛んでしまう。
  redirect({ href: "/?tab=note", locale: toLocaleId(locale) });
}
