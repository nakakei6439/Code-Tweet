import { describe, expect, it } from "vitest";
import { getElementTransform } from "@/components/appss/SlideCanvas";
import type { AppSSSlide } from "@/lib/appss/types";
import { IPAD_EXPORT_SIZE, canvasFor } from "@/lib/appss/constants";

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
