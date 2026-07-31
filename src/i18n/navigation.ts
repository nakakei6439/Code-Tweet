import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// ロケールを保った Link / redirect / router を提供する。
// アプリ内リンクは next/link ではなくこちらを使うこと（使わないと /en から /about へ飛んだときに
// 日本語ページへ落ちる）。
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
