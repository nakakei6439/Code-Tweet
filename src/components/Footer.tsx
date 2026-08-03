import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-gray-900 bg-gray-950 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("disclaimer")}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms" className="hover:text-gray-300 transition-colors">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">
            {t("privacy")}
          </Link>
          <Link href="/contact" className="hover:text-gray-300 transition-colors">
            {t("contact")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
