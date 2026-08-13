#!/usr/bin/env python3
"""product-hunt-launch.md の X 告知ドラフトを重み付き文字数で実測する。

X の数え方: ラテン等は 1、CJK と絵文字は 2、URL は長さに関係なく一律 23。
見積もりは必ず外れるので、ドラフトを編集したら必ずこれを回す。

使い方: python3 docs/producthunt/src/xcount.py
"""

import re
from pathlib import Path

DOC = Path(__file__).resolve().parent.parent / "product-hunt-launch.md"

# 重み 1 の符号位置。ここに含まれないものはすべて 2 として数える。
LIGHT = [(0x0000, 0x10FF), (0x2000, 0x200D), (0x2010, 0x201F), (0x2032, 0x2037)]


def weight(ch: str) -> int:
    cp = ord(ch)
    return 1 if any(a <= cp <= b for a, b in LIGHT) else 2


def xlen(text: str) -> int:
    text = re.sub(r"https?://\S+", "\x00" * 23, text)
    return sum(1 if ch == "\x00" else weight(ch) for ch in text)


def main() -> None:
    md = DOC.read_text()
    # 「### JA-1 (...)」の直後のコードフェンスを本文として拾う
    pattern = re.compile(r"^### ((?:JA|EN)-\d)[^\n]*\n+```\n(.*?)\n```", re.M | re.S)
    hits = pattern.findall(md)
    if not hits:
        raise SystemExit("ドラフトが見つからない。product-hunt-launch.md の見出し形式を確認すること")

    print(f"{'案':6} {'weighted':>8}  判定")
    for name, body in hits:
        n = xlen(body)
        print(f"{name:6} {n:>8}  {'OK' if n <= 280 else '★ 280 超過'}")


if __name__ == "__main__":
    main()
