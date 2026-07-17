"use client";
// AppSS — スライド一覧サイドバー（サムネ・選択・追加/複製/削除・上下並べ替え）。
import * as React from "react";
import type { AppSSSlide, Theme } from "@/lib/appss/types";
import { CANVAS } from "@/lib/appss/constants";
import { SlideCanvas } from "./SlideCanvas";

const THUMB_W = 84;
const THUMB_SCALE = THUMB_W / CANVAS.w;

type Props = {
  slides: AppSSSlide[];
  activeSlideId: string | null;
  theme: Theme;
  fontFamily: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
};

export function Sidebar({
  slides,
  activeSlideId,
  theme,
  fontFamily,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
}: Props) {
  return (
    <div className="flex h-full w-40 flex-col border-r border-gray-800 bg-gray-950/60">
      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-400">
        <span>スライド</span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded px-1.5 py-0.5 text-cyan-300 hover:bg-gray-800"
          title="スライドを追加"
        >
          ＋追加
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {slides.map((slide, index) => {
          const active = slide.id === activeSlideId;
          return (
            <div key={slide.id} className="group">
              <button
                type="button"
                onClick={() => onSelect(slide.id)}
                className={`relative block w-full overflow-hidden rounded-md border ${
                  active ? "border-cyan-400" : "border-gray-800 hover:border-gray-600"
                }`}
                style={{ height: CANVAS.h * THUMB_SCALE }}
                title={`${index + 1}枚目を選択`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none"
                  style={{
                    width: CANVAS.w,
                    height: CANVAS.h,
                    transform: `scale(${THUMB_SCALE})`,
                    transformOrigin: "top left",
                    fontFamily,
                  }}
                >
                  <SlideCanvas slide={slide} theme={theme} />
                </div>
                <span className="absolute left-1 top-1 rounded bg-gray-950/80 px-1 text-[10px] text-gray-300">
                  {index + 1}
                </span>
              </button>
              <div className="mt-1 flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <IconButton label="上へ" disabled={index === 0} onClick={() => onMove(slide.id, -1)}>
                  ↑
                </IconButton>
                <IconButton
                  label="下へ"
                  disabled={index === slides.length - 1}
                  onClick={() => onMove(slide.id, 1)}
                >
                  ↓
                </IconButton>
                <IconButton label="複製" onClick={() => onDuplicate(slide.id)}>
                  ⧉
                </IconButton>
                <IconButton
                  label="削除"
                  disabled={slides.length <= 1}
                  onClick={() => onDelete(slide.id)}
                >
                  ×
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="h-6 w-6 rounded text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
