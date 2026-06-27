import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { redirectIfNotVerifiedAdmin } from "@/lib/adminServerAuth";
import { getMonthWindowStart } from "@/lib/rateLimit";
import type { SubscriptionTier } from "@/lib/subscription";
import AuthOverlay from "@/components/AuthOverlay";
import HomeLinkButton from "@/components/HomeLinkButton";
import AdminConfirmActionForm from "@/components/AdminConfirmActionForm";
import { resetGuestUsage, resetUserUsage, setUserTier } from "./actions";

export const metadata: Metadata = {
  title: "管理",
  description: "Code Tweet の利用状況を確認する管理者向け画面です。",
};

type DayRow = {
  date: string;
  user: number;
  guest: number;
  total: number;
};

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getRecentDayKeys(days: number): string[] {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(utcToday);
    day.setUTCDate(utcToday.getUTCDate() - (days - 1 - index));
    return formatDayKey(day);
  });
}

function getRecentWindowStart(days: number): string {
  const firstDay = getRecentDayKeys(days)[0];
  return `${firstDay}T00:00:00.000Z`;
}

function countRowsByDay(rows: { generated_at: string | null }[], dayKeys: string[]): Map<string, number> {
  const counts = new Map(dayKeys.map((day) => [day, 0]));
  for (const row of rows) {
    if (!row.generated_at) continue;
    const day = row.generated_at.slice(0, 10);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

async function countAllRows(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  idColumn: string = "id",
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select(idColumn, { count: "exact", head: true });
  if (error) {
    console.error(`[admin] ${table} count error:`, error);
    return 0;
  }
  return count ?? 0;
}

async function getUserGenerationCounts(
  admin: ReturnType<typeof createAdminClient>,
  since: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const { data, error } = await admin
    .from("usage_logs")
    .select("user_id")
    .gte("generated_at", since)
    .range(0, 9999);

  if (error) {
    console.error("[admin] usage_logs per-user count error:", error);
    return counts;
  }

  for (const row of (data ?? []) as { user_id: string | null }[]) {
    if (!row.user_id) continue;
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

async function countRowsSince(
  admin: ReturnType<typeof createAdminClient>,
  table: "usage_logs" | "ip_usage_logs",
  since: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("generated_at", since);

  if (error) {
    console.error(`[admin] ${table} count error:`, error);
    return 0;
  }

  return count ?? 0;
}

async function countPaidUsers(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count, error } = await admin
    .from("subscriptions")
    .select("user_id", { count: "exact", head: true })
    .eq("tier", "paid");

  if (error) {
    console.error("[admin] subscriptions count error:", error);
    return 0;
  }

  return count ?? 0;
}

async function fetchTierMap(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, SubscriptionTier>> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id, tier");

  if (error) {
    console.error("[admin] subscriptions fetch error:", error);
    return new Map();
  }

  const map = new Map<string, SubscriptionTier>();
  for (const row of (data ?? []) as { user_id: string; tier: string | null }[]) {
    map.set(row.user_id, row.tier === "paid" ? "paid" : "free");
  }
  return map;
}

async function getGeneratedRowsSince(
  admin: ReturnType<typeof createAdminClient>,
  table: "usage_logs" | "ip_usage_logs",
  since: string,
): Promise<{ generated_at: string | null }[]> {
  const { data, error } = await admin
    .from(table)
    .select("generated_at")
    .gte("generated_at", since)
    .order("generated_at", { ascending: true })
    .range(0, 9999);

  if (error) {
    console.error(`[admin] ${table} daily fetch error:`, error);
    return [];
  }

  return (data ?? []) as { generated_at: string | null }[];
}

function StatCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value.toLocaleString("ja-JP")}</p>
      <p className="mt-2 text-xs leading-5 text-gray-400">{note}</p>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <HomeLinkButton className="justify-self-start" />
          <h1 className="text-center text-2xl font-bold text-white">管理</h1>
          <div aria-hidden="true" />
        </div>
        <p className="mb-6 text-sm text-gray-400">
          管理画面を表示するにはログインしてください。
        </p>
        <AuthOverlay />
      </main>
    );
  }

  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

  await redirectIfNotVerifiedAdmin("/admin");

  const admin = createAdminClient();
  const monthStart = getMonthWindowStart();
  const dayKeys = getRecentDayKeys(7);
  const recentStart = getRecentWindowStart(7);

  const [
    usersResult,
    monthlyUserGenerations,
    monthlyGuestGenerations,
    paidUsers,
    connectedUsers,
    recentUserRows,
    recentGuestRows,
    tierMap,
    userGenCounts,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    countRowsSince(admin, "usage_logs", monthStart),
    countRowsSince(admin, "ip_usage_logs", monthStart),
    countPaidUsers(admin),
    countAllRows(admin, "github_app_installations", "user_id"),
    getGeneratedRowsSince(admin, "usage_logs", recentStart),
    getGeneratedRowsSince(admin, "ip_usage_logs", recentStart),
    fetchTierMap(admin),
    getUserGenerationCounts(admin, monthStart),
  ]);

  if (usersResult.error) {
    console.error("[admin] listUsers error:", usersResult.error);
  }

  const userDayCounts = countRowsByDay(recentUserRows, dayKeys);
  const guestDayCounts = countRowsByDay(recentGuestRows, dayKeys);
  const dailyRows: DayRow[] = dayKeys.map((date) => {
    const userCount = userDayCounts.get(date) ?? 0;
    const guestCount = guestDayCounts.get(date) ?? 0;
    return {
      date,
      user: userCount,
      guest: guestCount,
      total: userCount + guestCount,
    };
  });

  const totalUsers = "total" in usersResult.data
    ? usersResult.data.total ?? usersResult.data.users.length
    : usersResult.data.users.length;
  const monthlyTotal = monthlyUserGenerations + monthlyGuestGenerations;

  const userRows = [...usersResult.data.users]
    .sort((a, b) => {
      const aDate = a.created_at ?? "";
      const bDate = b.created_at ?? "";
      return bDate.localeCompare(aDate);
    })
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(no email)",
      createdAt: u.created_at ?? null,
      tier: tierMap.get(u.id) ?? "free",
      genCount: userGenCounts.get(u.id) ?? 0,
    }));

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12 text-gray-200">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              管理ダッシュボード
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Code Tweet の利用状況確認、プラン変更、ゲストテスト回数のリセットを行う管理者向け画面です。
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/70 px-4 py-3 text-xs text-gray-400">
            管理者: <span className="text-gray-200">{user.email}</span>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="登録ユーザー" value={totalUsers} note="Supabase Auth のユーザー数" />
          <StatCard label="今月の生成" value={monthlyTotal} note="ログイン + ゲストの合計" />
          <StatCard label="ログイン生成" value={monthlyUserGenerations} note="今月の usage_logs" />
          <StatCard label="ゲスト生成" value={monthlyGuestGenerations} note="今月の ip_usage_logs" />
          <StatCard label="Pro / 連携" value={paidUsers} note={`GitHub連携 ${connectedUsers.toLocaleString("ja-JP")} 件`} />
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
          <div className="border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">直近7日の生成数</h2>
            <p className="mt-1 text-xs text-gray-500">
              UTC 日付で集計しています。
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-gray-800 text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">日付</th>
                  <th className="px-5 py-3 font-medium">ログインユーザー</th>
                  <th className="px-5 py-3 font-medium">ゲスト</th>
                  <th className="px-5 py-3 font-medium">合計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {dailyRows.map((row) => (
                  <tr key={row.date}>
                    <td className="px-5 py-3 text-gray-300">{row.date}</td>
                    <td className="px-5 py-3 text-gray-300">{row.user.toLocaleString("ja-JP")}</td>
                    <td className="px-5 py-3 text-gray-300">{row.guest.toLocaleString("ja-JP")}</td>
                    <td className="px-5 py-3 font-semibold text-white">{row.total.toLocaleString("ja-JP")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
          <div className="flex flex-col gap-4 border-b border-gray-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">ユーザー一覧 / プラン変更</h2>
              <p className="mt-1 text-xs text-gray-500">
                新しい順に表示。ボタンを押すとそのユーザーのプランを切り替えます。
              </p>
            </div>
            <AdminConfirmActionForm
              action={resetGuestUsage}
              buttonLabel="ゲストテスト回数を0にする"
              confirmMessage="全ゲストの利用履歴を削除し、ゲストテスト回数を0にします。この操作は元に戻せません。実行しますか？"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-gray-800 text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">メール</th>
                  <th className="px-5 py-3 font-medium">登録日</th>
                  <th className="px-5 py-3 font-medium">現在のプラン</th>
                  <th className="px-5 py-3 font-medium">今月の生成</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {userRows.map((row) => {
                  const isPaid = row.tier === "paid";
                  const nextTier: SubscriptionTier = isPaid ? "free" : "paid";
                  const nextLabel = isPaid ? "Free に戻す" : "Pro に変更";
                  const buttonClass = isPaid
                    ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                    : "border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20";
                  const isSelf = row.id === user.id;
                  return (
                    <tr key={row.id}>
                      <td className="px-5 py-3 text-gray-300">
                        <span className="break-all">{row.email}</span>
                        {isSelf && (
                          <span className="ml-2 inline-flex rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
                            自分
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {row.createdAt ? row.createdAt.slice(0, 10) : "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isPaid
                              ? "bg-fuchsia-500/20 text-fuchsia-200"
                              : "bg-gray-800 text-gray-300"
                          }`}
                        >
                          {isPaid ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-white">
                        {row.genCount.toLocaleString("ja-JP")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={setUserTier}>
                            <input type="hidden" name="userId" value={row.id} />
                            <input type="hidden" name="tier" value={nextTier} />
                            <button
                              type="submit"
                              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${buttonClass}`}
                            >
                              {nextLabel}
                            </button>
                          </form>
                          <AdminConfirmActionForm
                            action={resetUserUsage}
                            buttonLabel="回数リセット"
                            hiddenFields={{ userId: row.id }}
                            buttonClassName="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                            confirmMessage="このユーザーの生成履歴を削除し、利用回数を0にします。実行しますか？"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {userRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-xs text-gray-500">
                      ユーザーがいません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-xs leading-6 text-gray-500">
          `ADMIN_EMAILS` に含まれるメールアドレスでログインした場合のみ表示されます。
        </p>
      </div>
    </main>
  );
}
