#!/usr/bin/env python3
"""1画面の点検：スマホ（幅390・360、高さ660＝iPhone の Safari で見える高さの目安）で、
ふつうに入力したときの答えが、スクロールしないで見えるかを確かめる。

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
    'tanka': (lambda pg: (pg.fill('#price-a', '198'), pg.fill('#qty-a', '500'), pg.fill('#price-b', '298'), pg.fill('#qty-b', '1000')), '#tag .tag-price'),
    'matomegai': (lambda pg: (pg.fill('#price-a', '1180'), pg.fill('#qty-a', '350'), pg.select_option('#unit-a', 'ml'), pg.fill('#packs-a', '6'), pg.fill('#price-b', '208'), pg.fill('#qty-b', '350'), pg.select_option('#unit-b', 'ml')), '#tag .tag-price'),
    'recipe': (lambda pg: pg.fill('#amt-1', '300'), '#out-1'),
    'kishaku': (lambda pg: (pg.click('.tile[data-ratio="100"]'), pg.fill('#v-total', '500')), '#f-water'),
    'mentsuyu': (lambda pg: (pg.click('.tile[data-ratio="3"]'), pg.fill('#v-total', '100')), '#r-hints'),
    'hyohakuzai': (lambda pg: (pg.click('.tile[data-target="0.05"]'), pg.fill('#v-water', '1000')), '#r-hints'),
    'ekihi': (lambda pg: (pg.click('.tile[data-ratio="1000"]'), pg.fill('#v-water', '2000')), '#f-water'),
    'seisou-jikan': (lambda pg: (pg.click('.tile[data-speed="370"]'), pg.fill('#area', '1000'), pg.fill('#people', '2')), '#r-foot'),
    'zangyo-dai': (lambda pg: (pg.fill('#wage', '1200'), pg.fill('#over', '20'), pg.fill('#night', '5')), '#r-unit'),
    'zangyo-gekkyu': (lambda pg: (pg.fill('#salary', '300000'), pg.fill('#holidays', '120'), pg.fill('#daily', '8'), pg.fill('#over', '20'), pg.fill('#night', '5')), '#r-unit'),
    'rieki-ritsu': (lambda pg: (pg.fill('#price', '1500'), pg.fill('#cost', '1000')), '#r-foot'),
    'fx-iji-ritsu': (lambda pg: (pg.fill('#rate', '150'), pg.fill('#money', '100000'), pg.fill('#lev', '10')), '#r-need'),
    'fx-losscut': (lambda pg: (pg.click('.tile[data-qty="10000"]'), pg.fill('#money', '100000'), pg.fill('#rate', '150')), '#r-price'),
    'fx-swap': (lambda pg: pg.click('.tile[data-qty="10000"]'), '#r-base'),
}

bad = 0
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 360):
        page = browser.new_page(viewport={'width': width, 'height': HEIGHT})
        for slug, (act, answer) in CASES.items():
            page.goto(f'{BASE}/{slug}/')
            act(page)
            box = page.locator(answer).first.bounding_box()
            bottom = round(box['y'] + box['height'])
            ok = bottom <= HEIGHT
            bad += not ok
            print(('OK  ' if ok else 'NG  ') + f'{width}px /{slug}/ 答え（{answer}）の下 {bottom}px')
        page.close()
    browser.close()
print('ALL OK' if not bad else f'NG {bad}')
sys.exit(1 if bad else 0)
