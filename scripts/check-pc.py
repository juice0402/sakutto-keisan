#!/usr/bin/env python3
"""パソコンの見開きの点検（10/31 連絡 C-017・#107）：幅1080px以上の並べ方を、全ページで確かめる。
  1280×800・1366×768・1920×1080 で
    横にはみ出さない
    右の段（.pc-right）の本文の1行が全角40字以下（段の中の文字の幅 ÷ 16px）
    左の段（.pc-left）のとまり方：画面に入るなら上から14px、入らないなら下のはしが画面の下から14px
    トップの「よく使う計算」が4列×2段
  --compare <URL> をつけると、スマホ（390×844）でそのURL（たとえば main のビルド）と1画素ずつくらべる
    遅れて描く所（.prose の content-visibility）は両方とも visible にしてから撮る

使い方（Claude の作業環境で。Playwright が要る）:
    python3 -m http.server 8766 --directory dist &
    python3 scripts/check-pc.py [http://localhost:8766] [--compare http://localhost:8767]
"""
import io
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
args = sys.argv[1:]
COMPARE = None
if '--compare' in args:
    i = args.index('--compare')
    COMPARE = args[i + 1]
    del args[i:i + 2]
BASE = args[0] if args else 'http://localhost:8766'
SIZES = ((1280, 800), (1366, 768), (1920, 1080))
MAX_CHARS = 40
# 見開きにしないページ（現場手帳は自分の2列）
SKIP = {'/genba/'}

pages = sorted(
    '/' + str(f.parent.relative_to(ROOT / 'dist')).replace('\\', '/') + '/' if f.parent != ROOT / 'dist' else '/'
    for f in (ROOT / 'dist').rglob('index.html')
)
pages = [p for p in pages if p not in SKIP]

MEASURE = """() => {
  const L = document.querySelector('.pc-left'), R = document.querySelector('.pc-right');
  if (!L || !R) return null;
  const cs = getComputedStyle(R);
  const inner = R.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const grid = document.querySelector('.pc-left .pick-grid');
  let pick = null;
  if (grid) {
    const lis = [...grid.children];
    pick = { n: lis.length, cols: new Set(lis.map((e) => Math.round(e.getBoundingClientRect().left))).size,
             rows: new Set(lis.map((e) => Math.round(e.getBoundingClientRect().top))).size };
  }
  return { over: document.documentElement.scrollWidth - innerWidth, chars: inner / 16, h: L.offsetHeight,
           pos: getComputedStyle(L).position, pick };
}"""

# 左の段がとまっているはずの所までスクロールして、上のはしの位置を見る
STICK = """() => {
  const L = document.querySelector('.pc-left'), R = document.querySelector('.pc-right');
  scrollTo(0, 0);
  const h = L.offsetHeight, vh = innerHeight;
  const want = h + 28 > vh ? vh - h - 14 : 14;
  const top0 = L.getBoundingClientRect().top + scrollY;
  const rightEnd = R.getBoundingClientRect().bottom + scrollY;
  const s = Math.max(0, top0 - want) + 200;
  // 右の段が短くて、左の段がとまる前に押し上げられるページは、とまり方を見ない
  if (rightEnd < s + want + h + 1 || s > document.documentElement.scrollHeight - vh) return { want, skip: true };
  scrollTo(0, s);
  return { want, got: L.getBoundingClientRect().top };
}"""

ng = 0


def local_only(route):
    # 広告など外のサイトは読まない（手元のビルドだけを見る）
    url = route.request.url
    if url.startswith(BASE) or (COMPARE and url.startswith(COMPARE)):
        route.continue_()
    else:
        route.abort()


def bad(msg):
    global ng
    ng += 1
    print('NG ', msg)


with sync_playwright() as p:
    browser = p.chromium.launch()
    for w, h in SIZES:
        page = browser.new_page(viewport={'width': w, 'height': h})
        page.route('**/*', local_only)
        for path in pages:
            page.goto(BASE + path)
            page.wait_for_timeout(50)
            m = page.evaluate(MEASURE)
            if m is None:
                bad(f'{w}×{h} {path} 見開きになっていない')
                continue
            if m['pos'] != 'sticky':
                bad(f'{w}×{h} {path} 左の段がとまらない（{m["pos"]}）')
            if m['over'] > 0:
                bad(f'{w}×{h} {path} 横に {m["over"]}px はみ出す')
            if m['chars'] > MAX_CHARS:
                bad(f'{w}×{h} {path} 右の段の1行が全角 {m["chars"]:.1f} 字')
            if path == '/':
                pk = m['pick']
                if not pk or pk['cols'] != 4 or pk['rows'] != 2:
                    bad(f'{w}×{h} トップの「よく使う計算」が {pk}')
            s = page.evaluate(STICK)
            if not s.get('skip') and abs(s['got'] - s['want']) > 1.5:
                bad(f'{w}×{h} {path} 左の段のとまる位置が {s["got"]:.0f}px（{s["want"]:.0f}px のはず。高さ {m["h"]}px）')
        page.close()

    if COMPARE:
        from PIL import Image, ImageChops

        VIS = '.prose{content-visibility:visible!important}'
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        page = ctx.new_page()
        page.route('**/*', local_only)

        def shot(url):
            page.goto(url)
            page.add_style_tag(content=VIS)
            page.wait_for_timeout(80)
            return Image.open(io.BytesIO(page.screenshot(full_page=True, animations='disabled'))).convert('RGB')

        for path in pages + ['/genba/']:
            a, b = shot(BASE + path), shot(COMPARE + path)
            if a.size != b.size:
                bad(f'390px {path} 大きさがちがう {a.size} と {b.size}')
            elif ImageChops.difference(a, b).getbbox():
                bad(f'390px {path} 画素がちがう {ImageChops.difference(a, b).getbbox()}')
        ctx.close()
    browser.close()

print('ALL OK' if not ng else f'NG {ng}')
sys.exit(1 if ng else 0)
