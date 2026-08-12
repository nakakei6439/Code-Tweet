#!/usr/bin/env python3
"""slides.json から Product Hunt ギャラリー用の HTML を 1 枚ずつ書き出す。

キャンバスは 2540x1520（PH 推奨 1270x760 の 2 倍）。
raw/ のスクリーンショットは PIL で切り出してから data URI で埋める。
外部ファイル参照が無いので、headless Chrome の file:// 制約に引っかからない。

使い方:
    python3 docs/producthunt/src/build.py          # HTML を生成
    bash   docs/producthunt/src/capture.sh         # PNG を書き出す
"""

import base64
import io
import json
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent
ROOT = SRC.parents[2]
RAW = SRC.parent / "raw"
OUT = SRC / "build"

# ブランド配色。ヘッダーのグラデーション (cyan-300 / fuchsia-300 / yellow-200) と
# 本体の背景 (gray-950) をそのまま使い、アプリと同じ製品に見えるようにする。
BG = "#05070d"
CYAN = "#67e8f9"
FUCHSIA = "#f0abfc"
YELLOW = "#fef08a"


def data_uri(path: Path, crop) -> str:
    im = Image.open(path).convert("RGB")
    if crop:
        im = im.crop(tuple(crop))
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


CSS = f"""
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:{{W}}px; height:{{H}}px; overflow:hidden; }}
body {{
  background:{BG};
  font-family:"SF Pro Display","SF Pro Text",-apple-system,"Helvetica Neue",Arial,sans-serif;
  color:#f8fafc;
  position:relative;
}}
/* 左上から差す淡いグラデーション。単色の黒板に見えないようにするためだけのもの */
body::before {{
  content:""; position:absolute; inset:0;
  background:
    radial-gradient(1200px 900px at 12% 8%, rgba(103,232,249,.13), transparent 62%),
    radial-gradient(1100px 850px at 88% 92%, rgba(240,171,252,.11), transparent 60%);
}}
.stage {{ position:absolute; inset:0; }}
.eyebrow {{
  font-size:40px; font-weight:700; letter-spacing:.22em;
  color:{CYAN}; text-transform:uppercase;
}}
h1 {{ font-size:118px; line-height:1.14; font-weight:700; letter-spacing:-.028em; }}
h1 em {{
  font-style:normal;
  background:linear-gradient(100deg,{CYAN} 0%,{FUCHSIA} 52%,{YELLOW} 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}}
.sub {{ font-size:50px; line-height:1.5; color:#a8b3c4; font-weight:400; }}

/* --- split: 左にコピー / 右にブラウザ枠 --- */
.copy {{ position:absolute; left:160px; top:0; height:100%; width:1120px;
        display:flex; flex-direction:column; justify-content:center; gap:40px; }}
.copy h1 {{ font-size:96px; }}
.copy .sub {{ font-size:46px; }}
.frame {{
  position:absolute; right:110px; top:50%; transform:translateY(-50%);
  width:1140px; border-radius:34px; overflow:hidden;
  background:#0d1117; border:2px solid rgba(148,163,184,.28);
  box-shadow:0 60px 120px rgba(0,0,0,.55);
}}
.bar {{ height:74px; background:#161b22; display:flex; align-items:center; gap:18px; padding:0 30px;
       border-bottom:2px solid rgba(148,163,184,.22); }}
.dot {{ width:20px; height:20px; border-radius:50%; }}
.url {{ flex:1; margin-left:16px; height:40px; border-radius:20px; background:#0d1117;
       display:flex; align-items:center; padding:0 20px;
       font-size:22px; color:#8b98a9; letter-spacing:.01em; }}
.frame img {{ display:block; width:100%; }}
/* チップはブラウザ枠の左端にかぶせる。宙に浮かせるとスライドに見えて広告に見えない */
.chip {{
  position:absolute; padding:24px 42px; border-radius:9999px;
  font-size:38px; font-weight:600; white-space:nowrap;
  box-shadow:0 16px 44px rgba(0,0,0,.4); z-index:5;
}}
.chip.top {{ right:1160px; top:430px;
            background:linear-gradient(100deg,{CYAN},{FUCHSIA}); color:#0b1020; }}
.chip.bottom {{ right:1160px; bottom:430px; background:#f1f5f9; color:#0b1020; }}

/* --- ポストカード（スライド3）。アプリの TweetCard と同じ体裁 --- */
.pstack {{ position:absolute; right:120px; top:50%; transform:translateY(-50%);
          width:1080px; display:flex; flex-direction:column; gap:26px; }}
.pcard {{ background:#0d1117; border:2px solid rgba(148,163,184,.26); border-radius:26px;
         padding:34px 38px; box-shadow:0 30px 70px rgba(0,0,0,.45); }}
.prow {{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }}
.pwhen {{ color:#e2e8f0; font-size:32px; font-weight:600; display:flex; align-items:center; gap:14px; }}
/* アプリ側は時計アイコン。headless Chrome にカラー絵文字が無いので同じ色の点で代用する。 */
.pdot {{ width:18px; height:18px; border-radius:50%; border:4px solid {CYAN}; display:inline-block; }}
.pcount {{ color:#94a3b8; font-size:28px; }}
.preason {{ color:#94a3b8; font-size:26px; margin-bottom:16px; }}
.pbody {{ color:#f8fafc; font-size:30px; line-height:1.5; }}

/* --- full: スライド1。コピーだけで持たせる --- */
.full {{ position:absolute; inset:0; display:flex; flex-direction:column;
        justify-content:center; gap:56px; padding:0 210px; }}
.full h1 {{ font-size:158px; }}
.full .sub {{ font-size:56px; max-width:1900px; }}

/* --- closer: スライド5。反転して締める --- */
.closer {{ position:absolute; inset:0; display:flex; flex-direction:column;
          justify-content:center; gap:52px; padding:0 210px; }}
.closer h1 {{ font-size:130px; }}
ul {{ list-style:none; display:flex; flex-direction:column; gap:30px; margin-top:8px; }}
li {{ font-size:52px; color:#cbd5e1; display:flex; align-items:center; gap:30px; }}
li::before {{ content:"✓"; color:{CYAN}; font-size:52px; font-weight:700; }}
.wordmark {{ position:absolute; left:210px; bottom:110px; display:flex; align-items:center; gap:28px; }}
.wordmark img {{ width:104px; height:104px; border-radius:24px; }}
.wordmark span {{ font-size:52px; font-weight:700; letter-spacing:-.01em; }}
.wordmark small {{ font-size:38px; color:#8b98a9; font-weight:400; margin-left:10px; }}
"""

PAGE = """<!doctype html>
<html><head><meta charset="utf-8"><style>{css}</style></head>
<body><div class="stage">{body}</div></body></html>
"""


def browser_frame(uri: str) -> str:
    return f"""
<div class="frame">
  <div class="bar">
    <span class="dot" style="background:#ff5f57"></span>
    <span class="dot" style="background:#febc2e"></span>
    <span class="dot" style="background:#28c840"></span>
    <span class="url">code-tweet.vercel.app</span>
  </div>
  <img src="{uri}">
</div>"""


def post_cards(cards: list[dict]) -> str:
    """スライド 3 用。TweetCard と同じ体裁でポストを積む。
    生成結果の画面はログインしないと出せないため、実際に生成した本文
    （docs/producthunt/drafts/dogfood-en.json）をカードに流し込んで再現している。"""
    items = []
    for c in cards:
        items.append(
            f"""<div class="pcard">
  <div class="prow">
    <span class="pwhen"><i class="pdot"></i>{c["when"]}</span>
    <span class="pcount">{c["weighted"]}/280</span>
  </div>
  <div class="preason">{c["reason"]}</div>
  <div class="pbody">{c["text"]}</div>
</div>"""
        )
    return '<div class="pstack">' + "".join(items) + "</div>"


def render(slide: dict, icon_uri: str) -> str:
    head = f'<div class="eyebrow">{slide["eyebrow"]}</div>'
    h1 = "<h1>" + "<br>".join(slide["headline"]) + "</h1>"

    if slide["layout"] == "full":
        return f'<div class="full">{head}{h1}<div class="sub">{slide["sub"]}</div></div>'

    if slide["layout"] == "closer":
        items = "".join(f"<li>{p}</li>" for p in slide["proof"])
        mark = (
            f'<div class="wordmark"><img src="{icon_uri}">'
            f'<span>Code Tweet</span><small>code-tweet.vercel.app</small></div>'
        )
        return f'<div class="closer">{head}{h1}<ul>{items}</ul></div>{mark}'

    if slide.get("cards"):
        copy = (
            f'<div class="copy">{head}{h1}<div class="sub">{slide["sub"]}</div></div>'
        )
        return copy + post_cards(slide["cards"])

    uri = data_uri(RAW / slide["image"], slide.get("crop"))
    chips = (
        f'<div class="chip top">{slide["chipTop"]}</div>'
        f'<div class="chip bottom">{slide["chipBottom"]}</div>'
    )
    copy = f'<div class="copy">{head}{h1}<div class="sub">{slide["sub"]}</div></div>'
    return copy + browser_frame(uri) + chips


def main() -> None:
    spec = json.loads((SRC / "slides.json").read_text())
    w, h = spec["canvas"]["w"], spec["canvas"]["h"]
    css = CSS.replace("{W}", str(w)).replace("{H}", str(h))
    icon_uri = data_uri(ROOT / "docs/producthunt/en/thumbnail.png", None)

    OUT.mkdir(exist_ok=True)
    built, skipped = [], []
    for slide in spec["slides"]:
        img = slide.get("image")
        if img and not (RAW / img).exists():
            skipped.append(f'{slide["file"]} (raw/{img} が無い)')
            continue
        (OUT / f'{slide["file"]}.html').write_text(
            PAGE.format(css=css, body=render(slide, icon_uri))
        )
        built.append(slide["file"])

    print("built:  " + ", ".join(built))
    if skipped:
        print("skipped: " + ", ".join(skipped))


if __name__ == "__main__":
    main()
