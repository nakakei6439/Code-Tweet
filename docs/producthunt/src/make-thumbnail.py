#!/usr/bin/env python3
"""Product Hunt サムネイル (240x240) を docs/brand のアイコンから作る。

ブランドアイコンは下部に「Code Tweet」のワードマークが焼き込まれており、
240px まで縮めると文字が潰れる。ここではシンボル部分（吹き出し + イルカ）だけを
切り出し、カード地色の正方形に中央配置してから 240px へ落とす。

使い方: python3 docs/producthunt/src/make-thumbnail.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs/brand/code-tweet-icon-1254.png"
OUT = ROOT / "docs/producthunt/en/thumbnail.png"

# シンボル（吹き出し + イルカ）のバウンディングボックス。
# 地色との差分を走査して実測した値（ワードマークは y=949 以降なので含まない）。
SYMBOL_BOX = (196, 219, 1117, 939)  # left, top, right, bottom

# 作業キャンバス。240 の 4 倍で組んでから縮小し、輪郭のジャギーを避ける。
WORK = 960
# シンボルがキャンバス内で占める割合。余白を残さないと PH 一覧で窮屈に見える。
FILL = 0.80


def main() -> None:
    icon = Image.open(SRC).convert("RGB")
    # カード地色（ワードマーク上の余白から取得）
    bg = icon.getpixel((627, 120))

    symbol = icon.crop(SYMBOL_BOX)
    sw, sh = symbol.size
    limit = int(WORK * FILL)
    scale = min(limit / sw, limit / sh)
    symbol = symbol.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)

    canvas = Image.new("RGB", (WORK, WORK), bg)
    canvas.paste(symbol, ((WORK - symbol.width) // 2, (WORK - symbol.height) // 2))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.resize((240, 240), Image.LANCZOS).save(OUT)
    print(f"wrote {OUT} (bg={bg}, symbol={symbol.size})")


if __name__ == "__main__":
    main()
