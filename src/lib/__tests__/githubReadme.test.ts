import { describe, expect, it } from "vitest";
import { MAX_README_BYTES, buildReadmePayload, parseGitHubRepoUrl } from "@/lib/githubReadme";

function base64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

describe("parseGitHubRepoUrl", () => {
  it("parses GitHub repository URLs", () => {
    expect(parseGitHubRepoUrl("https://github.com/owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseGitHubRepoUrl("https://www.github.com/owner/repo.git")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseGitHubRepoUrl("http://github.com/owner/repo/tree/main")).toEqual({ owner: "owner", repo: "repo" });
  });

  it("rejects invalid or non-GitHub URLs", () => {
    expect(parseGitHubRepoUrl("not a url")).toBeNull();
    expect(parseGitHubRepoUrl("https://example.com/owner/repo")).toBeNull();
    expect(parseGitHubRepoUrl("https://github.com/owner")).toBeNull();
    expect(parseGitHubRepoUrl("ftp://github.com/owner/repo")).toBeNull();
  });
});

describe("buildReadmePayload", () => {
  it("returns over-limit metadata without rejecting normal decoded content", () => {
    const content = "a".repeat(1_001);
    const result = buildReadmePayload({ content: base64(content), size: 1_001 }, "free");

    expect(result).toMatchObject({
      ok: true,
      content,
      contentLength: 1_001,
      projectTextLimit: 1_000,
      isOverLimit: true,
    });
  });

  it("rejects extremely large README payloads before decoding", () => {
    const result = buildReadmePayload({ content: base64("small"), size: MAX_README_BYTES + 1 }, "paid");

    expect(result).toMatchObject({
      ok: false,
      status: 413,
      body: {
        field: "projectText",
        contentLength: MAX_README_BYTES + 1,
        projectTextLimit: 10_000,
        isOverLimit: true,
      },
    });
  });
});
