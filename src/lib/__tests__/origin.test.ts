import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "@/lib/origin";

function buildRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("isSameOriginRequest", () => {
  it("returns true when origin header matches the request origin", () => {
    const request = buildRequest("https://example.com/api/generate", {
      origin: "https://example.com",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("returns false when origin header points to a different host", () => {
    const request = buildRequest("https://example.com/api/generate", {
      origin: "https://evil.example",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("returns false when origin scheme differs (http vs https)", () => {
    const request = buildRequest("https://example.com/api/generate", {
      origin: "http://example.com",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("falls back to referer when origin header is absent", () => {
    const request = buildRequest("https://example.com/api/generate", {
      referer: "https://example.com/dashboard",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("returns false when referer points to a different origin", () => {
    const request = buildRequest("https://example.com/api/generate", {
      referer: "https://attacker.test/phish",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("returns false when neither origin nor referer is present", () => {
    const request = buildRequest("https://example.com/api/generate");

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("returns false when referer is malformed", () => {
    const request = buildRequest("https://example.com/api/generate", {
      referer: "not-a-url",
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("matches localhost development origins", () => {
    const request = buildRequest("http://localhost:3000/api/generate", {
      origin: "http://localhost:3000",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });
});
