#!/usr/bin/env python3
"""1画面の点検：スマホ（幅390・360、高さ660＝iPhone の Safari で見える高さの目安）で、
ふつうに入力したときの答えが、スクロールしないで見えるかを確かめる。
あわせて、上下にならぶ欄・ボタン・結果の絵が、くっついていない（あいだが6px以上ある）かも見る（10/21 割り勘の合計と人数がくっついていた）。

使い方（Claude の作業環境で。Playwright が要る）:
    python3 -m http.server 8766 --directory dist &   # ビルドした dist を出しておく
    python3 scripts/check-fold.py [http://localhost:8766]
ツールを足したら、下の CASES に「開くページ・入力・答えの場所」を足す。
"""
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8766'
HEIGHT = 660

# slug: (ふつうの入力, 答えの場所)
CASES = {
    'waribiki': (lambda pg: (pg.fill('#price', '1980'), pg.click('.tile[data-pct="30"]')), '.tag-price'),
    'waribiki-ritsu': (lambda pg: (pg.fill('#price', '2000'), pg.fill('#sale', '1700')), '.rieki-bar'),
    'shohizei': (lambda pg: pg.fill('#net', '1980'), '.rc-sum'),
    'waribiki/30': (lambda pg: pg.fill('#price', '2000'), '.tag-price'),
    'waribiki/50': (lambda pg: pg.fill('#sale', '1000'), '.tag-price'),
    'percent': (lambda pg: (pg.fill('#base', '200'), pg.fill('#pct', '15')), '.pic-side .slip-v'),
    'nissu': (lambda pg: pg.fill('#days', '100'), '.pic-side .slip-v'),
    'nenrei': (lambda pg: pg.fill('#birth', '1987-06-15'), '.pic-side .slip-v'),
    'shichigosan': (lambda pg: (pg.fill('#birth-0', '2023-05-12'), pg.click('#sex-0 [data-sex="girl"]')), '.slip-sum'),
    'yakudoshi': (lambda pg: (pg.fill('#year', '1985'), pg.click('#f-sex [data-sex="male"]')), '.slip-sum'),
    'choju': (lambda pg: pg.fill('#year', '1966'), '.slip-sum'),
    'okuizome': (lambda pg: pg.fill('#birth', '2026-10-27'), '.pic-side .slip-v'),
    'shijukunichi': (lambda pg: pg.fill('#death', '2026-10-01'), '.pic-side .slip-v'),
    'dai-nan-youbi': (lambda pg: pg.fill('#date', '2026-10-27'), '.slip-sum'),
    'hensachi': (lambda pg: pg.fill('#dev', '60'), '.slip-sum'),
    'furusato': (lambda pg: pg.fill('#income', '500'), '.doc-sum'),
    'furusato/nenshu': (lambda pg: pg.fill('#target', '50000'), '.doc-sum'),
    'furusato/uchiwake': (lambda pg: (pg.fill('#donation', '50000'), pg.fill('#income', '500')), '.doc-sum'),
    'furusato/fuufu': (lambda pg: (pg.fill('#income1', '600'), pg.fill('#income2', '300'), pg.click('.tile[data-kids="koukou"]')), '.doc-sum'),
    'furusato/jougen': (lambda pg: (pg.fill('#shotokuwari', '235500'), pg.click('.tile[data-rate="0.05"]')), '.doc-sum'),
    'furusato/onestop': (lambda pg: pg.fill('#cities', '3'), '.doc-sum'),
    'furusato/shimekiri': (lambda pg: None, '.doc-sum'),
    'furusato/memo': (lambda pg: (pg.fill('#limit', '57000'), pg.fill('#name-0', 'A市'), pg.fill('#amount-0', '10000')), '.doc-sum'),
    'point': (lambda pg: (pg.fill('#total', '30000'), pg.fill('#shops', '5'), pg.click('.tile[data-cap="7000"]')), '.pt-sum'),
    'point/spu': (lambda pg: (pg.fill('#total', '30000'), pg.click('.spu-chk[data-id="card"]'), pg.click('.spu-chk[data-id="mobile"]')), '.pt-sum'),
    'point/taishou': (lambda pg: (pg.fill('#price', '1280'), pg.fill('#coupon', '300')), '.pt-sum'),
    'point/shikumi': (lambda pg: (pg.fill('#total', '30000'), pg.click('.spu-chk[data-k="card"]'), pg.click('.spu-chk[data-k="marathon"]')), '.pt-sum'),
    'point/amazon': (lambda pg: (pg.fill('#total', '30000'), pg.fill('#apct', '1'), pg.click('.spu-chk[data-k="card"]'), pg.click('.spu-chk[data-k="prime"]')), '.pt-sum'),
    'gakureki': (lambda pg: pg.fill('#birth', '2004-06-10'), '#y-7'),
    'wareki': (lambda pg: pg.fill('#seireki', '1989'), '.pic-side .slip-v'),
    'jikan': (lambda pg: (pg.fill('#h-0', '3'), pg.fill('#m-0', '45'), pg.fill('#h-1', '2')), '.slip-sum'),
    'loan': (lambda pg: (pg.fill('#man', '3000'), pg.fill('#rate', '1'), pg.fill('#years', '35')), '.doc-sum'),
    'bmi': (lambda pg: (pg.fill('#cm', '170'), pg.fill('#kg', '65')), '.bm-scale'),
    'tanka': (lambda pg: (pg.fill('#price-a', '198'), pg.fill('#qty-a', '500'), pg.fill('#price-b', '298'), pg.fill('#qty-b', '1000')), '#tag .tag-price'),
    'matomegai': (lambda pg: (pg.fill('#price-a', '1180'), pg.fill('#qty-a', '350'), pg.select_option('#unit-a', 'ml'), pg.fill('#packs-a', '6'), pg.fill('#price-b', '208'), pg.fill('#qty-b', '350'), pg.select_option('#unit-b', 'ml')), '#tag .tag-price'),
    'warikan': (lambda pg: (pg.fill('#total', '10000'), pg.fill('#people', '3')), '.rc-sum'),
    'warikan-keisha': (lambda pg: (pg.fill('#total', '30000'), pg.fill('#people-0', '1'), pg.fill('#people-1', '4'), pg.fill('#people-2', '2')), '#rc-g-2'),
    'denki-dai': (lambda pg: (pg.click('.tile[data-watt="600"]'), pg.fill('#hours', '8')), '.slip-sum'),
    'kotatsu': (lambda pg: (pg.click('.tile[data-watt="180"]'), pg.fill('#hours', '8')), '.slip-sum'),
    'denki-moufu': (lambda pg: (pg.click('.tile[data-watt="32"]'), pg.fill('#hours', '8')), '.slip-sum'),
    'hot-carpet': (lambda pg: (pg.click('.tile[data-watt="471"]'), pg.fill('#hours', '8')), '.slip-sum'),
    'ceramic-heater': (lambda pg: (pg.click('.tile[data-watt="1170"]'), pg.fill('#hours', '8')), '.slip-sum'),
    'oil-heater': (lambda pg: (pg.click('.tile[data-watt="1500"]'), pg.fill('#hours', '8')), '.slip-sum'),
    'touyu-dai': (lambda pg: (pg.click('.tile[data-lph]'), pg.fill('#hours', '8')), '.pic-side .slip-v'),
    'recipe': (lambda pg: pg.fill('#amt-1', '300'), '#out-1'),
    'kishaku': (lambda pg: (pg.click('.tile[data-ratio="100"]'), pg.fill('#v-total', '500')), '#f-water'),
    'mentsuyu': (lambda pg: (pg.click('.tile[data-ratio="3"]'), pg.fill('#v-total', '100')), '#r-hints'),
    'hyohakuzai': (lambda pg: (pg.click('.tile[data-target="0.05"]'), pg.fill('#v-water', '1000')), '#r-hints'),
    'ekihi': (lambda pg: (pg.click('.tile[data-ratio="1000"]'), pg.fill('#v-water', '2000')), '#f-water'),
    'enbun-noudo': (lambda pg: (pg.fill('#base', '500'), pg.click('.tile[data-pct="3"]')), '.pic-side .slip-v'),
    'seisou-jikan': (lambda pg: (pg.click('.tile[data-speed="370"]'), pg.fill('#area', '1000'), pg.fill('#people', '2')), '.doc-sum'),
    'zangyo-dai': (lambda pg: (pg.fill('#wage', '1200'), pg.fill('#over', '20'), pg.fill('#night', '5')), '.doc-sum'),
    'zangyo-gekkyu': (lambda pg: (pg.fill('#salary', '300000'), pg.fill('#holidays', '120'), pg.fill('#daily', '8'), pg.fill('#over', '20'), pg.fill('#night', '5')), '.doc-sum'),
    'rieki-ritsu': (lambda pg: (pg.fill('#price', '1500'), pg.fill('#cost', '1000')), '.doc-sum'),
    'kakeritsu': (lambda pg: (pg.fill('#jodai', '3000'), pg.click('.tile[data-rate="60"]')), '.doc-sum'),
    'gensen-choshu': (lambda pg: pg.fill('#fee', '100000'), '.gs-total'),
    'seisou-mitsumori': (lambda pg: (pg.click('.tile[data-price="8"]'), pg.click('.tile[data-year="260"]'), pg.fill('#area', '300')), '.doc-sum'),
    'fx-iji-ritsu': (lambda pg: (pg.fill('#rate', '150'), pg.fill('#money', '100000'), pg.fill('#lev', '10')), '#r-big'),
    'fx-losscut': (lambda pg: (pg.click('.tile[data-qty="10000"]'), pg.fill('#money', '100000'), pg.fill('#rate', '150')), '#r-big'),
    'fx-swap': (lambda pg: pg.click('.tile[data-qty="10000"]'), '#r-big'),
    'fx-lot': (lambda pg: (pg.fill('#money', '100000'), pg.fill('#rate', '150'), pg.click('.tile[data-pct="2"]'), pg.fill('#width', '0.2')), '#r-big'),
    'yukyu-fuyo': (lambda pg: pg.fill('#hire', '2024-04-01'), '.doc-sum'),
    'furusato/seido': (lambda pg: pg.click('.tile[data-y="2027"]'), '#r-num'),
    # 返礼品（HENREIHIN=fixture か api でビルドしたときだけページがある。ないときはとばす）。答えは一覧の1件目の1万円あたり
    'furusato/henreihin': (lambda pg: None, '.hr-row .hr-per'),
    'furusato/henreihin/kome': (lambda pg: None, '.hr-row .hr-per'),
    'furusato/henreihin/nichiyouhin': (lambda pg: None, '.hr-row .hr-per'),
}

# 上下にならぶ部品のあいだ（横に重なっている2つで、上の下はしと下の上はしが6pxより近いもの）
TOUCH = """() => {
  const els = [...document.querySelectorAll('#calc .input, #calc .tile, #calc .seg, #calc .step-btn, #calc .tool-btn, #calc .wide-btn, #calc .receipt, #calc .slip, #calc .doc, #calc .chart, #calc .pricetag, #calc .select, #calc .big-select')]
    .filter((e) => e.offsetParent !== null && e.getBoundingClientRect().height > 0);
  const R = els.map((e) => e.getBoundingClientRect());
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = 0; j < els.length; j++) {
    if (i === j || els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    const a = R[i], b = R[j];
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) <= 4) continue;
    const gap = b.top - a.bottom;
    if (gap >= -1 && gap < 6) out.push(`${els[i].id || els[i].className} と ${els[j].id || els[j].className}（${Math.round(gap)}px）`);
  }
  return out;
}"""

bad = 0
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 360):
        page = browser.new_page(viewport={'width': width, 'height': HEIGHT})
        for slug, (act, answer) in CASES.items():
            res = page.goto(f'{BASE}/{slug}/')
            if res.status == 404 and slug.startswith('furusato/henreihin'):
                continue
            act(page)
            # 付箋が剥がれる動き（src/client/notes.js）が終わってから測る
            page.wait_for_timeout(100)
            page.wait_for_function("() => !document.querySelector('.is-peel, .is-stick') && document.getAnimations().every((a) => a.playState !== 'running')", timeout=4000)
            box = page.locator(answer).first.bounding_box()
            bottom = round(box['y'] + box['height'])
            ok = bottom <= HEIGHT
            bad += not ok
            print(('OK  ' if ok else 'NG  ') + f'{width}px /{slug}/ 答え（{answer}）の下 {bottom}px')
            for t in page.evaluate(TOUCH):
                bad += 1
                print(f'NG  {width}px /{slug}/ くっついている：{t}')
        page.close()
    browser.close()
print('ALL OK' if not bad else f'NG {bad}')
sys.exit(1 if bad else 0)
