import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logError, logInfo, logWarn } from "@/lib/logger";

type ConsoleSpy = ReturnType<typeof vi.spyOn>;

describe("logger", () => {
  let errorSpy: ConsoleSpy;
  let warnSpy: ConsoleSpy;
  let logSpy: ConsoleSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  function lastPayload(spy: ConsoleSpy) {
    const lastCall = spy.mock.calls.at(-1);
    if (!lastCall) throw new Error("no console call recorded");
    return JSON.parse(lastCall[0] as string);
  }

  it("emits a JSON line with level, scope, message, and timestamp on error", () => {
    logError("stripe/webhook", "boom");
    const payload = lastPayload(errorSpy);
    expect(payload.level).toBe("error");
    expect(payload.scope).toBe("stripe/webhook");
    expect(payload.message).toBe("boom");
    expect(typeof payload.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
  });

  it("serializes Error instances with name, message, and stack", () => {
    const err = new TypeError("bad input");
    logError("scope", "failed", err);
    const payload = lastPayload(errorSpy);
    expect(payload.error).toMatchObject({
      name: "TypeError",
      message: "bad input",
    });
    expect(typeof payload.error.stack).toBe("string");
  });

  it("passes non-Error values through as-is", () => {
    logError("scope", "failed", { code: "PGRST116" });
    const payload = lastPayload(errorSpy);
    expect(payload.error).toEqual({ code: "PGRST116" });
  });

  it("includes context when provided and omits it when empty", () => {
    logError("scope", "with", undefined, { userId: "u_1" });
    expect(lastPayload(errorSpy).context).toEqual({ userId: "u_1" });

    logError("scope", "without");
    expect(lastPayload(errorSpy).context).toBeUndefined();
  });

  it("routes levels to the matching console method", () => {
    logWarn("scope", "warn-msg");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(lastPayload(warnSpy).level).toBe("warn");

    logInfo("scope", "info-msg");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(lastPayload(logSpy).level).toBe("info");
  });
});
