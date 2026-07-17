import { describe, expect, it } from "vitest";
import { CREDIT_PACKS, getCreditPack } from "@/lib/creditPacks";

// Stripe の JPY 最低決済額。これ未満の unit_amount は Checkout でエラーになる。
const STRIPE_JPY_MINIMUM = 50;

describe("CREDIT_PACKS", () => {
  it("has unique pack ids", () => {
    const ids = CREDIT_PACKS.map((pack) => pack.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defines positive integer credits and amounts", () => {
    for (const pack of CREDIT_PACKS) {
      expect(Number.isInteger(pack.credits)).toBe(true);
      expect(pack.credits).toBeGreaterThan(0);
      expect(Number.isInteger(pack.amountJpy)).toBe(true);
      expect(pack.amountJpy).toBeGreaterThanOrEqual(STRIPE_JPY_MINIMUM);
    }
  });
});

describe("getCreditPack", () => {
  it("resolves a defined pack by id", () => {
    expect(getCreditPack("pack10")).toMatchObject({ credits: 10, amountJpy: 70 });
    expect(getCreditPack("pack100")).toMatchObject({ credits: 100, amountJpy: 700 });
  });

  it("returns null for unknown ids", () => {
    expect(getCreditPack("pack9999")).toBeNull();
    expect(getCreditPack("")).toBeNull();
  });
});
