"use client";
// AppSS — スクショ画像の取り込み（ドロップ / ファイル選択）。
// 画像はサーバーへ送信せず IndexedDB に保存し、"idb:<id>" 参照を返す。
// PNG / JPEG のみ許可（SVG はスクリプト混入の恐れがあるため不可）。
import * as React from "react";
import { setImage } from "@/lib/appss/imageCache";
import { putImage } from "@/lib/appss/imageStore";

const ACCEPT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

type Props = {
  label: string;
  currentRef: string;
  onChange: (ref: string) => void;
};

export function ScreenshotPicker({ label, currentRef, onChange }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    if (!ACCEPT_TYPES.includes(file.type)) {
      setError("PNG / JPEG / WebP のみ対応しています");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("20MB 以下の画像を選択してください");
      return;
    }
    setBusy(true);
    try {
      const ref = await putImage(file);
      // 直後の描画で使えるよう dataURL をキャッシュへ先行投入
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setImage(ref, dataUrl);
      onChange(ref);
    } catch {
      setError("画像の保存に失敗しました。ブラウザの空き容量をご確認ください");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        {currentRef && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] text-gray-500 hover:text-gray-300"
          >
            クリア
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`w-full rounded-md border border-dashed px-3 py-3 text-xs transition-colors ${
          dragOver
            ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
            : currentRef
              ? "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
              : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
        }`}
        disabled={busy}
      >
        {busy ? "保存中…" : currentRef ? "画像を差し替える" : "スクショをドロップ / クリックで選択"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      <p className="mt-1 text-[10px] text-gray-600">画像は端末内にのみ保存され、サーバーへは送信されません</p>
    </div>
  );
}
