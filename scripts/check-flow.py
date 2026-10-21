#!/usr/bin/env python3
"""入力の流れの点検（10/21 しょーくん「上から下に、どのフォームに何を入れたらいいか、直感でわかるように」）。
スマホの幅（360・390）で、上の欄から順に入れていき、次のことを確かめる。

- 答えの下の案内が、まだ入れていない欄のうち、いちばん上の欄を名指ししているか（下の CASES の文と同じか）
- 案内が1行に入っているか
- さわっている間だけ出す欄の説明（data-hint）が、出て・1行に入って・離れると消えるか
- Enter で、答えの欄（点線の枠）に入らないか

使い方（Claude の作業環境で。Playwright が要る）:
    python3 -m http.server 8766 --directory dist &   # ビルドした dist を出しておく
    python3 scripts/check-flow.py [http://localhost:8766]
ツールを足したら、下の CASES に「操作と、そのあとに出る案内」を足す。
"""
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8766'

# slug: [(操作, 案内の場所, 案内の文)]。最初の行は開いたとき（操作なし）。答えが出たら案内は None（見ない）
# 操作：('fill', 欄, 数字) か ('click', セレクタ)
CASES = {
    'waribiki': [
        (None, '#t-save', '元の値段を入れてください'),
        (('fill', '#price', '1980'), '#t-save', '値引きをえらんでください'),
        (('click', '.tile[data-pct="30"]'), None, None),
    ],
    'waribiki-ritsu': [
        (None, '#t-save', '元の値段を入れてください'),
        (('fill', '#price', '2000'), '#t-save', '割引後の値段を入れてください'),
        (('fill', '#sale', '1700'), None, None),
    ],
    'tanka': [
        (None, '#t-sub', '2つ以上入れると、安い順に並びます'),
        (('fill', '#qty-a', '500'), '#t-sub', 'Aの値段を入れてください'),
        (('fill', '#price-a', '198'), '#t-sub', 'もう1つ入れると、くらべられます'),
        (('fill', '#price-b', '298'), '#t-sub', 'Bの量を入れてください'),
        (('fill', '#qty-b', '1000'), None, None),
    ],
    'matomegai': [
        (None, '#t-sub', '2つ以上入れると、安い順に並びます'),
        (('fill', '#price-a', '1180'), '#t-sub', 'Aの量か入り数を入れてください'),
        (('fill', '#qty-a', '350'), '#t-sub', 'もう1つ入れると、くらべられます'),
        (('fill', '#packs-a', '6'), '#t-sub', 'もう1つ入れると、くらべられます'),
        (('fill', '#price-b', '208'), '#t-sub', 'Bの量か入り数を入れてください'),
        (('fill', '#qty-b', '350'), None, None),
    ],
    'warikan': [
        (None, '#r-foot', '合計を入れてください'),
        (('fill', '#total', '10000'), '#r-foot', '人数を入れてください'),
        (('click', '#people-plus'), None, None),
    ],
    'warikan-keisha': [
        (None, '#r-foot', '合計を入れてください'),
        (('fill', '#total', '30000'), '#r-foot', '人数を入れてください'),
        (('fill', '#people-0', '1'), '#r-foot', 'ふつうの人数を入れてください'),
        (('fill', '#people-1', '4'), None, None),
    ],
    'denki-dai': [
        (None, '#r-foot', '家電をえらんでください'),
        (('click', '.tile[data-watt="600"]'), '#r-foot', '1日に使う時間を入れてください'),
        (('fill', '#hours', '8'), None, None),
    ],
    'kotatsu': [
        (None, '#r-foot', '強さをえらんでください'),
        (('click', '.tile[data-watt="180"]'), '#r-foot', '1日に使う時間を入れてください'),
        (('fill', '#hours', '8'), None, None),
    ],
    'denki-moufu': [
        (None, '#r-foot', '強さをえらんでください'),
        (('click', '.tile[data-watt="32"]'), '#r-foot', '1日に使う時間を入れてください'),
        (('fill', '#hours', '8'), None, None),
    ],
    'hot-carpet': [
        (None, '#r-foot', '強さをえらんでください'),
        (('click', '.tile[data-watt="471"]'), '#r-foot', '1日に使う時間を入れてください'),
        (('fill', '#hours', '8'), None, None),
    ],
    'ceramic-heater': [
        (None, '#r-foot', '強さをえらんでください'),
        (('click', '.tile[data-watt="1170"]'), '#r-foot', '1日に使う時間を入れてください'),
        (('fill', '#hours', '8'), None, None),
    ],
    'oil-heater': [
        (None, '#r-foot', '強さをえらんでください'),
        (('click', '.tile[data-watt="1500"]'), '#r-foot', '1日に使う時間を入れてください'),
        (('fill', '#hours', '8'), None, None),
    ],
    'recipe': [
        (None, None, None),
        (('fill', '#amt-1', '300'), None, None),
    ],
    'kishaku': [
        (None, '#r-ratio', '何倍に薄めるかをえらんでください'),
        (('click', '.tile[data-ratio="100"]'), '#r-hints', 'わかっている量を1つ入れてください'),
        (('fill', '#v-total', '500'), None, None),
    ],
    'mentsuyu': [
        (None, '#r-ratio', '何倍濃縮かをえらんでください'),
        (('click', '.tile[data-ratio="3"]'), '#r-hints', 'わかっている量を1つ入れてください'),
        (('fill', '#v-total', '100'), None, None),
    ],
    'hyohakuzai': [
        (None, '#r-ratio', '作りたい濃度をえらんでください'),
        (('click', '.tile[data-target="0.05"]'), '#r-hints', 'わかっている量を1つ入れてください'),
        (('fill', '#v-water', '1000'), None, None),
    ],
    'ekihi': [
        (None, '#r-ratio', '何倍に薄めるかをえらんでください'),
        (('click', '.tile[data-ratio="1000"]'), '#r-hints', 'わかっている量を1つ入れてください'),
        (('fill', '#v-water', '2000'), None, None),
    ],
    'zangyo-dai': [
        (None, '#r-foot', '時給を入れてください'),
        (('fill', '#wage', '1200'), '#r-foot', '残業の時間を入れてください'),
        (('fill', '#over', '20'), None, None),
    ],
    'zangyo-gekkyu': [
        (None, '#r-foot', '月給を入れてください'),
        (('fill', '#salary', '300000'), '#r-foot', '年間休日を入れてください'),
        (('fill', '#holidays', '120'), '#r-foot', '1日の所定時間を入れてください'),
        (('fill', '#daily', '8'), '#r-foot', '残業の時間を入れてください'),
        (('fill', '#over', '20'), None, None),
    ],
    'rieki-ritsu': [
        (None, '#r-foot', '3つのうち2つを入れてください'),
        (('fill', '#price', '1500'), '#r-foot', '原価か利益率を入れてください'),
        (('fill', '#cost', '1000'), None, None),
    ],
    'seisou-jikan': [
        (None, '#r-foot', '作業をえらんでください'),
        (('click', '.tile[data-speed="370"]'), '#r-foot', '面積を入れてください'),
        (('fill', '#area', '1000'), '#r-foot', '人数か作業時間を入れてください'),
        (('fill', '#people', '2'), None, None),
    ],
    'fx-iji-ritsu': [
        (None, '#r-need', '口座のお金を入れてください'),
        (('fill', '#money', '100000'), '#r-need', 'いまのレートを入れてください'),
        (('fill', '#rate', '150'), '#r-need', 'レバレッジか通貨の量を入れてください'),
        (('fill', '#lev', '10'), None, None),
    ],
    'fx-losscut': [
        (None, '#r-need', '通貨の量をえらんでください'),
        (('click', '.tile[data-qty="10000"]'), '#r-need', '口座のお金を入れてください'),
        (('fill', '#money', '100000'), '#r-need', 'いまのレートを入れてください'),
        (('fill', '#rate', '150'), None, None),
    ],
    'fx-swap': [
        (None, None, None),
        (('click', '.seg-btn[data-side="sell"]'), None, None),
    ],
}

# 文字の行数（Range の四角の上の位置を数える）
LINES = """(sel) => { const e = document.querySelector(sel); if (!e) return 0;
  const r = document.createRange(); r.selectNodeContents(e);
  return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; }"""
HINT = """() => { const h = document.querySelector('.field-hint');
  return h ? { shown: !h.hidden && h.offsetParent !== null, text: h.textContent, one: !h.getClientRects().length || (h.scrollWidth <= h.clientWidth + 1 && h.getClientRects()[0].height < 30) } : null; }"""
OUT_ENTER = """() => { const vis = [...document.querySelectorAll('#calc input')].filter((x) => x.offsetParent !== null && !x.closest('.is-out')); return vis.map((x) => x.id); }"""

bad = 0


def check(ok, msg):
    global bad
    bad += not ok
    if not ok:
        print('NG  ' + msg)


with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (360, 390):
        page = browser.new_page(viewport={'width': width, 'height': 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        for slug, steps in CASES.items():
            page.goto(f'{BASE}/{slug}/')
            page.wait_for_timeout(60)
            for act, sel, text in steps:
                if act and act[0] == 'fill':
                    page.fill(act[1], act[2])
                elif act:
                    page.click(act[1])
                page.wait_for_timeout(40)
                if sel:
                    got = page.inner_text(sel).strip()
                    where = f'{width}px /{slug}/ {act[1] if act else "はじめ"}'
                    check(got == text, f'{where} の案内「{got}」（「{text}」のはず）')
                    check(page.evaluate(LINES, sel) <= 1, f'{where} の案内「{got}」が1行に入らない')
            # Enter：答えの欄（点線の枠）に入らない
            for id_ in page.evaluate(OUT_ENTER):
                page.focus(f'#{id_}')
                page.keyboard.press('Enter')
                page.wait_for_timeout(20)
                into = page.evaluate("() => { const a = document.activeElement; return a && a.closest && a.closest('.is-out') ? a.id : ''; }")
                check(not into, f'{width}px /{slug}/ #{id_} で Enter → 答えの欄 #{into} に入る')
            # さわっている間だけ出す欄の説明
            for id_ in page.eval_on_selector_all('#calc input[data-hint]', 'els => els.filter((e) => e.offsetParent !== null).map((e) => e.id)'):
                page.focus(f'#{id_}')
                page.wait_for_timeout(30)
                h = page.evaluate(HINT)
                check(bool(h and h['shown'] and h['text']), f'{width}px /{slug}/ #{id_} の説明が出ない')
                check(bool(h and h['one']), f'{width}px /{slug}/ #{id_} の説明「{h and h["text"]}」が1行に入らない')
                page.evaluate('document.activeElement.blur()')
                page.wait_for_timeout(250)
                h = page.evaluate(HINT)
                check(bool(h and not h['shown']), f'{width}px /{slug}/ #{id_} から離れても説明が消えない')
        check(not errors, f'{width}px ページのエラー {errors}')
        page.close()
    browser.close()
print('ALL OK' if not bad else f'NG {bad}')
sys.exit(1 if bad else 0)
