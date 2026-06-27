import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";
import { evictInstallationToken, getWebhookSecret, verifyWebhookSignature } from "@/lib/githubApp";

/**
 * GitHub App の webhook 受け口。
 * アンインストール（installation.deleted）時に github_app_installations の該当行を掃除する。
 * 署名検証に失敗したリクエストは 401 で拒否する。
 */
export async function POST(request: Request): Promise<Response> {
  const secret = getWebhookSecret();
  if (!secret) {
    return Response.json({ error: "Webhook not configured." }, { status: 401 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");

  let payload: { action?: string; installation?: { id?: number } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event === "installation" && payload.action === "deleted") {
    const installationId = payload.installation?.id;
    if (typeof installationId === "number") {
      const admin = createAdminClient();
      const { error } = await admin
        .from("github_app_installations")
        .delete()
        .eq("installation_id", installationId);
      if (error) {
        logError("github-app/webhook", "installation cleanup error", error, { installationId });
      }
      evictInstallationToken(installationId);
    }
  }

  // 未対応イベントも 200 を返し、GitHub のリトライを避ける
  return Response.json({ ok: true });
}
