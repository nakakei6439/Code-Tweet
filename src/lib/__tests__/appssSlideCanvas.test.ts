import { describe, expect, it } from "vitest";
import { getElementTransform } from "@/components/appss/SlideCanvas";
import type { AppSSSlide } from "@/lib/appss/types";

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
