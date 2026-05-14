import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/encryption";

const TEST_KEY_HEX = "00".repeat(32);
const HEX_PATTERN = /^[0-9a-f]+$/;

beforeEach(() => {
  process.env.GITHUB_PAT_ENCRYPTION_KEY = TEST_KEY_HEX;
});

afterEach(() => {
  delete process.env.GITHUB_PAT_ENCRYPTION_KEY;
});

describe("encrypt", () => {
  it("returns hex-encoded encrypted, iv, and tag fields", () => {
    const result = encrypt("ghp_exampleTokenValue");

    expect(result.encrypted).toMatch(HEX_PATTERN);
    expect(result.iv).toMatch(HEX_PATTERN);
    expect(result.tag).toMatch(HEX_PATTERN);
  });

  it("uses a 16-byte iv and 16-byte auth tag", () => {
    const { iv, tag } = encrypt("ghp_exampleTokenValue");

    expect(iv).toHaveLength(32);
    expect(tag).toHaveLength(32);
  });

  it("produces different iv and ciphertext on repeated calls (random iv)", () => {
    const a = encrypt("ghp_exampleTokenValue");
    const b = encrypt("ghp_exampleTokenValue");

    expect(a.iv).not.toBe(b.iv);
    expect(a.encrypted).not.toBe(b.encrypted);
  });

  it("throws when GITHUB_PAT_ENCRYPTION_KEY is not set", () => {
    delete process.env.GITHUB_PAT_ENCRYPTION_KEY;

    expect(() => encrypt("ghp_exampleTokenValue")).toThrow(
      "GITHUB_PAT_ENCRYPTION_KEY is not set",
    );
  });
});

describe("decrypt", () => {
  it("round-trips ASCII strings", () => {
    const plaintext = "ghp_exampleTokenValue";
    const { encrypted, iv, tag } = encrypt(plaintext);

    expect(decrypt(encrypted, iv, tag)).toBe(plaintext);
  });

  it("round-trips UTF-8 strings with Japanese and emoji", () => {
    const plaintext = "認証トークン🔐ghp_秘密の値";
    const { encrypted, iv, tag } = encrypt(plaintext);

    expect(decrypt(encrypted, iv, tag)).toBe(plaintext);
  });

  it("throws when GITHUB_PAT_ENCRYPTION_KEY is not set", () => {
    const { encrypted, iv, tag } = encrypt("ghp_exampleTokenValue");
    delete process.env.GITHUB_PAT_ENCRYPTION_KEY;

    expect(() => decrypt(encrypted, iv, tag)).toThrow(
      "GITHUB_PAT_ENCRYPTION_KEY is not set",
    );
  });

  it("throws when the auth tag has been replaced (tamper detection)", () => {
    const { encrypted, iv } = encrypt("ghp_exampleTokenValue");
    const forgedTag = "ff".repeat(16);

    expect(() => decrypt(encrypted, iv, forgedTag)).toThrow();
  });

  it("throws when the ciphertext has been modified", () => {
    const { encrypted, iv, tag } = encrypt("ghp_exampleTokenValue");
    const firstByte = encrypted.slice(0, 2);
    const flippedByte = ((parseInt(firstByte, 16) ^ 0xff) & 0xff)
      .toString(16)
      .padStart(2, "0");
    const tamperedEncrypted = flippedByte + encrypted.slice(2);

    expect(() => decrypt(tamperedEncrypted, iv, tag)).toThrow();
  });

  it("throws when the iv has been replaced", () => {
    const { encrypted, tag } = encrypt("ghp_exampleTokenValue");
    const swappedIv = "11".repeat(16);

    expect(() => decrypt(encrypted, swappedIv, tag)).toThrow();
  });
});
