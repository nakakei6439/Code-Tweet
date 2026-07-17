import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_TOTAL_LIMIT,
  USER_FREE_MONTHLY_LIMIT,
  USER_PAID_MONTHLY_LIMIT,
  checkGuestLimit,
  checkUserLimit,
  getClientIp,
  getMonthWindowStart,
  hashIp,
} from "@/lib/rateLimit";

const createAdminClientMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createAdminClientMock(),
}));

type CountResult = { count: number | null; error: unknown };

function supabaseCount(result: CountResult) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(async () => result),
        })),
      })),
    })),
  };
}

function adminCount(result: CountResult) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => result),
      })),
    })),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("rate limit constants", () => {
  it("keeps the current tier limits explicit", () => {
    expect(GUEST_TOTAL_LIMIT).toBe(3);
    expect(USER_FREE_MONTHLY_LIMIT).toBe(3);
    expect(USER_PAID_MONTHLY_LIMIT).toBe(30);
  });
});

describe("getMonthWindowStart", () => {
  it("returns the current UTC month start", () => {
    vi.setSystemTime(new Date("2026-05-14T12:34:56.000Z"));

    expect(getMonthWindowStart()).toBe("2026-05-01T00:00:00.000Z");
  });
});

describe("getClientIp", () => {
  it("uses the first x-forwarded-for value", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 203.0.113.2", "x-real-ip": "198.51.100.1" },
    });

    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.1" },
    });

    expect(getClientIp(request)).toBe("198.51.100.1");
  });
});

describe("hashIp", () => {
  it("hashes IP addresses with SHA-256", () => {
    expect(hashIp("203.0.113.1")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashIp("203.0.113.1")).toBe(hashIp("203.0.113.1"));
  });
});

describe("checkUserLimit", () => {
  it("allows free users below the monthly limit without consuming credits", async () => {
    const result = await checkUserLimit(
      supabaseCount({ count: USER_FREE_MONTHLY_LIMIT - 1, error: null }) as never,
      "user-1",
      { quotaTier: "free", creditBalance: 0 },
    );

    expect(result).toEqual({ ok: true, useCredit: false });
  });

  it("returns the free limit error at the monthly limit with no credits", async () => {
    const result = await checkUserLimit(
      supabaseCount({ count: USER_FREE_MONTHLY_LIMIT, error: null }) as never,
      "user-1",
      { quotaTier: "free", creditBalance: 0 },
    );

    expect(result).toMatchObject({ ok: false, status: 429, code: "free_limit" });
  });

  it("consumes a credit when the monthly limit is exhausted but credits remain", async () => {
    const result = await checkUserLimit(
      supabaseCount({ count: USER_FREE_MONTHLY_LIMIT, error: null }) as never,
      "user-1",
      { quotaTier: "free", creditBalance: 5 },
    );

    expect(result).toEqual({ ok: true, useCredit: true });
  });

  it("does not consume credits while the monthly quota remains even if credits exist", async () => {
    const result = await checkUserLimit(
      supabaseCount({ count: 0, error: null }) as never,
      "user-1",
      { quotaTier: "free", creditBalance: 5 },
    );

    expect(result).toEqual({ ok: true, useCredit: false });
  });

  it("returns the paid limit error at the monthly limit with no credits", async () => {
    const result = await checkUserLimit(
      supabaseCount({ count: USER_PAID_MONTHLY_LIMIT, error: null }) as never,
      "user-1",
      { quotaTier: "paid", creditBalance: 0 },
    );

    expect(result).toMatchObject({ ok: false, status: 429, code: "paid_limit" });
  });

  it("lets paid users continue with credits past the monthly limit", async () => {
    const result = await checkUserLimit(
      supabaseCount({ count: USER_PAID_MONTHLY_LIMIT, error: null }) as never,
      "user-1",
      { quotaTier: "paid", creditBalance: 1 },
    );

    expect(result).toEqual({ ok: true, useCredit: true });
  });
});

describe("checkGuestLimit", () => {
  it("allows guests below the total limit", async () => {
    createAdminClientMock.mockReturnValue(adminCount({ count: GUEST_TOTAL_LIMIT - 1, error: null }));

    await expect(checkGuestLimit("hash")).resolves.toEqual({ ok: true, useCredit: false });
  });

  it("returns the guest limit error at the total limit", async () => {
    createAdminClientMock.mockReturnValue(adminCount({ count: GUEST_TOTAL_LIMIT, error: null }));

    await expect(checkGuestLimit("hash")).resolves.toMatchObject({ ok: false, status: 429, code: "guest_limit" });
  });
});
