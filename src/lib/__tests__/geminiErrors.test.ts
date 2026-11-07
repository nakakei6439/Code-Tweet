import { describe, expect, it } from "vitest";
import { GeminiTimeoutError, mapGeminiError } from "@/lib/geminiErrors";

describe("mapGeminiError — タイムアウト", () => {
  it("予算切れ・打ち切りは混雑扱い(gemini_busy)にする", () => {
    expect(mapGeminiError("test", new GeminiTimeoutError())).toEqual({ code: "gemini_busy", status: 503 });
  });
});
