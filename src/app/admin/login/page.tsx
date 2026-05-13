import type { Metadata } from "next";
import HomeLinkButton from "@/components/HomeLinkButton";
import { getMissingAdminSecurityEnv } from "@/lib/adminSecurity";
import { submitAdminLogin } from "./actions";

export const metadata: Metadata = {
  title: "管理者ログイン",
  description: "Code Tweet 管理画面のログインです。",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "ユーザー名またはパスワードが正しくありません。",
  locked: "失敗回数が上限に達したため、一時的にロックされています。",
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(readParam(params?.next) ?? "/admin");
  const error = readParam(params?.error);
  const missingEnv = getMissingAdminSecurityEnv();

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12 text-gray-200">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">管理者ログイン</h1>
          <div aria-hidden="true" />
        </div>

        {missingEnv.length > 0 ? (
          <div className="rounded-xl border border-red-900/70 bg-red-950/30 p-5 text-sm text-red-100">
            <p className="font-semibold">管理者認証の環境変数が未設定です。</p>
            <p className="mt-2 text-red-200/80">{missingEnv.join(", ")}</p>
          </div>
        ) : (
          <form action={submitAdminLogin} className="rounded-xl border border-gray-800 bg-gray-900/70 p-6">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="block text-sm font-medium text-gray-300">ユーザー名</span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-400"
              />
            </label>
            <label className="mt-6 block">
              <span className="block text-sm font-medium text-gray-300">パスワード</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-400"
              />
            </label>
            {error && ERROR_MESSAGES[error] && (
              <p className="mt-4 rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-100">
                {ERROR_MESSAGES[error]}
              </p>
            )}
            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
            >
              ログイン
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeNextPath(value: string): string {
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}
