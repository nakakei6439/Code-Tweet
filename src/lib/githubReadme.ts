import { getProjectTextLimit } from "@/lib/generateLimits";
import type { GenerateErrorResponse } from "@/types/tweet";
import type { UsageTier } from "@/types/usage";

export const MAX_README_BYTES = 64 * 1024;

export type GitHubRepo = {
  owner: string;
  repo: string;
};

export type ReadmePayload =
  | {
      ok: true;
      content: string;
      contentLength: number;
      projectTextLimit: number;
      isOverLimit: boolean;
    }
  | {
      ok: false;
      status: 413;
      body: GenerateErrorResponse & {
        contentLength: number;
        projectTextLimit: number;
        isOverLimit: boolean;
      };
    };

export type PatKind = "classic" | "fine-grained";

/**
 * PAT が classic か fine-grained かを判定する。
 *
 * 権威的シグナルは GitHub が返す `X-OAuth-Scopes` ヘッダの「有無」:
 *   - fine-grained PAT … ヘッダ自体が存在しない（null）
 *   - classic PAT     … ヘッダが存在する（値が空でも）
 *
 * 万一ヘッダが取得できない環境のため、トークン接頭辞でも補強する
 * （`github_pat_` = fine-grained, `ghp_`/`ghs_`/`gho_` = classic 系）。
 */
export function detectPatKind(oauthScopesHeader: string | null, token: string): PatKind {
  if (oauthScopesHeader !== null) return "classic";
  if (token.startsWith("github_pat_")) return "fine-grained";
  if (/^gh[posu]_/.test(token)) return "classic";
  return "fine-grained";
}

export function parseGitHubRepoUrl(input: string): GitHubRepo | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) return null;

  const repo = rawRepo.replace(/\.git$/i, "");
  if (!repo) return null;

  return { owner, repo };
}

export function buildReadmePayload(data: { content?: string; size?: unknown }, usageTier: UsageTier): ReadmePayload {
  const readmeCharLimit = getProjectTextLimit(usageTier);
  const readmeBytes = typeof data.size === "number" ? data.size : Buffer.byteLength(data.content ?? "", "base64");

  if (readmeBytes > MAX_README_BYTES) {
    return {
      ok: false,
      status: 413,
      body: {
        error: `README が大きすぎます。現在のプランでは ${readmeCharLimit.toLocaleString("ja-JP")} 文字以内にしてください。`,
        field: "projectText",
        contentLength: readmeBytes,
        projectTextLimit: readmeCharLimit,
        isOverLimit: true,
      },
    };
  }

  const content = Buffer.from(data.content ?? "", "base64").toString("utf-8");

  return {
    ok: true,
    content,
    contentLength: content.length,
    projectTextLimit: readmeCharLimit,
    isOverLimit: content.length > readmeCharLimit,
  };
}
