#!/usr/bin/env bash
# build/ の HTML を 2540x1520 の PNG として docs/producthunt/en/ へ書き出す。
# PH 推奨は 1270x760。その 2 倍で撮ることでリサンプルなしに retina 相当になる。
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="$(cd "$(dirname "$0")" && pwd)"
BUILD="$SRC/build"
OUT="$SRC/../en"

mkdir -p "$OUT"
for html in "$BUILD"/*.html; do
  name="$(basename "$html" .html)"
  profile="$(mktemp -d)"
  rm -f "$OUT/$name.png"

  # この環境の headless Chrome は PNG を書いたあと終了しないことがある。
  # プロセスの終了を待たず、ファイルが出来たら落とす。
  "$CHROME" --headless --disable-gpu --hide-scrollbars --no-first-run \
    --user-data-dir="$profile" --virtual-time-budget=3000 \
    --window-size=2540,1520 \
    --screenshot="$OUT/$name.png" "file://$html" >/dev/null 2>&1 &
  pid=$!
  for _ in $(seq 1 60); do
    [ -s "$OUT/$name.png" ] && sleep 2 && break
    sleep 2
  done
  kill "$pid" 2>/dev/null || true
  sleep 1
  rm -rf "$profile" 2>/dev/null || true

  printf '%s  ' "$name"
  sips -g pixelWidth -g pixelHeight "$OUT/$name.png" | tail -2 | tr '\n' ' '
  echo
done
