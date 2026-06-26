import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { buildAppJwt, decodeAppPrivateKey } from "@/lib/githubApp";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

function decodeSegment(segment: string): Record<string, unknown> {
  const json = Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  return JSON.parse(json);
}

describe("buildAppJwt", () => {
  it("produces a verifiable RS256 JWT with correct claims", () => {
    const now = 1_000_000_000;
    const jwt = buildAppJwt("12345", pem, now);
    const [header, payload, signature] = jwt.split(".");

    expect(decodeSegment(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodeSegment(payload)).toEqual({ iat: now - 60, exp: now + 540, iss: "12345" });

    const verifier = createVerify("RSA-SHA256").update(`${header}.${payload}`);
    const sigBuf = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    expect(verifier.verify(publicKey, sigBuf)).toBe(true);
  });
});

describe("decodeAppPrivateKey", () => {
  it("accepts raw PEM as-is", () => {
    expect(decodeAppPrivateKey(pem)).toContain("BEGIN");
  });

  it("decodes base64-encoded PEM", () => {
    const b64 = Buffer.from(pem, "utf-8").toString("base64");
    expect(decodeAppPrivateKey(b64)).toContain("BEGIN");
  });

  it("returns null for missing or invalid input", () => {
    expect(decodeAppPrivateKey(undefined)).toBeNull();
    expect(decodeAppPrivateKey("not-a-key")).toBeNull();
  });
});
