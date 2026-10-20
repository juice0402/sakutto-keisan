#!/usr/bin/env python3
"""SNSで共有したときの画像（OGP）と、ホーム画面用のアイコンを作る。

使い方（Claude の作業環境で。Pillow と日本語フォント Noto Sans CJK が必要）:
    python3 scripts/make-images.py
できるもの:
    public/og/default.png        トップ・固定ページ用（1200×630）
    public/og/<slug>.png         公開中の各ツール用（1200×630）
    public/icon-192.png / icon-512.png / apple-touch-icon.png   ホーム画面用
ツールを公開したら、このスクリプトを動かして画像もコミットする（全ページ点検が画像の有無を確かめる）。
"""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
FONT_DIR = Path('/usr/share/fonts/opentype/noto')
S = 2  # 2倍で描いて縮小（線をなめらかに）

# src/styles/site.css の色と合わせる（方眼ノート：紺のペン・赤ペン・黄色のマーカー）
INK, PENCIL, RED, MARKER, PAPER = '#1C2F4A', '#5A6779', '#C8323C', '#FFF09A', '#FBFCFD'
GRID = (70, 120, 190, 22)  # 方眼の線
THEMES = {
    'home': dict(bg=PAPER, text=INK, muted=PENCIL, red=RED, marker=MARKER, paper='grid'),
    'seikatsu': dict(bg=PAPER, text=INK, muted=PENCIL, red=RED, marker=MARKER, paper='grid'),
    'shigoto': dict(bg='#F6F6F4', text='#1E2A44', muted='#5D6676', red='#7D2333', marker='#E3E8F1', paper='ruled'),  # 紺の革のシステム手帳（site.css と同じ）
    'fx': dict(bg='#16191E', text='#E9EDF2', muted='#9AA4B1', red='#FFD84D', marker='#4A4220', paper='dots'),
}
CATEGORY_THEME = {'seikatsu': 'seikatsu', 'shigoto': 'shigoto', 'fx': 'fx'}
TAPE = [(226, 202, 150, 215), (238, 220, 178, 215)]  # マスキングテープのしま


def font(weight, size, serif=False):
    fam = 'NotoSerifCJK' if serif else 'NotoSansCJK'
    name = {'regular': 'Regular', 'bold': 'Bold', 'black': 'Black'}[weight]
    return ImageFont.truetype(str(FONT_DIR / f'{fam}-{name}.ttc'), size * S, index=0)  # index 0 = 日本語


def paper(img, kind):
    """紙の模様（方眼・罫線・点）"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    W, H = img.size
    step = 36 * S
    if kind == 'grid':
        for x in range(0, W, step):
            d.line([(x, 0), (x, H)], fill=GRID, width=S)
        for y in range(0, H, step):
            d.line([(0, y), (W, y)], fill=GRID, width=S)
    elif kind == 'ruled':
        for y in range(0, H, 56 * S):
            d.line([(0, y), (W, y)], fill=(70, 120, 190, 34), width=S)
    else:
        for x in range(0, W, step):
            for y in range(0, H, step):
                d.ellipse([x - 2 * S, y - 2 * S, x + 2 * S, y + 2 * S], fill=(255, 255, 255, 24))
    img.alpha_composite(layer)


def logo(img, cx, cy, size):
    """サイトのマーク：「計」の赤いはんこ（public/favicon.svg と同じ形）"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = size * 13.6 / 32
    w = max(2, round(size * 2.4 / 32))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#FFFFFF', outline=RED, width=w)
    f = ImageFont.truetype(str(FONT_DIR / 'NotoSerifCJK-Bold.ttc'), round(size * 0.52), index=0)
    l, t, rr, b = d.textbbox((0, 0), '計', font=f)
    d.text((cx - (l + rr) / 2, cy - (t + b) / 2), '計', font=f, fill=RED)
    img.alpha_composite(layer.rotate(8, center=(cx, cy), resample=Image.BICUBIC))


def tape(img, cx, cy, w, h, angle):
    """マスキングテープ（ななめのしま）"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0 = cx - w / 2, cy - h / 2
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rectangle([x0, y0, x0 + w, y0 + h], fill=255)
    stripes = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(stripes)
    k = 12 * S
    for i, x in enumerate(range(int(x0 - h), int(x0 + w + h), k)):
        sd.polygon([(x, y0 + h), (x + k, y0 + h), (x + k + h, y0), (x + h, y0)], fill=TAPE[i % 2])
    layer.paste(stripes, (0, 0), mask)
    img.alpha_composite(layer.rotate(angle, center=(cx, cy), resample=Image.BICUBIC))


def price_tag(img, cx, top):
    """割引計算の値札（サイトの値札と同じ見た目）"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = 420 * S, 312 * S
    x0, y0 = cx - w // 2, top
    d.line([(cx, y0 - 70 * S), (cx, y0 + 28 * S)], fill='#8D97A5', width=4 * S)  # ひも
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=18 * S, fill='#FFF3BF', outline='#E3CF80', width=3 * S)
    d.ellipse([cx - 13 * S, y0 + 16 * S, cx + 13 * S, y0 + 42 * S], fill='#FFFFFF')  # 穴
    d.line([(cx, y0 - 70 * S), (cx, y0 + 29 * S)], fill='#8D97A5', width=4 * S)
    f_was, f_price, f_yen, f_save = font('bold', 30), font('black', 104), font('black', 44), font('black', 32)
    was = '元の値段 2,000円'
    tw = d.textlength(was, font=f_was)
    d.text((cx - tw / 2, y0 + 62 * S), was, font=f_was, fill='#6B6450')
    sx = cx - tw / 2 + d.textlength('元の値段 ', font=f_was)
    d.line([(sx, y0 + 84 * S), (cx + tw / 2, y0 + 80 * S)], fill='#C8323C', width=4 * S)
    pw, yw = d.textlength('1,400', font=f_price), d.textlength('円', font=f_yen)
    px = cx - (pw + yw + 6 * S) / 2
    d.text((px, y0 + 92 * S), '1,400', font=f_price, fill='#C8323C')
    d.text((px + pw + 6 * S, y0 + 150 * S), '円', font=f_yen, fill='#C8323C')
    save = '600円 おトク！'
    sw = d.textlength(save, font=f_save)
    d.rounded_rectangle([cx - sw / 2 - 22 * S, y0 + 236 * S, cx + sw / 2 + 22 * S, y0 + 288 * S], radius=6 * S, fill='#FFFFFF')
    d.text((cx - sw / 2, y0 + 240 * S), save, font=f_save, fill='#C8323C')
    layer = layer.rotate(3, center=(cx, top), resample=Image.BICUBIC)
    # 赤い丸の「30%OFF」
    b = Image.new('RGBA', img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(b)
    bx, by, r = x0 + w - 20 * S, y0 - 10 * S, 74 * S
    bd.ellipse([bx - r - 6 * S, by - r - 6 * S, bx + r + 6 * S, by + r + 6 * S], fill='#FFFFFF')
    bd.ellipse([bx - r, by - r, bx + r, by + r], fill='#C8323C')
    f1, f2 = font('black', 44), font('black', 24)
    for t, f, dy in (('30%', f1, -40), ('OFF', f2, 14)):
        tw = bd.textlength(t, font=f)
        bd.text((bx - tw / 2, by + dy * S), t, font=f, fill='#FFFFFF')
    b = b.rotate(-10, center=(bx, by), resample=Image.BICUBIC)
    img.alpha_composite(layer)
    img.alpha_composite(b)


def compare_tags(img, cx, top):
    """実質単価：小さな値札を2つ並べて、安いほうに「おトク！」"""
    d = ImageDraw.Draw(img)
    w, h, gap = 230 * S, 230 * S, 36 * S
    tags = [('A', '39.6', '198円 / 500g', False), ('B', '29.8', '298円 / 1kg', True)]
    f_lab, f_base, f_price, f_yen, f_sub = font('black', 26), font('bold', 22), font('black', 64), font('black', 28), font('bold', 20)
    for i, (k, per, sub, win) in enumerate(tags):
        x0 = cx - w - gap // 2 + i * (w + gap)
        y0 = top + 40 * S
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        tx = x0 + w // 2
        # ラベル（A / B がおトク！）
        lab = f'{k} がおトク' if win else k
        lw = ld.textlength(lab, font=f_lab)
        ld.rounded_rectangle([tx - lw / 2 - 16 * S, top - 30 * S, tx + lw / 2 + 16 * S, top + 14 * S], radius=5 * S,
                             fill='#FFFFFF', outline=RED if win else '#B4C1D2', width=3 * S)
        ld.text((tx - lw / 2, top - 28 * S), lab, font=f_lab, fill=RED if win else PENCIL)
        ld.line([(tx, top + 14 * S), (tx, y0 + 26 * S)], fill='#8D97A5', width=3 * S)
        bg, line, text = ('#FFF3BF', '#E3CF80', RED) if win else ('#EEF1F5', '#D3DCE8', '#8D97A5')
        ld.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=16 * S, fill=bg, outline=line, width=3 * S)
        ld.ellipse([tx - 10 * S, y0 + 14 * S, tx + 10 * S, y0 + 34 * S], fill='#FFFFFF')
        for t, f, y, c in (('100gあたり', f_base, 56, '#6B6450'), (sub, f_sub, 184, '#6B6450')):
            tw = ld.textlength(t, font=f)
            ld.text((tx - tw / 2, y0 + y * S), t, font=f, fill=c)
        pw, yw = ld.textlength(per, font=f_price), ld.textlength('円', font=f_yen)
        px = tx - (pw + yw + 4 * S) / 2
        ld.text((px, y0 + 84 * S), per, font=f_price, fill=text)
        ld.text((px + pw + 4 * S, y0 + 120 * S), '円', font=f_yen, fill=text)
        layer = layer.rotate(-2 if win else 2, center=(tx, top), resample=Image.BICUBIC)
        img.alpha_composite(layer)


def plate(d, cx, cy, r, new=False):
    """レシピのお皿（サイトのお皿と同じ見た目）"""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#FFFFFF', outline=RED if new else '#C9D3DF', width=(5 if new else 3) * S)
    ri = r * 16 / 22
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], outline='#E2E8F0', width=3 * S)
    k = r / 22
    d.chord([cx - 12.5 * k, cy - 8 * k, cx + 12.5 * k, cy + 17 * k], 180, 360, fill='#FFC04D')
    d.rounded_rectangle([cx - 12.5 * k, cy + 3.5 * k, cx + 12.5 * k, cy + 6.5 * k], radius=1.5 * k, fill='#FFC04D')
    d.line([(cx - 8 * k, cy - 1.5 * k), (cx - 2.7 * k, cy - 3.2 * k), (cx + 2.7 * k, cy - 1.5 * k), (cx + 8 * k, cy - 3.2 * k)], fill='#C8323C', width=3 * S, joint='curve')


def recipe_memo(img, cx, top):
    """レシピの人数換算：お皿（2人分→4人分）と、マスキングテープでとめた材料のメモ"""
    d = ImageDraw.Draw(img)
    r, gap = 34 * S, 14 * S
    x = cx - (4 * 2 * r + 3 * gap) / 2 + r
    for i in range(4):
        plate(d, x + i * (2 * r + gap), top - 40 * S, r, new=i >= 2)
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    w, h = 400 * S, 300 * S
    x0, y0 = cx - w // 2, top + 30 * S
    ld.rectangle([x0 + 4 * S, y0 + 6 * S, x0 + w + 4 * S, y0 + h + 6 * S], fill=(28, 47, 74, 20))  # 影
    ld.rectangle([x0, y0, x0 + w, y0 + h], fill='#FFFFFF', outline='#D3DCE8', width=2 * S)
    f_title, f_name, f_amt, f_unit = font('black', 34), font('bold', 30), font('black', 40), font('black', 26)
    title = '4人分の材料'
    tw = ld.textlength(title, font=f_title)
    ld.text((cx - tw / 2, y0 + 30 * S), title, font=f_title, fill=INK)
    rows = [('鶏もも肉', '', '600g'), ('玉ねぎ', '', '2個'), ('しょうゆ', '大さじ', '4')]
    for i, (name, pre, amt) in enumerate(rows):
        y = y0 + (96 + i * 64) * S
        ld.text((x0 + 30 * S, y + 6 * S), name, font=f_name, fill=INK)
        aw = ld.textlength(amt, font=f_amt)
        pw = ld.textlength(pre, font=f_unit) if pre else 0
        ax = x0 + w - 30 * S - aw
        ld.text((ax, y), amt, font=f_amt, fill=RED)
        if pre:
            ld.text((ax - pw - 2 * S, y + 12 * S), pre, font=f_unit, fill=RED)
        if i < len(rows) - 1:
            ld.line([(x0 + 24 * S, y + 58 * S), (x0 + w - 24 * S, y + 58 * S)], fill='#D3DCE8', width=2 * S)
    layer = layer.rotate(-2, center=(cx, y0), resample=Image.BICUBIC)
    img.alpha_composite(layer)
    tape(img, cx, y0, 150 * S, 34 * S, 3)


def dilute_bottle(img, cx, top, label='10倍', rows=(('原液', '100ml'), ('水', '900ml')), conc_color='#F3B04A', conc_key='#F0A63A', share=0.1):
    """希釈率：ボトルに原液（黄色）と水（水色）＋「10倍」のラベル、横に原液と水の量（使いみち別のページは中身を変える）"""
    d = ImageDraw.Draw(img)
    bx = cx - 150 * S  # ボトルのまん中
    bw, bh = 150 * S, 250 * S
    x0, y0 = bx - bw // 2, top + 40 * S
    d.rounded_rectangle([bx - 26 * S, top - 20 * S, bx + 26 * S, top + 4 * S], radius=5 * S, fill=INK)  # ふた
    d.rectangle([bx - 20 * S, top + 4 * S, bx + 20 * S, y0 + 4 * S], fill='#FFFFFF', outline='#A9C8DE', width=4 * S)
    # 中身（下の1割が原液・その上が水）
    body = Image.new('L', img.size, 0)
    ImageDraw.Draw(body).rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=38 * S, fill=255)
    liq = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(liq)
    ld.rectangle([x0, y0, x0 + bw, y0 + bh], fill='#FFFFFF')
    full = y0 + bh * 0.16
    conc = y0 + bh - bh * 0.84 * share - 18 * S
    ld.rectangle([x0, full, x0 + bw, conc], fill='#AED5F0')
    ld.rectangle([x0, conc, x0 + bw, y0 + bh], fill=conc_color)
    img.paste(liq, (0, 0), body)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=38 * S, outline='#A9C8DE', width=5 * S)
    # ラベル
    f_lab = font('black', 40)
    while d.textlength(label, font=f_lab) > bw - 40 * S:
        f_lab = font('black', f_lab.size // S - 2)
    lw = d.textlength(label, font=f_lab)
    d.rectangle([x0 + 16 * S, y0 + 92 * S, x0 + bw - 16 * S, y0 + 150 * S], fill='#FFFFFF', outline='#D3DCE8', width=2 * S)
    d.text((bx - lw / 2, y0 + 96 * S), label, font=f_lab, fill=INK)
    # 横の数字
    f_k, f_v = font('bold', 30), font('black', 58)
    for i, ((k, v), color) in enumerate(zip(rows, (conc_key, '#AED5F0'))):
        y = top + 60 * S + i * 120 * S
        tx = cx - 30 * S
        d.rectangle([tx, y + 12 * S, tx + 26 * S, y + 38 * S], fill=color)
        d.text((tx + 38 * S, y + 4 * S), k, font=f_k, fill=INK)
        d.text((tx, y + 46 * S), v, font=f_v, fill=RED)


FX_INK, FX_GOLD, FX_MUTED, FX_RULE, FX_DOWN = '#E8E4DA', '#C9A45C', '#A19E95', '#4A4D53', '#F85149'


def fx_meter(d, gx, gy, ratio, label=None):
    """半円のメーター（赤いところが100％より下。500％まで）。label があれば下に維持率"""
    import math
    r, w = 112 * S, 22 * S
    box = [gx - r, gy - r, gx + r, gy + r]
    d.arc(box, 180, 360, fill=FX_RULE, width=w)
    d.arc(box, 180, 180 + 36, fill=FX_DOWN, width=w)  # 0〜100％（500％までのうち）
    a = math.radians(180 + 180 * min(ratio, 500) / 500)
    d.line([(gx, gy), (gx + (r - 26 * S) * math.cos(a), gy + (r - 26 * S) * math.sin(a))], fill=FX_INK, width=7 * S)
    d.ellipse([gx - 10 * S, gy - 10 * S, gx + 10 * S, gy + 10 * S], fill=FX_INK)
    if label:
        f_k, f_v = font('bold', 26), font('black', 40)
        for t, f, y, c in (('維持率', f_k, gy + 22 * S, FX_MUTED), (label, f_v, gy + 54 * S, FX_INK)):
            tw = d.textlength(t, font=f)
            d.text((gx - tw / 2, y), t, font=f, fill=c)


def fx_gauge(img, cx, top):
    """証拠金維持率：メーターと「レバレッジ10倍で 250％」"""
    d = ImageDraw.Draw(img)
    fx_meter(d, cx - 118 * S, top + 210 * S, 250)
    tx = cx + 22 * S
    d.text((tx, top + 70 * S), 'レバレッジ10倍で', font=font('bold', 28), fill=FX_MUTED)
    d.text((tx, top + 110 * S), '250', font=font('black', 84), fill=FX_GOLD)
    d.text((tx + d.textlength('250', font=font('black', 84)) + 8 * S, top + 152 * S), '％', font=font('black', 40), fill=FX_INK)


def fx_cut(img, cx, top):
    """ロスカット：メーター（維持率）と「ロスカットまで、あと40,000円の損」"""
    d = ImageDraw.Draw(img)
    fx_meter(d, cx - 118 * S, top + 190 * S, 166.7, '166.7%')
    tx = cx + 22 * S
    d.text((tx, top + 72 * S), 'ロスカットまで、あと', font=font('bold', 26), fill=FX_MUTED)
    d.text((tx, top + 110 * S), '40,000', font=font('black', 72), fill=FX_GOLD)
    d.text((tx, top + 196 * S), '円の損', font=font('black', 34), fill=FX_INK)


def fx_swap_bars(img, cx, top):
    """スワップ：1年でたまっていく棒グラフ＋「1日に 約123円」（計算式の例と同じ数字）"""
    d = ImageDraw.Draw(img)
    x0, x1, base = cx - 236 * S, cx + 266 * S, top + 300 * S
    d.text((x0, top + 10 * S), '1日に', font=font('bold', 28), fill=FX_MUTED)
    f_big = font('black', 72)
    d.text((x0, top + 44 * S), '約123', font=f_big, fill=FX_GOLD)
    d.text((x0 + d.textlength('約123', font=f_big) + 8 * S, top + 80 * S), '円 もらえる', font=font('black', 34), fill=FX_INK)
    n, gap = 12, 8 * S
    bw = ((x1 - x0) - gap * (n - 1)) / n
    for i in range(n):
        bh = 120 * S * (i + 1) / n
        bx = x0 + i * (bw + gap)
        d.rectangle([bx, base - bh, bx + bw, base], fill=FX_GOLD)
    d.line([(x0, base + 2 * S), (x1, base + 2 * S)], fill=FX_RULE, width=3 * S)


def rieki_bar(img, cx, top):
    """利益率：売値の帯を原価（灰色）と利益（ボルドー）に分けた絵＋「利益率 33.3%」（ページの計算例と同じ数字）"""
    t = THEMES['shigoto']
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 236 * S, cx + 266 * S
    d.text((x0, top + 20 * S), '利益率', font=font('bold', 28), fill=t['muted'])
    f_big = font('black', 84)
    d.text((x0, top + 56 * S), '33.3', font=f_big, fill=t['red'])
    d.text((x0 + d.textlength('33.3', font=f_big) + 8 * S, top + 100 * S), '%', font=font('black', 40), fill=t['text'])
    y0, h = top + 200 * S, 64 * S
    split = x0 + (x1 - x0) * 2 / 3
    d.rectangle([x0, y0, split, y0 + h], fill='#C9CDD4')
    d.rectangle([split, y0, x1, y0 + h], fill=t['red'])
    d.rectangle([x0, y0, x1, y0 + h], outline=t['muted'], width=2 * S)
    f = font('bold', 26)
    d.text((x0, y0 + h + 14 * S), '原価 1,000円', font=f, fill=t['muted'])
    lab = '利益 500円'
    d.text((x1 - d.textlength(lab, font=f), y0 + h + 14 * S), lab, font=f, fill=t['red'])


def seisou_floor(img, cx, top):
    """清掃の作業時間：床を3人で分けた帯＋「3時間20分」（ページの計算例：1人1時間に100㎡で、1,000㎡を3人）"""
    t = THEMES['shigoto']
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 236 * S, cx + 266 * S
    d.text((x0, top + 20 * S), 'かかる時間', font=font('bold', 28), fill=t['muted'])
    d.text((x0, top + 56 * S), '3時間20分', font=font('black', 72), fill=t['red'])
    y0, h, n, gap = top + 190 * S, 88 * S, 3, 6 * S
    d.rectangle([x0, y0, x1, y0 + h], outline=t['muted'], width=2 * S)
    w = ((x1 - x0) - 2 * gap - gap * (n - 1)) / n
    for i in range(n):
        bx = x0 + gap + i * (w + gap)
        d.rectangle([bx, y0 + gap, bx + w, y0 + h - gap], fill=t['red'] if i % 2 == 0 else '#B9848D')
    f = font('bold', 26)
    d.text((x0, y0 + h + 14 * S), '1人あたり 333.3㎡', font=f, fill=t['muted'])
    lab = '3人・1,000㎡'
    d.text((x1 - d.textlength(lab, font=f), y0 + h + 14 * S), lab, font=f, fill=t['muted'])


def zangyo_rows(d, t, x0, x1, y, rows):
    """残業代：明細書のような行（項目・時間 × 1時間あたり・金額）と点線"""
    f, fs = font('bold', 28), font('bold', 22)
    for name, calc, yen in rows:
        d.text((x0 + 4 * S, y + 14 * S), name, font=f, fill=t['text'])
        d.text((x0 + 4 * S + d.textlength(name, font=f) + 14 * S, y + 21 * S), calc, font=fs, fill=t['muted'])
        d.text((x1 - d.textlength(yen, font=f) - 4 * S, y + 14 * S), yen, font=f, fill=t['text'])
        y += 64 * S
        for xx in range(x0, x1, 10 * S):
            d.line([(xx, y), (xx + 4 * S, y)], fill=t['muted'], width=2 * S)


def zangyo_big(d, t, x0, top, total):
    d.text((x0, top + 20 * S), '残業代', font=font('bold', 28), fill=t['muted'])
    f_big = font('black', 84)
    d.text((x0, top + 56 * S), total, font=f_big, fill=t['red'])
    d.text((x0 + d.textlength(total, font=f_big) + 8 * S, top + 100 * S), '円', font=font('black', 40), fill=t['text'])


def zangyo_split(img, cx, top):
    """残業代の計算：大きな金額と、時給の分と割増の分に分けた帯と明細（ページの計算例：時給1,200円で残業20時間）"""
    t = THEMES['shigoto']
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 236 * S, cx + 266 * S
    zangyo_big(d, t, x0, top, '30,000')
    y0, h = top + 190 * S, 44 * S
    split = x0 + (x1 - x0) * 0.8
    d.rectangle([x0, y0, split, y0 + h], fill='#C9CDD4')
    d.rectangle([split, y0, x1, y0 + h], fill=t['red'])
    d.rectangle([x0, y0, x1, y0 + h], outline=t['muted'], width=2 * S)
    f = font('bold', 24)
    d.text((x0, y0 + h + 10 * S), '時給の分 24,000円', font=f, fill=t['muted'])
    lab = '割増の分 6,000円'
    d.text((x1 - d.textlength(lab, font=f), y0 + h + 10 * S), lab, font=f, fill=t['muted'])
    y = y0 + h + 52 * S
    d.line([(x0, y), (x1, y)], fill=t['text'], width=3 * S)
    zangyo_rows(d, t, x0, x1, y, (('残業', '20時間 × 1,500円', '30,000円'),))


def zangyo_year(img, cx, top):
    """月給の残業代の計算：大きな金額と明細、1年を出勤と休日に分けた帯（ページの計算例：月給30万円・年間休日120日・1日8時間で、残業20時間）"""
    t = THEMES['shigoto']
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 236 * S, cx + 266 * S
    zangyo_big(d, t, x0, top, '45,920')
    y = top + 190 * S
    d.line([(x0, y), (x1, y)], fill=t['text'], width=3 * S)
    zangyo_rows(d, t, x0, x1, y, (('残業', '20時間 × 2,296円', '45,920円'),))
    y0, h = y + 64 * S + 18 * S, 36 * S
    work = x0 + (x1 - x0) * 245 / 365
    d.rectangle([x0, y0, work, y0 + h], fill='#5A6273')
    for xx in range(int(work) - h, x1, 12 * S):
        d.line([(max(xx, work), y0 + max(0, work - xx)), (min(xx + h, x1), y0 + h - max(0, xx + h - x1))], fill='#B9BDC6', width=3 * S)
    d.rectangle([x0, y0, x1, y0 + h], outline=t['muted'], width=2 * S)
    f = font('bold', 24)
    d.text((x0, y0 + h + 10 * S), '出勤 245日', font=f, fill=t['muted'])
    lab = '休日 120日'
    d.text((x1 - d.textlength(lab, font=f), y0 + h + 10 * S), lab, font=f, fill=t['muted'])


VISUALS = {
    'waribiki': price_tag, 'tanka': compare_tags, 'recipe': recipe_memo, 'kishaku': dilute_bottle,
    'fx-iji-ritsu': fx_gauge, 'fx-losscut': fx_cut, 'fx-swap': fx_swap_bars,
    'rieki-ritsu': rieki_bar, 'seisou-jikan': seisou_floor, 'zangyo-dai': zangyo_split, 'zangyo-gekkyu': zangyo_year,
    # 希釈率の使いみち別
    'mentsuyu': lambda img, cx, top: dilute_bottle(img, cx, top, '1：2', (('つゆ', '100ml'), ('水', '200ml')), '#9A6232', '#8A5426', 1 / 3),
    'hyohakuzai': lambda img, cx, top: dilute_bottle(img, cx, top, '0.05%', (('漂白剤', '8.4ml'), ('水', '1L')), share=0.02),
    'ekihi': lambda img, cx, top: dilute_bottle(img, cx, top, '1000倍', (('原液', '1ml'), ('水', '1L')), share=0.02),
}


def wrap2(d, text, f, max_w):
    if d.textlength(text, font=f) <= max_w:
        return [text]
    best = None
    for i in range(1, len(text)):
        if text[i - 1] not in '、のとでをはがにや' or text[i] in '、。':
            continue
        a, b = text[:i], text[i:]
        wa, wb = d.textlength(a, font=f), d.textlength(b, font=f)
        if wa <= max_w and wb <= max_w and (best is None or abs(wa - wb) < best[0]):
            best = (abs(wa - wb), [a, b])
    if best:
        return best[1]
    lines, cur = [], ''
    for ch in text:
        if d.textlength(cur + ch, font=f) > max_w:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    return lines + [cur]


def og(path, title, sub, theme, slug=None):
    t = THEMES[theme]
    W, H = 1200 * S, 630 * S
    img = Image.new('RGBA', (W, H), t['bg'])
    paper(img, t['paper'])
    d = ImageDraw.Draw(img)
    has_visual = slug in VISUALS
    left = 80 * S
    # 上：はんこのロゴとサイト名、その下に紺の線
    logo(img, left + 32 * S, 92 * S, 64 * S)
    d.text((left + 84 * S, 66 * S), 'サクッと計算', font=font('black', 40), fill=t['text'])
    d.line([(0, 150 * S), (W, 150 * S)], fill=t['text'], width=3 * S)
    # 題：黄色のマーカーを引いたように
    max_w = (540 if has_visual else 1040) * S
    size = 100
    while '\n' not in title and d.textlength(title, font=font('black', size)) > max_w and size > 56:
        size -= 4
    titles = [title]
    if '\n' in title or d.textlength(title, font=font('black', size)) > max_w:
        # 56 でも入らない長い題は2行に（tools.mjs の ogTitle の改行で切る。なければ助詞のあと）
        titles = title.split('\n')[:2] if '\n' in title else wrap2(d, title, font('black', 64), max_w)[:2]
        size = 64
        while max(d.textlength(x, font=font('black', size)) for x in titles) > max_w and size > 40:
            size -= 4
    f_title = font('black', size)
    ty = 214 * S
    step = round(size * 1.25)
    for i, line in enumerate(titles):
        y = ty + i * step * S
        tw = d.textlength(line, font=f_title)
        d.rectangle([left - 6 * S, y + size * S * 0.78, left + tw + 6 * S, y + size * S * 1.32], fill=t['marker'])
        d.text((left, y), line, font=f_title, fill=t['text'])
    # 説明は2行まで。折り返すときは「、」や助詞のあとで、2行の長さがなるべくそろう所で切る
    f_sub = font('bold', 34 if has_visual else 38)
    lines = wrap2(d, sub, f_sub, max_w)
    top_sub = ty // S + size + (len(titles) - 1) * step + (30 if len(titles) > 1 else 44)
    for i, line in enumerate(lines[:2]):
        d.text((left, (top_sub + i * 56) * S), line, font=f_sub, fill=t['muted'])
    d.text((left, 540 * S), 'sakutto-keisan.com', font=font('bold', 30), fill=t['muted'])
    if has_visual:
        VISUALS[slug](img, 890 * S, 240 * S)
    # 色数をへらして軽く（平らな絵なので見た目はほぼ変わらない）
    img.convert('RGB').resize((1200, 630), Image.LANCZOS).quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    print('wrote', path.relative_to(ROOT))


def icon(path, px):
    """ホーム画面用：方眼の紙に赤いはんこ（マスクで丸く切られても欠けないよう、はんこは中央 64%）"""
    big = px * 4
    img = Image.new('RGBA', (big, big), PAPER)
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    step = big / 8
    for i in range(1, 8):
        d.line([(i * step, 0), (i * step, big)], fill=(70, 120, 190, 36), width=max(1, big // 160))
        d.line([(0, i * step), (big, i * step)], fill=(70, 120, 190, 36), width=max(1, big // 160))
    img.alpha_composite(layer)
    logo(img, big / 2, big / 2, big * 0.64)
    # 色数をへらして軽く（方眼の線とはんこだけなので、64色で見た目は変わらない）
    img.convert('RGB').resize((px, px), Image.LANCZOS).quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    print('wrote', path.relative_to(ROOT))


def main():
    tools = json.loads(subprocess.check_output(
        ['node', '--input-type=module', '-e',
         "import('./src/tools.mjs').then((m) => console.log(JSON.stringify(m.TOOLS)))"], cwd=ROOT))
    (PUBLIC / 'og').mkdir(parents=True, exist_ok=True)
    og(PUBLIC / 'og' / 'default.png', '生活の計算ツール', '割引後の値段、100gあたりの値段、レシピの分量、薄め方を計算できる無料のツール集', 'home')
    for t in tools:
        if t.get('published'):
            title = t.get('ogTitle') or t['name'].split('（')[0]
            og(PUBLIC / 'og' / f"{t['slug']}.png", title, t['short'], CATEGORY_THEME.get(t['category'], 'home'), t['slug'])
    icon(PUBLIC / 'icon-192.png', 192)
    icon(PUBLIC / 'icon-512.png', 512)
    icon(PUBLIC / 'apple-touch-icon.png', 180)


if __name__ == '__main__':
    main()
