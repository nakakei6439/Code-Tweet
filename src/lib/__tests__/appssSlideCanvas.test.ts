import { describe, expect, it } from "vitest";
import { getElementTransform } from "@/components/appss/SlideCanvas";
import type { AppSSSlide } from "@/lib/appss/types";
import {
  IPAD_EXPORT_SIZE,
  IPAD_EXPORT_SIZE_11,
  IPAD_EXPORT_SIZES,
  canvasFor,
  phoneW,
  phoneWSmall,
} from "@/lib/appss/constants";

function makeSlide(overrides: Partial<AppSSSlide> = {}): AppSSSlide {
  return {
    id: "s1",
    layout: "collage-duo",
    label: "label",
    headline: "headline",
    screenshotRef: "idb:a",
    screenshotSecondaryRef: "idb:b",
    ...overrides,
  };
}

describe("getElementTransform — collage-duo の既定回転", () => {
  it("保存済み transform が無ければレイアウトの既定回転・重なり順を返す", () => {
    const slide = makeSlide();
    const device = getElementTransform(slide, "device");
    const secondary = getElementTransform(slide, "deviceSecondary");
    expect(device?.rotation).toBe(9);
    expect(device?.zIndex).toBe(3);
    expect(secondary?.rotation).toBe(-10);
    expect(secondary?.zIndex).toBe(2);
  });

  it("ユーザーが個別に回転を保存していれば、そちらを優先する", () => {
    const slide = makeSlide({
      transforms: {
        device: { x: 0, y: 0, width: 100, height: 200, rotation: 45, zIndex: 9 },
      },
    });
    const device = getElementTransform(slide, "device");
    expect(device?.rotation).toBe(45);
    expect(device?.zIndex).toBe(9);
  });

  it("位置だけ保存されていて回転が保存されていない場合は、レイアウト既定の回転を維持する", () => {
    const slide = makeSlide({
      transforms: {
        // ユーザーがドラッグで位置だけ動かした想定（rotation は未保存）
        device: { x: 123, y: 456, width: 100, height: 200 },
      },
    });
    const device = getElementTransform(slide, "device");
    expect(device?.x).toBe(123);
    expect(device?.y).toBe(456);
    expect(device?.rotation).toBe(9);
  });

  it("既存レイアウト（two-devices）は回転の既定値を持たず 0 のまま", () => {
    const slide = makeSlide({ layout: "two-devices" });
    const device = getElementTransform(slide, "device");
    expect(device?.rotation).toBe(0);
  });
});

describe("getElementTransform — collage-trio の既定回転・重なり順", () => {
  it("中央は正立・最前面、左右は反対向きに傾いて背面に配置される", () => {
    const slide = makeSlide({
      layout: "collage-trio",
      screenshotSecondaryRef: "idb:b",
      screenshotTertiaryRef: "idb:c",
    });
    const device = getElementTransform(slide, "device");
    const secondary = getElementTransform(slide, "deviceSecondary");
    const tertiary = getElementTransform(slide, "deviceTertiary");
    expect(device?.rotation ?? 0).toBe(0);
    expect(device?.zIndex).toBe(3);
    expect(secondary?.rotation).toBe(-14);
    expect(secondary?.zIndex).toBe(1);
    expect(tertiary?.rotation).toBe(14);
    expect(tertiary?.zIndex).toBe(2);
  });

  it("2枚合成レイアウト（collage-duo）には deviceTertiary が存在しない", () => {
    const slide = makeSlide({ layout: "collage-duo" });
    expect(getElementTransform(slide, "deviceTertiary")).toBeUndefined();
  });
});

describe("iPad 出力サイズ（スプリント 03）", () => {
  it("IPAD_EXPORT_SIZE は App Store Connect 必須サイズの 2064×2752", () => {
    // 受け入れ条件: iPad 書き出し zip 内の PNG がすべて 2064×2752px である。
    expect(IPAD_EXPORT_SIZE).toEqual({ w: 2064, h: 2752 });
  });

  it("canvasFor('ipad') は IPAD_EXPORT_SIZE と一致する", () => {
    // AppSSEditor.exportAll で IPAD_EXPORT_SIZE と canvasFor(deviceKind) を組み合わせて
    // キャプチャに渡すので、両者が一致することは書き出し結果の 1:1 スケール保証の要。
    expect(canvasFor("ipad")).toEqual(IPAD_EXPORT_SIZE);
  });
});

describe("iPad 11インチ書き出し（スプリント 06）", () => {
  it("IPAD_EXPORT_SIZE_11 は 1488×2266（iPad Pro 11インチ基準）", () => {
    // 受け入れ条件: 11 インチ PNG の実測サイズが 1488×2266 である。
    expect(IPAD_EXPORT_SIZE_11).toEqual({ w: 1488, h: 2266 });
  });

  it("IPAD_EXPORT_SIZES は 13 インチ + 11 インチの 2 サイズを返す", () => {
    // 受け入れ条件: iPad 選択 → 書き出しで zip に 13 インチと 11 インチの 2 フォルダが入る。
    expect(IPAD_EXPORT_SIZES).toEqual([
      IPAD_EXPORT_SIZE,
      IPAD_EXPORT_SIZE_11,
    ]);
  });

  it("11 インチ比率（≈ 0.657）で hero の device 既定 rect をリフローして 1488×2266 内に収める", () => {
    // 受け入れ条件: 11 インチの 7 レイアウトすべてで要素がキャンバス内に収まる。
    // 13 インチと同じ式を 11 インチ比率で通すことで、単純引き伸ばし（13 インチを
    // 1488×2266 枠に押し込む歪んだ出力）にはならず、aspect 比 1488/2266 ≈ 0.657 で
    // 改めて rect が計算されることを検証する。
    const slide = makeSlide({ layout: "hero" });
    const c = IPAD_EXPORT_SIZE_11; // 1488×2266
    const rect = getElementTransform(slide, "device", "ipad", { canvas: c });
    expect(rect).toBeDefined();
    if (!rect) return;
    // 11 インチ比率での描画になっている（13 インチの cW=2064 と混ざっていない）
    expect(rect.x + rect.width).toBeLessThanOrEqual(c.w + 1);
    // device.y が極端に大きすぎないこと（13 インチ基準の 2752 倍の高さ定数になっていない）
    expect(rect.y).toBeLessThan(c.h);
    // 幅の比率: device 既定 rect は cW * 0.72 付近になるはず（phoneW(0.84, "ipad")=0.72 一定）
    // 13 インチ (cW=2064) なら deviceW ≈ 1486、11 インチ (cW=1488) なら deviceW ≈ 1071。
    // ここが 13 インチ基準のままになっていれば ≈ 1486 になり、11 インチ比率で計算されていれば
    // ≈ 1071 になる。これで見分けがつく。
    const deviceW13 = getElementTransform(slide, "device", "ipad")?.width ?? 0;
    expect(rect.width).toBeLessThan(deviceW13 - 200);
    expect(rect.width).toBeGreaterThan(deviceW13 - 600);
  });

  it("11 インチ書き出し時も collage-duo の回転既定値（±回転・zIndex）を維持する", () => {
    // 受け入れ条件: 11 インチの 7 レイアウトすべてで要素がキャンバス内に収まる（破綻しない）。
    // 回転・重なり順は 13 インチと同一のレイアウト既定値をそのまま引き継ぐ（専用調整は無し）。
    const slide = makeSlide();
    const device = getElementTransform(slide, "device", "ipad", { canvas: IPAD_EXPORT_SIZE_11 });
    const secondary = getElementTransform(slide, "deviceSecondary", "ipad", { canvas: IPAD_EXPORT_SIZE_11 });
    expect(device?.rotation).toBe(9);
    expect(device?.zIndex).toBe(3);
    expect(secondary?.rotation).toBe(-10);
    expect(secondary?.zIndex).toBe(2);
  });
});

describe("getElementTransform — iPad (device='ipad') の既定 rect", () => {
  it("collage-duo は iPhone と同じ回転・zIndex 既定値（±回転と重なり順）を iPad でも返す", () => {
    const slide = makeSlide();
    const device = getElementTransform(slide, "device", "ipad");
    const secondary = getElementTransform(slide, "deviceSecondary", "ipad");
    expect(device?.rotation).toBe(9);
    expect(device?.zIndex).toBe(3);
    expect(secondary?.rotation).toBe(-10);
    expect(secondary?.zIndex).toBe(2);
  });

  it("collage-trio は iPhone と同じ回転・zIndex 既定値を iPad でも返す", () => {
    const slide = makeSlide({
      layout: "collage-trio",
      screenshotSecondaryRef: "idb:b",
      screenshotTertiaryRef: "idb:c",
    });
    const device = getElementTransform(slide, "device", "ipad");
    const secondary = getElementTransform(slide, "deviceSecondary", "ipad");
    const tertiary = getElementTransform(slide, "deviceTertiary", "ipad");
    expect(device?.rotation ?? 0).toBe(0);
    expect(device?.zIndex).toBe(3);
    expect(secondary?.rotation).toBe(-14);
    expect(secondary?.zIndex).toBe(1);
    expect(tertiary?.rotation).toBe(14);
    expect(tertiary?.zIndex).toBe(2);
  });

  it("hero の iPad 既定 rect は iPad キャンバス (2064×2752) 内に収まる", () => {
    const slide = makeSlide({ layout: "hero" });
    const rect = getElementTransform(slide, "device", "ipad");
    expect(rect).toBeDefined();
    if (!rect) return;
    const c = canvasFor("ipad");
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(c.w + 1); // 微小なはみ出しは許容
    // iPad の hero は「画面下に置く」印象のため、画面下端からの少しのはみ出しを許容
    expect(rect.y + rect.height).toBeLessThanOrEqual(c.h + 200);
  });
});

describe("phoneW / phoneWSmall — ratio 引数 (attempt 4)", () => {
  // attempt 4 で phoneW/phoneWSmall に ratio 引数が追加された。ratio 未指定時は従来どおり
  // bezelRatioFor(kind) を使い（iPhone / iPad 13" は完全に不変）、ratio 指定時はその値を
  // 使って 11" 比率 (≈0.657) に整合させる。
  it("ratio 未指定: iPhone (1320×2868) で phoneW=0.72（attempt 3 と同値）", () => {
    const w = phoneW(1320, 2868, 0.84, "iphone");
    expect(w).toBeCloseTo(0.72, 5);
  });

  it("ratio 未指定: iPad 13\" (2064×2752) で phoneW=0.72（attempt 3 と同値）", () => {
    const w = phoneW(2064, 2752, 0.84, "ipad");
    expect(w).toBeCloseTo(0.72, 5);
  });

  it("ratio=cW/cH を渡すと iPad 11\" (1488×2266) でも phoneW=0.72 に揃う（attempt 4 の本質）", () => {
    // 修正前は bezelRatioFor("ipad")=0.75 固定で、phoneW = min(0.84, 0.72 * 1.523 * 0.75) = 0.822
    // だった。これが deviceH/cH を 0.822 まで膨張させ、device-bottom の caption と
    // デバイスが重なる原因だった。ratio = cW/cH = 0.657 を渡すと phoneW=0.72 に戻り、
    // deviceH/cH も 0.72 に戻って caption との cH*0.02 マージンが確保される。
    const ratio = 1488 / 2266;
    const w = phoneW(1488, 2266, 0.84, "ipad", ratio);
    expect(w).toBeCloseTo(0.72, 5);
    const wSmall = phoneWSmall(1488, 2266, "ipad", ratio);
    expect(wSmall).toBeCloseTo(0.66, 5);
  });

  it("ratio 未指定 vs ratio 指定 (kind/比率が一致するケース) で同じ値になる", () => {
    // iPhone: bezelRatioFor("iphone") == cW/cH = 1320/2868 ≈ 0.4603
    const withoutRatio = phoneW(1320, 2868, 0.84, "iphone");
    const withRatio = phoneW(1320, 2868, 0.84, "iphone", 1320 / 2868);
    expect(withRatio).toBeCloseTo(withoutRatio, 5);
  });
});

describe("iPad 11/13 インチの deviceH/cH 比が一致する（attempt 4 整合性チェック）", () => {
  // attempt 4 の本質: 11" (cW/cH=0.657) と 13" (cW/cH=0.75) で deviceH/cH が同じ値になり、
  // 11" で device.width が attempt 3 から縮む（caption の折り返しと被らなくなる）。
  // 13" と iPhone は cW/cH === bezelRatioFor(kind) なので ratio 引数あり/なしで同じ値。
  it("hero: 13\" と 11\" の deviceH/cH が同じ ≈ 0.72 になる", () => {
    const slide = makeSlide({ layout: "hero" });
    const rect13 = getElementTransform(slide, "device", "ipad", { canvas: IPAD_EXPORT_SIZE });
    const rect11 = getElementTransform(slide, "device", "ipad", { canvas: IPAD_EXPORT_SIZE_11 });
    expect(rect13).toBeDefined();
    expect(rect11).toBeDefined();
    if (!rect13 || !rect11) return;
    const ratio13 = rect13.height / IPAD_EXPORT_SIZE.h;
    const ratio11 = rect11.height / IPAD_EXPORT_SIZE_11.h;
    expect(ratio13).toBeCloseTo(0.72, 3);
    expect(ratio11).toBeCloseTo(0.72, 3);
  });

  it("iPad 11\" device-bottom: device.width が attempt 3 から縮む（= phoneW の ratio 反映）", () => {
    // attempt 3 (修正前): phoneW = min(0.84, 0.72 * (2266/1488) * bezelRatioFor("ipad"))
    //                         = min(0.84, 0.72 * 1.523 * 0.75) = 0.822
    //   → deviceW = 0.822 * 1488 ≈ 1223.1（caption の折り返し幅を食み出す原因）
    // attempt 4 (修正後): phoneW = min(0.84, 0.72 * 1.523 * 0.657) = 0.72
    //   → deviceW = 0.72 * 1488 = 1071.36（caption との横方向の重なりを縮小）
    const slide = makeSlide({ layout: "device-bottom" });
    const rect = getElementTransform(slide, "device", "ipad", { canvas: IPAD_EXPORT_SIZE_11 });
    expect(rect).toBeDefined();
    if (!rect) return;
    expect(rect.width).toBeCloseTo(1071.36, 1);
    // attempt 3 の値（1223）より確実に小さい
    expect(rect.width).toBeLessThan(1180);
  });

  it("iPad 13\" device-bottom: device.width は attempt 3 と完全一致（後方互換）", () => {
    // 13" は cW/cH = 2064/2752 = 0.75 = bezelRatioFor("ipad") なので、ratio 引数を
    // 渡す/渡さないで phoneW の結果は同じ → deviceW = 0.72 * 2064 = 1486.08。
    const slide = makeSlide({ layout: "device-bottom" });
    const rect = getElementTransform(slide, "device", "ipad", { canvas: IPAD_EXPORT_SIZE });
    expect(rect).toBeDefined();
    if (!rect) return;
    expect(rect.width).toBeCloseTo(1486.08, 1);
  });

  it("iPhone の device 既定 rect は attempt 3 から変わらない（後方互換）", () => {
    // attempt 3 と完全同値: deviceW = cW * 0.72、deviceH = deviceW / (cW/cH)。
    // phoneW/phoneWSmall に ratio 引数を追加したが、iPhone 側の呼び出しは ratio を
    // 渡さないので式・数値が完全に不変であることを確認する。
    const slide = makeSlide({ layout: "hero" });
    const rect = getElementTransform(slide, "device", "iphone");
    expect(rect).toBeDefined();
    if (!rect) return;
    const c = canvasFor("iphone"); // 1320×2868
    const expectedW = c.w * 0.72;
    const expectedH = expectedW / (c.w / c.h);
    expect(rect.width).toBeCloseTo(expectedW, 5);
    expect(rect.height).toBeCloseTo(expectedH, 5);
  });

  it("iPad 11\" two-devices: small device (phoneWSmall) も縮む", () => {
    // attempt 3: smallW = 0.66*cW (= phoneWSmall の 0.66 = ratio 反映なしの clamp)
    // attempt 4: smallW = 0.66*cW (同じ、phoneWSmall の clamp 0.66 はそのまま)
    // → smallW に変化はないが、念のため比率を確認しておく。
    const slide = makeSlide({ layout: "two-devices" });
    const rect = getElementTransform(slide, "deviceSecondary", "ipad", { canvas: IPAD_EXPORT_SIZE_11 });
    expect(rect).toBeDefined();
    if (!rect) return;
    expect(rect.width).toBeCloseTo(IPAD_EXPORT_SIZE_11.w * 0.66, 1);
  });
});
