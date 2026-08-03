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
        code: "readme_too_large" as const,
      params: { limit: readmeCharLimit },
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
