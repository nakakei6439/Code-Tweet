// 2026-09-07 スプリント 06 attempt 2: 書き出し時の React commit/paint と
// html-to-image キャプチャのレースを塞ぐ verifyOffscreenReady / commitAndVerifyOffscreen の
// 単体テスト。テスト環境は "node"（DOM なし）なので、HTMLElement を素朴なモックで
// 表現し、属性読み出し + getBoundingClientRect を直接評価する。
//
// 検証する性質:
//   - 同期的に一致していたら即 true（リトライ不要）
//   - 一致しなければリトライ上限（OFFSCREEN_VERIFY_MAX_ATTEMPTS）回まで繰り返す
//   - 上限到達で false
//   - 途中で属性が変わったらtrueを返す（= React commitを反映できる）
//   - ルート要素が null の間もリトライを続け、出現したら評価する

import { describe, expect, it, vi } from "vitest";
import {
  OFFSCREEN_VERIFY_MAX_ATTEMPTS,
  verifyOffscreenReady,
  type OffscreenExpectation,
} from "@/lib/appss/exporter";

type FakeElement = {
  attrs: Record<string, string>;
  rectWidth: number;
  rectHeight: number;
  getAttribute(name: string): string | null;
  getBoundingClientRect(): { width: number; height: number };
};

function makeFakeElement(
  attrs: Record<string, string>,
  rectWidth: number,
  rectHeight: number,
): FakeElement {
  return {
    attrs,
    rectWidth,
    rectHeight,
    getAttribute(name: string): string | null {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    getBoundingClientRect(): { width: number; height: number } {
      return { width: this.rectWidth, height: this.rectHeight };
    },
  };
}

// verifyOffscreenReady は「getBoundingClientRect が HTMLElement を要求する」点だけが
// DOM 依存。getBoundingClientRect / getAttribute さえ備えていれば十分なので、
// FakeElement を HTMLElement としてキャストして渡す。
function asElement(fake: FakeElement): HTMLElement {
  return fake as unknown as HTMLElement;
}

describe("verifyOffscreenReady — スプリント 06 attempt 2 レース対策", () => {
  const expectation: OffscreenExpectation = { slideId: "s0", width: 2064, height: 2752 };

  it("属性と寸法が一致しているとき即 true を返す", async () => {
    const fake = makeFakeElement(
      { "data-export-slide-id": "s0", "data-export-w": "2064", "data-export-h": "2752" },
      2064,
      2752,
    );
    const result = await verifyOffscreenReady(expectation, () => asElement(fake));
    expect(result).toBe(true);
  });

  it("属性が一致しないままリトライ上限に達したら false を返す", async () => {
    // 1 回目からずっと "s1" のまま、commit が間に合わない状況を模す。
    const fake = makeFakeElement(
      { "data-export-slide-id": "s1", "data-export-w": "1488", "data-export-h": "2266" },
      1488,
      2266,
    );
    const start = Date.now();
    const result = await verifyOffscreenReady(expectation, () => asElement(fake));
    expect(result).toBe(false);
    // 30 回 × 16ms ≒ 480ms 程度。テストのフレーキーさを抑えるため大雑把に確認。
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(OFFSCREEN_VERIFY_MAX_ATTEMPTS * 10);
  });

  it("途中で属性がコミット後の値に切り替わったら true を返す（race 救済）", async () => {
    // 5 回試行した時点で React がコミット完了 → それ以降は期待値と一致するシナリオ。
    let calls = 0;
    const getter = vi.fn(() => {
      calls += 1;
      if (calls < 5) {
        return asElement(
          makeFakeElement(
            { "data-export-slide-id": "s_prev", "data-export-w": "1320", "data-export-h": "2868" },
            1320,
            2868,
          ),
        );
      }
      return asElement(
        makeFakeElement(
          { "data-export-slide-id": "s0", "data-export-w": "2064", "data-export-h": "2752" },
          2064,
          2752,
        ),
      );
    });
    const result = await verifyOffscreenReady(expectation, getter);
    expect(result).toBe(true);
    expect(getter).toHaveBeenCalled();
  });

  it("ルート要素が最初は null でも、出現後に一致したら true を返す", async () => {
    let calls = 0;
    const getter = vi.fn(() => {
      calls += 1;
      if (calls < 3) return null;
      return asElement(
        makeFakeElement(
          { "data-export-slide-id": "s0", "data-export-w": "2064", "data-export-h": "2752" },
          2064,
          2752,
        ),
      );
    });
    const result = await verifyOffscreenReady(expectation, getter);
    expect(result).toBe(true);
  });

  it("寸法だけが一致しない（属性は正しい）ケースでも false を返す", async () => {
    // getBoundingClientRect が古い寸法のまま（= レイアウト計算遅延）のシミュレーション。
    const fake = makeFakeElement(
      { "data-export-slide-id": "s0", "data-export-w": "2064", "data-export-h": "2752" },
      1320,
      2868,
    );
    const result = await verifyOffscreenReady(expectation, () => asElement(fake));
    expect(result).toBe(false);
  });
});
