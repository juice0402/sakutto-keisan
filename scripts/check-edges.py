#!/usr/bin/env python3
"""左右のはしの点検：計算カードの入力の段（欄・マス・−／＋・えらぶ段・大きなボタン）が、左右のはしでそろっているかを確かめる。
10/22 しょーくん「クリアと店舗の名前があるせいで、四角が左右にでこぼこして見える」「でこぼこしてるのは見ずらいから、全て直して」。
クリアは欄の横ではなく結果の紙の右上、−／＋は名前を中に書いた欄（.box-stepper）、えらぶ段の名前は上に置く。

使い方（Claude の作業環境で。Playwright が要る）:
    python3 -m http.server 8766 --directory dist &   # ビルドした dist を出しておく
    python3 scripts/check-edges.py [http://localhost:8766]
sitemap.xml の全ページを、幅360と390で見る。わざと形がちがうところは下の ALLOW に書く。
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8766'
ROOT = Path(__file__).resolve().parent.parent

# わざと左右のはしがちがうもの（ページ: 理由）
ALLOW = {
    '/kishaku/': 'ボトルの絵の右に、できあがり・原液・水の欄（絵と欄で1つの段）',
    '/mentsuyu/': '同じ（希釈のボトル）',
    '/hyohakuzai/': '同じ（希釈のボトル）',
    '/ekihi/': '同じ（希釈のボトル）',
    '/furusato/jougen/': '所得税率の7つのマスを4列に（最後の段は3つ）',
}

JS = r"""() => {
  const calc = document.getElementById('calc'); if (!calc) return [];
  const RESULT = '.doc, .receipt, .slip, .pt-card, .tag-stage, .calc-tools, .chart, .rireki, .kifu-bar, [aria-live]';
  const els = [...calc.querySelectorAll('.input, .tile, .step-btn, .seg, .wide-btn, .unit-select, .kifu-sent, select.big-select')]
    .filter((e) => e.offsetParent && !e.closest(RESULT) && !e.closest('[hidden]'));
  const rows = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width < 2) continue;
    let row = rows.find((x) => r.top < x.bottom - 10 && r.bottom > x.top + 10);
    if (!row) { row = { top: r.top, bottom: r.bottom, l: r.left, r: r.right, what: e.id || e.className.split(' ')[0] }; rows.push(row); }
    row.l = Math.min(row.l, r.left); row.r = Math.max(row.r, r.right); row.bottom = Math.max(row.bottom, r.bottom);
  }
  return rows.map((x) => ({ top: Math.round(x.top), l: Math.round(x.l), r: Math.round(x.r), what: x.what }));
}"""

sitemap = (ROOT / 'dist' / 'sitemap.xml').read_text(encoding='utf-8')
pages = [u.split('sakutto-keisan.com', 1)[1] for u in re.findall(r'<loc>(.*?)</loc>', sitemap)]
ng = 0
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 360):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        for path in pages:
            if path in ALLOW:
                continue
            page.goto(BASE + path)
            rows = page.evaluate(JS)
            if len(rows) < 2:
                continue
            left = min(r['l'] for r in rows)
            right = max(r['r'] for r in rows)
            off = [r for r in rows if abs(r['l'] - left) > 2 or abs(r['r'] - right) > 2]
            for r in off:
                ng += 1
                print(f'NG  {width}px {path} 段（{r["what"]}）のはしが {r["l"]}〜{r["r"]}（ほかは {left}〜{right}）')
        page.close()
    browser.close()
print('ALL OK' if not ng else f'NG {ng}')
sys.exit(1 if ng else 0)
