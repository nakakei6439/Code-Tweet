import { createHmac, createSign, timingSafeEqual } from "node:crypto";

/**
 * GitHub App 連携のサーバー専用ユーティリティ。
 *
 * 設計方針: 利用者ごとのアクセストークンは保存しない。
 * App の秘密鍵（環境変数）から短命（約1時間）の installation access token を
 * 必要時に発行し、使い終わったら捨てる。DB に残すのは installation_id（番号）のみ。
 *
 * 新規 npm 依存を増やさないため、JWT 署名は node:crypto で行う。
 */

export type GithubAppConfig = {
  appId: string;
  slug: string;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * 環境変数から App の秘密鍵（PEM）を取り出す。
 * 改行を含む PEM をそのまま、または base64 でエンコードした文字列のどちらでも受け付ける。
 */
export function decodeAppPrivateKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value.includes("BEGIN")) return value.replace(/\\n/g, "\n");
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    return decoded.includes("BEGIN") ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * App 認証用の JWT（RS256）を生成する純粋関数。
 * GitHub の仕様上、有効期間は最大10分。時計ずれ対策で iat を 60 秒戻す。
 */
export function buildAppJwt(appId: string, privateKeyPem: string, nowSec: number = Math.floor(Date.now() / 1000)): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iat: nowSec - 60,
      exp: nowSec + 540, // 9分（10分上限内）
      iss: appId,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKeyPem);
  return `${signingInput}.${base64url(signature)}`;
}

export function getGithubAppConfig(): GithubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const slug = process.env.GITHUB_APP_SLUG?.trim();
  if (!appId || !slug) return null;
  return { appId, slug };
}

export function isGithubAppConfigured(): boolean {
  return getGithubAppConfig() !== null && decodeAppPrivateKey(process.env.GITHUB_APP_PRIVATE_KEY) !== null;
}

type CachedToken = { token: string; expiresAtMs: number };
const tokenCache = new Map<number, CachedToken>();
// 失効の手前で再発行するためのマージン
const EXPIRY_MARGIN_MS = 60 * 1000;

/**
 * installation_id から短命の installation access token を発行する。
 * プロセス内メモリに失効前までキャッシュして再利用する（ベストエフォート）。
 * 設定不備や GitHub エラー時は null を返す。
 */
export async function getInstallationToken(installationId: number): Promise<string | null> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAtMs - EXPIRY_MARGIN_MS > Date.now()) {
    return cached.token;
  }

  const config = getGithubAppConfig();
  const privateKey = decodeAppPrivateKey(process.env.GITHUB_APP_PRIVATE_KEY);
  if (!config || !privateKey) return null;

  let jwt: string;
  try {
    jwt = buildAppJwt(config.appId, privateKey);
  } catch {
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = (await res.json()) as { token?: string; expires_at?: string };
  if (!data.token) return null;

  const expiresAtMs = data.expires_at ? Date.parse(data.expires_at) : Date.now() + 50 * 60 * 1000;
  tokenCache.set(installationId, { token: data.token, expiresAtMs });
  return data.token;
}

/** インストール開始 URL を組み立てる。 */
export function buildInstallUrl(slug: string, state: string): string {
  const params = new URLSearchParams({ state });
  return `https://github.com/apps/${slug}/installations/new?${params.toString()}`;
}

/** アンインストール時などにキャッシュ済みトークンを破棄する。 */
export function evictInstallationToken(installationId: number): void {
  tokenCache.delete(installationId);
}

export function getWebhookSecret(): string | null {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET?.trim();
  return secret ? secret : null;
}

/**
 * GitHub webhook の署名（X-Hub-Signature-256: "sha256=..."）を HMAC-SHA256 で検証する。
 * タイミング攻撃対策に timingSafeEqual を使い、長さ不一致や形式不正は false を返す。
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
