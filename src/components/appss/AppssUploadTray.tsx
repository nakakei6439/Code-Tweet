"use client";
// AppSS — トップフォームでのスクショ事前登録トレイ。
// 画像はサーバーへ送信せず IndexedDB に保存し、"idb:<id>" 参照だけを親に渡す。
// 生成後、登録順にスライドへ自動配置される（handoff → projectFromCopy）。
import * as React from "react";
import { img, preloadImages, setImage } from "@/lib/appss/imageCache";
import { putImage } from "@/lib/appss/imageStore";
import { MAX_SLIDES } from "@/lib/appss/constants";

const ACCEPT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

type Props = {
  value: string[];
  onChange: (refs: string[]) => void;
  disabled?: boolean;
  max?: number;
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AppssUploadTray({ value, onChange, disabled = false, max = MAX_SLIDES }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [, forceRerender] = React.useReducer((x: number) => x + 1, 0);

  const remaining = Math.max(0, max - value.length);
  const atMax = remaining === 0;

  // 戻ってきた場合など、キャッシュ未解決のサムネを IndexedDB から読み込む。
  React.useEffect(() => {
    let alive = true;
    void preloadImages(value).then(() => {
      if (alive) forceRerender();
    });
    return () => {
      alive = false;
    };
  }, [value]);

  async function addFiles(files: FileList | File[] | null | undefined) {
    if (!files || disabled) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);

    const room = max - value.length;
    if (room <= 0) {
      setError(`スクショは最大${max}枚までです`);
      return;
    }

    setBusy(true);
    try {
      const added: string[] = [];
      let rejected = false;
      for (const file of list) {
        if (added.length >= room) {
          rejected = true;
          break;
        }
        if (!ACCEPT_TYPES.includes(file.type)) {
          setError("PNG / JPEG / WebP のみ対応しています");
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError("20MB 以下の画像を選択してください");
          continue;
        }
        const ref = await putImage(file);
        // 重複（同一内容）は同じ ref になるので二重登録を防ぐ
        if (value.includes(ref) || added.includes(ref)) continue;
        const dataUrl = await readAsDataUrl(file);
        setImage(ref, dataUrl);
        added.push(ref);
      }
      if (rejected && !error) {
        setError(`スクショは最大${max}枚までです（超過分は追加されませんでした）`);
      }
      if (added.length > 0) onChange([...value, ...added]);
    } catch {
      setError("画像の保存に失敗しました。ブラウザの空き容量をご確認ください");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          スクリーンショット <span className="text-gray-500 font-normal">（任意）</span>
        </label>
        <span className="text-xs text-gray-500">
          {value.length} / {max} 枚
        </span>
      </div>

      {value.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((ref, index) => {
            const src = img(ref);
            return (
              <li
                key={ref}
                className="group relative overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
              >
                <div className="flex aspect-[9/19] items-center justify-center">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={`スクショ${index + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-600">読込中…</span>
                  )}
                </div>
                <span className="absolute left-1 top-1 rounded bg-gray-950/80 px-1 text-[10px] text-gray-200">
                  {index + 1}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gray-950/70 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <TrayButton label="前へ" disabled={index === 0 || disabled} onClick={() => move(index, -1)}>
                    ←
                  </TrayButton>
                  <TrayButton
                    label="次へ"
                    disabled={index === value.length - 1 || disabled}
                    onClick={() => move(index, 1)}
                  >
                    →
                  </TrayButton>
                  <TrayButton label="削除" disabled={disabled} onClick={() => remove(index)}>
                    ×
                  </TrayButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atMax && !disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        disabled={disabled || busy || atMax}
        className={`w-full rounded-lg border border-dashed px-4 py-4 text-xs transition-colors disabled:cursor-not-allowed ${
          dragOver
            ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
            : atMax
              ? "border-gray-800 text-gray-600"
              : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
        }`}
      >
        {busy
          ? "保存中…"
          : atMax
            ? `最大${max}枚まで登録済み`
            : "スクショをドロップ / クリックで選択（複数可）"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
      <p className="mt-1.5 text-[10px] leading-4 text-gray-600">
        登録した順にスライドへ自動配置されます。画像は端末内にのみ保存され、サーバーへは送信されません。
      </p>
    </div>
  );
}

function TrayButton({
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
      className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}
