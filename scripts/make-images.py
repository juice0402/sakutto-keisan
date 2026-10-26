#!/usr/bin/env python3
"""SNSで共有したときの画像（OGP）と、ホーム画面用のアイコンを作る。

使い方（Claude の作業環境で。Pillow と日本語フォント Noto Sans CJK が必要）:
    python3 scripts/make-images.py
できるもの:
    public/og/default.jpg        トップ・固定ページ用（1200×630）。サイトの決めの1枚（scripts/art/ogp-kirigami.jpg）に字をのせる
    public/og/<slug>.png         公開中の各ツール用（1200×630）
    public/icon-192.png / icon-512.png / apple-touch-icon.png   ホーム画面用
    public/favicon.ico   ブラウザのタブ用（SVG を使わないブラウザ・検索結果）
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
SHEET = '#F3F1EA'  # 結果の紙（レシート・書類・お知らせ・メモ）。site.css の --sheet と同じ
GRID = (70, 120, 190, 22)  # 方眼の線
THEMES = {
    'home': dict(bg=PAPER, text=INK, muted=PENCIL, red=RED, marker=MARKER, paper='grid'),
    'seikatsu': dict(bg=PAPER, text=INK, muted=PENCIL, red=RED, marker=MARKER, paper='grid'),
    'shigoto': dict(bg='#F6F6F4', text='#1E2A44', muted='#5D6676', red='#7D2333', marker='#E3E8F1', paper='ruled'),  # 紺の革のシステム手帳（site.css と同じ）
    'fx': dict(bg='#16191E', text='#E9EDF2', muted='#9AA4B1', red='#FFD84D', marker='#4A4220', paper='dots'),
}
CATEGORY_THEME = {'seikatsu': 'seikatsu', 'shigoto': 'shigoto', 'furusato': 'shigoto', 'point': 'seikatsu', 'fx': 'fx'}
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


def price_tag(img, cx, top, was='元の値段 2,000円', price='1,400', unit='円', save='600円 おトク！', badge='30%'):
    """割引計算の値札（サイトの値札と同じ見た目）。割引率の計算は大きな数字が「15%オフ」で、シールなし"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = 420 * S, 312 * S
    x0, y0 = cx - w // 2, top
    d.line([(cx, y0 - 70 * S), (cx, y0 + 28 * S)], fill='#8D97A5', width=4 * S)  # ひも
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=18 * S, fill='#FFF3BF', outline='#E3CF80', width=3 * S)
    d.ellipse([cx - 13 * S, y0 + 16 * S, cx + 13 * S, y0 + 42 * S], fill='#FFFFFF')  # 穴
    d.line([(cx, y0 - 70 * S), (cx, y0 + 29 * S)], fill='#8D97A5', width=4 * S)
    f_was, f_price, f_yen, f_save = font('bold', 30), font('black', 104), font('black', 44), font('black', 32)
    tw = d.textlength(was, font=f_was)
    d.text((cx - tw / 2, y0 + 62 * S), was, font=f_was, fill='#6B6450')
    sx = cx - tw / 2 + d.textlength('元の値段 ', font=f_was)
    d.line([(sx, y0 + 84 * S), (cx + tw / 2, y0 + 80 * S)], fill='#C8323C', width=4 * S)
    pw, yw = d.textlength(price, font=f_price), d.textlength(unit, font=f_yen)
    px = cx - (pw + yw + 6 * S) / 2
    d.text((px, y0 + 92 * S), price, font=f_price, fill='#C8323C')
    d.text((px + pw + 6 * S, y0 + 150 * S), unit, font=f_yen, fill='#C8323C')
    sw = d.textlength(save, font=f_save)
    d.rounded_rectangle([cx - sw / 2 - 22 * S, y0 + 236 * S, cx + sw / 2 + 22 * S, y0 + 288 * S], radius=6 * S, fill='#FFFFFF')
    d.text((cx - sw / 2, y0 + 240 * S), save, font=f_save, fill='#C8323C')
    layer = layer.rotate(3, center=(cx, top), resample=Image.BICUBIC)
    if not badge:
        img.alpha_composite(layer)
        return
    # 赤い丸の「30%OFF」
    b = Image.new('RGBA', img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(b)
    bx, by, r = x0 + w - 20 * S, y0 - 10 * S, 74 * S
    bd.ellipse([bx - r - 6 * S, by - r - 6 * S, bx + r + 6 * S, by + r + 6 * S], fill='#FFFFFF')
    bd.ellipse([bx - r, by - r, bx + r, by + r], fill='#C8323C')
    f1, f2 = font('black', 44), font('black', 24)
    for t, f, dy in ((badge, f1, -40), ('OFF', f2, 14)):
        tw = bd.textlength(t, font=f)
        bd.text((bx - tw / 2, by + dy * S), t, font=f, fill='#FFFFFF')
    b = b.rotate(-10, center=(bx, by), resample=Image.BICUBIC)
    img.alpha_composite(layer)
    img.alpha_composite(b)


def compare_tags(img, cx, top, tags=(('A', '39.6', '198円 / 500g', False), ('B', '29.8', '298円 / 1kg', True)), base='100gあたり'):
    """実質単価：小さな値札を2つ並べて、安いほうに「おトク！」"""
    d = ImageDraw.Draw(img)
    w, h, gap = 230 * S, 230 * S, 36 * S
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
        for t, f, y, c in ((base, f_base, 56, '#6B6450'), (sub, f_sub, 184, '#6B6450')):
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
    ld.rectangle([x0, y0, x0 + w, y0 + h], fill=SHEET, outline='#D3DCE8', width=2 * S)
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


FX_INK, FX_GOLD, FX_MUTED, FX_RULE, FX_DOWN, FX_UP = '#E8E4DA', '#C9A45C', '#A19E95', '#4A4D53', '#F85149', '#3FB950'
FX_PANEL, FX_BAR, FX_GRID, FX_LINE = '#111418', '#171A1F', '#2D3239', '#23272E'
STAMP = '#C8323C'  # はんこの朱色（ロゴと同じ）


def spaced(d, cx, y, text, f, fill, gap):
    """字と字のあいだをあけて、まん中にそろえて書く（書類の題）"""
    widths = [d.textlength(ch, font=f) for ch in text]
    x = cx - (sum(widths) + gap * (len(text) - 1)) / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=f, fill=fill)
        x += w + gap


def doc_sheet(img, cx, top, title, sum_k, sum_v, unit, head, rows, stamp=None, extra=None):
    """お仕事の書類（サイトの結果と同じ見た目）：題・いちばん大きな数字と二重線・明細の表。stamp は（上の字, 下の字）"""
    t = THEMES['shigoto']
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 236 * S, cx + 266 * S
    y0, y1 = top - 30 * S, top + 336 * S
    d.rectangle([x0 - 7 * S, y0 - 7 * S, x1 + 7 * S, y1 + 7 * S], outline='#B9C0CC', width=2 * S)
    d.rectangle([x0, y0, x1, y1], fill=SHEET, outline=t['text'], width=2 * S)
    spaced(d, (x0 + x1) / 2, y0 + 18 * S, title, font('bold', 30, serif=True), t['text'], 14 * S)
    # いちばん大きな数字（右）と名前（左）、下に二重線
    ys = y0 + 70 * S
    f_k, f_u = font('bold', 28), font('black', 32)
    right = x1 - 22 * S - (128 * S if stamp else 0)
    uw = d.textlength(unit, font=f_u) if unit else 0
    room = right - uw - 6 * S - (x0 + 22 * S + d.textlength(sum_k, font=f_k) + 18 * S)
    size = 74
    while d.textlength(sum_v, font=font('black', size)) > room and size > 40:
        size -= 2  # 「3時間20分」のように長い答えは、名前とかさならない大きさに
    f_v = font('black', size)
    vw = d.textlength(sum_v, font=f_v)
    if unit:
        d.text((right - uw, ys + 46 * S), unit, font=f_u, fill=t['text'])
    d.text((right - uw - 6 * S - vw, ys + (74 - size) * S * 0.8), sum_v, font=f_v, fill=t['red'])
    d.text((x0 + 22 * S, ys + 48 * S), sum_k, font=f_k, fill=t['text'])
    for dy in (104, 112):
        d.line([(x0 + 18 * S, ys + dy * S), (x1 - 18 * S, ys + dy * S)], fill=t['text'], width=2 * S)
    if stamp:
        sx, sy, r = x1 - 70 * S, ys + 46 * S, 54 * S
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse([sx - r, sy - r, sx + r, sy + r], outline=STAMP, width=5 * S)
        for txt, f, dy in ((stamp[0], font('black', 18), -28), (stamp[1], font('black', 25), -2)):
            tw = ld.textlength(txt, font=f)
            ld.text((sx - tw / 2, sy + dy * S), txt, font=f, fill=STAMP)
        img.alpha_composite(layer.rotate(12, center=(sx, sy), resample=Image.BICUBIC))
    # 明細の表
    ty = ys + 128 * S
    if extra:
        extra(d, x0 + 18 * S, x1 - 18 * S, ty)
        ty += 44 * S
    tx0, tx1 = x0 + 18 * S, x1 - 18 * S
    n = len(head)
    widths = [0.34] + [(1 - 0.34) / (n - 1)] * (n - 1)
    xs = [tx0]
    for w in widths:
        xs.append(xs[-1] + (tx1 - tx0) * w)
    rh, hh = 40 * S, 30 * S
    d.rectangle([tx0, ty, tx1, ty + hh], fill='#EEF1F6')
    f_h, f_c = font('bold', 19), font('bold', 23)
    for i, h in enumerate(head):
        tw = d.textlength(h, font=f_h)
        d.text(((xs[i] + xs[i + 1]) / 2 - tw / 2, ty + 3 * S), h, font=f_h, fill=t['muted'])
    for j, row in enumerate(rows):
        yy = ty + hh + j * rh
        for i, c in enumerate(row):
            red = isinstance(c, tuple)
            c = c[0] if red else c
            tw = d.textlength(c, font=f_c)
            x = xs[i] + 10 * S if i == 0 else xs[i + 1] - 10 * S - tw
            d.text((x, yy + 6 * S), c, font=f_c, fill=t['red'] if red else (t['muted'] if c == '—' else t['text']))
    bottom = ty + hh + rh * len(rows)
    for x in xs:
        d.line([(x, ty), (x, bottom)], fill=t['text'], width=2 * S)
    for yy in [ty, ty + hh] + [ty + hh + rh * (j + 1) for j in range(len(rows))]:
        d.line([(tx0, yy), (tx1, yy)], fill=t['text'], width=2 * S)
    return d, bottom


def zangyo_doc(img, cx, top):
    """残業代の計算：残業代明細書（ページの計算例：時給1,200円で残業20時間・深夜5時間）"""
    doc_sheet(img, cx, top, '残業代明細書', '残業代', '31,500', '円', ('項目', '時間', '単価', '金額'),
              (('時間外', '20時間', '1,500', '30,000'), ('深夜割増', '5時間', '300', '1,500'), ('休日出勤', '—', '1,620', '—')))


def zangyo_gekkyu_doc(img, cx, top):
    """月給の残業代の計算：残業代明細書と、1年を出勤と休日に分けた帯（月給30万円・年間休日120日・1日8時間で残業20時間）"""
    t = THEMES['shigoto']

    def year(d, x0, x1, y):
        f = font('bold', 20)
        d.text((x0, y), '出勤 245日', font=f, fill=t['muted'])
        lab = '時給 1,837円'
        d.text((x1 - d.textlength(lab, font=f), y), lab, font=f, fill=t['muted'])
        by = y + 28 * S
        work = x0 + (x1 - x0) * 245 / 365
        d.rectangle([x0, by, work, by + 10 * S], fill='#5A6273')
        d.rectangle([x0, by, x1, by + 10 * S], outline='#B9C0CC', width=2 * S)

    doc_sheet(img, cx, top, '残業代明細書', '残業代', '45,920', '円', ('項目', '時間', '単価', '金額'),
              (('時間外', '20時間', '2,296', '45,920'), ('深夜割増', '—', '459', '—')), extra=year)


def rieki_doc(img, cx, top):
    """利益率の計算：利益計算書と粗利率のはんこ（ページの計算例：売値1,500円・原価1,000円）"""
    doc_sheet(img, cx, top, '利益計算書', '利益', '500', '円', ('項目', '金額', '売値に対して'),
              (('売値', '1,500', '100%'), ('原価', '1,000', '66.6%'), ('利益', '500', ('33.3%',))), stamp=('粗利率', '33.3%'))


def kakeritsu_doc(img, cx, top):
    """掛け率の計算：納品書と何掛けのはんこ、上代の帯を下代と粗利に分けた絵（ページの計算例：上代3,000円の6掛け）"""
    t = THEMES['shigoto']
    d, bottom = doc_sheet(img, cx, top, '納品書', '下代', '1,800', '円', ('上代', '掛率', '下代', '粗利'),
                          (('3,000', '60%', ('1,800',), '1,200'),), stamp=('掛け率', '6掛け'))
    x0, x1 = cx - 218 * S, cx + 248 * S
    y0, h = bottom + 22 * S, 30 * S
    mid = x0 + (x1 - x0) * 0.6
    d.rectangle([x0, y0, mid, y0 + h], fill='#C9CDD5')
    d.rectangle([mid, y0, x1, y0 + h], fill=t['red'])
    d.rectangle([x0, y0, x1, y0 + h], outline='#B9C0CC', width=2 * S)
    f = font('bold', 20)
    d.text((x0, y0 + h + 6 * S), '下代 1,800円', font=f, fill=t['muted'])
    lab = '粗利 1,200円（40%）'
    d.text((x1 - d.textlength(lab, font=f), y0 + h + 6 * S), lab, font=f, fill=t['muted'])


def seisou_doc(img, cx, top):
    """清掃の作業時間：作業指示書と、床を3人で分けた図（ページの計算例：1人1時間に100㎡で、1,000㎡を3人）"""
    t = THEMES['shigoto']
    d, bottom = doc_sheet(img, cx, top, '作業指示書', 'かかる時間', '3時間20分', '', ('面積', '人数', '1人あたり'),
                          (('1,000㎡', '3人', '333.3㎡'),))
    x0, x1 = cx - 218 * S, cx + 248 * S
    y0, h, n, gap = bottom + 16 * S, 50 * S, 3, 5 * S
    d.rectangle([x0, y0, x1, y0 + h], outline=t['text'], width=3 * S)
    w = ((x1 - x0) - 2 * gap - gap * (n - 1)) / n
    for i in range(n):
        bx = x0 + gap + i * (w + gap)
        d.rectangle([bx, y0 + gap, bx + w, y0 + h - gap], fill=t['red'] if i % 2 == 0 else '#B9848D')
        num = str(i + 1)
        f = font('black', 22)
        d.text((bx + w / 2 - d.textlength(num, font=f) / 2, y0 + 10 * S), num, font=f, fill='#FFFFFF')


def mitsumori_doc(img, cx, top):
    """清掃の見積もり計算：見積書（ページの計算例：300㎡を㎡単価8円で週5回）。1年の帯は書類に入らないので描かない"""
    doc_sheet(img, cx, top, '見積書', '1か月の料金', '52,000', '円', ('期間', '回数', '料金'),
              (('1回', '1回', '2,400'), ('1か月', '約21.7回', ('52,000',)), ('1年', '260回', '624,000')))


def fx_panel(img, cx, top, bar_l, bar_r, h=330):
    """FX：トレードアプリの画面のわく（上の段に通貨ペアなど）"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 236 * S, cx + 266 * S
    y0, y1 = top - 30 * S, top - 30 * S + h * S
    d.rounded_rectangle([x0, y0, x1, y1], radius=8 * S, fill=FX_PANEL, outline=FX_GRID, width=2 * S)
    d.rectangle([x0 + 2 * S, y0 + 2 * S, x1 - 2 * S, y0 + 44 * S], fill=FX_BAR)
    d.line([(x0, y0 + 44 * S), (x1, y0 + 44 * S)], fill=FX_GRID, width=2 * S)
    f = font('bold', 21)
    d.text((x0 + 16 * S, y0 + 9 * S), bar_l, font=f, fill=FX_MUTED)
    d.text((x1 - 16 * S - d.textlength(bar_r, font=f), y0 + 9 * S), bar_r, font=f, fill=FX_MUTED)
    return d, x0, x1, y0 + 44 * S, y1


def fx_grid(d, x0, x1, y0, y1):
    for i in (1, 2, 3):
        d.line([(x0 + (x1 - x0) * i / 4, y0), (x0 + (x1 - x0) * i / 4, y1)], fill=FX_LINE, width=2 * S)
        d.line([(x0, y0 + (y1 - y0) * i / 4), (x1, y0 + (y1 - y0) * i / 4)], fill=FX_LINE, width=2 * S)


def fx_dashed(d, x0, x1, y, fill, dash, width):
    x = x0
    while x < x1:
        d.line([(x, y), (min(x + dash, x1), y)], fill=fill, width=width)
        x += dash * 1.7


def fx_label(d, x1, y, text, bg, fg):
    f = font('black', 19)
    tw = d.textlength(text, font=f)
    d.rectangle([x1 - tw - 18 * S, y - 15 * S, x1, y + 15 * S], fill=bg)
    d.text((x1 - tw - 9 * S, y - 13 * S), text, font=f, fill=fg)


WALK = [0.55, 0.7, 0.42, 0.62, 0.9, 0.74, 0.5, 0.66, 0.36, 0.2, 0.44, 0.6, 0.3, 0.12, 0.3, 0.06, -0.14, 0.1, 0.26, -0.04, -0.3, -0.1, 0.16, -0.2, -0.45, -0.24, -0.04, -0.34, -0.14, 0]  # src/lib/fx-chart.mjs と同じ


def fx_cut(img, cx, top):
    """ロスカット：チャートの画面。いまのレートとロスカットのライン、上の段に「ロスカットまで、あと40,000円の損」"""
    d, x0, x1, py0, py1 = fx_panel(img, cx, top, 'ドル円・買い', '維持率 166.6%')
    d.text((x0 + 18 * S, py0 + 12 * S), 'ロスカットまで、あと', font=font('bold', 24), fill=FX_MUTED)
    f_big = font('black', 62)
    d.text((x0 + 18 * S, py0 + 40 * S), '40,000', font=f_big, fill=FX_GOLD)
    d.text((x0 + 26 * S + d.textlength('40,000', font=f_big), py0 + 70 * S), '円の損', font=font('black', 28), fill=FX_INK)
    cy0, cy1 = py0 + 128 * S, py1 - 6 * S
    fx_grid(d, x0, x1, cy0, cy1)
    ch = cy1 - cy0
    now_y, cut_y = cy0 + ch * 0.34, cy0 + ch * 0.75
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle([x0 + 2 * S, now_y, x1 - 2 * S, cut_y], fill=(248, 81, 73, 34))
    img.alpha_composite(layer)
    d = ImageDraw.Draw(img)
    fx_dashed(d, x0, x1, now_y, FX_GOLD, 8 * S, 2 * S)
    fx_dashed(d, x0, x1, cut_y, FX_DOWN, 14 * S, 3 * S)
    end_x = x0 + (x1 - x0) * 0.66
    pts = [(x0 + 6 * S + (end_x - x0 - 6 * S) * i / (len(WALK) - 1), now_y - w * 0.4 * ch * (1 if w >= 0 else 0.5)) for i, w in enumerate(WALK)]
    d.line(pts, fill='#D9D5CB', width=3 * S, joint='curve')
    d.ellipse([end_x - 8 * S, now_y - 8 * S, end_x + 8 * S, now_y + 8 * S], fill=FX_INK)
    fx_label(d, x1 - 2 * S, now_y, 'いま 150.00', FX_GOLD, '#16181C')
    fx_label(d, x1 - 2 * S, cut_y, 'ロスカット 146.00', FX_DOWN, '#FFFFFF')


def fx_gauge(img, cx, top):
    """証拠金維持率：口座の画面の大きな半円のメーターと、真ん中に「250％」"""
    import math
    d, x0, x1, py0, py1 = fx_panel(img, cx, top, 'ドル円', '口座の状況')
    gx, gy, r, w = (x0 + x1) / 2, py1 - 60 * S, 150 * S, 26 * S
    box = [gx - r, gy - r, gx + r, gy + r]
    d.arc(box, 180, 360, fill=FX_LINE, width=w)
    d.arc(box, 180, 180 + 36, fill='#7A2F2C', width=w)  # 0〜100％（500％までのうち）
    d.arc(box, 180, 180 + 90, fill=FX_GOLD, width=w)  # 250％
    for txt, ang in (('0', 180), ('100', 216), ('500%', 360)):
        a = math.radians(ang)
        f = font('bold', 18)
        tx, ty = gx + (r + 30 * S) * math.cos(a), gy + (r + 30 * S) * math.sin(a)
        d.text((tx - d.textlength(txt, font=f) / 2, ty - 10 * S), txt, font=f, fill=FX_MUTED)
    f_k, f_v, f_u = font('bold', 22), font('black', 72), font('black', 30)
    k = '証拠金維持率'
    d.text((gx - d.textlength(k, font=f_k) / 2, gy - 96 * S), k, font=f_k, fill=FX_MUTED)
    vw, uw = d.textlength('250', font=f_v), d.textlength('％', font=f_u)
    vx = gx - (vw + uw + 6 * S) / 2
    d.text((vx, gy - 70 * S), '250', font=f_v, fill=FX_GOLD)
    d.text((vx + vw + 6 * S, gy - 34 * S), '％', font=f_u, fill=FX_INK)


def fx_swap_chart(img, cx, top):
    """スワップ：チャートの画面。1年でたまる額の階段の線と、「1日に 約123円 もらえる」（計算式の例と同じ数字）"""
    d, x0, x1, py0, py1 = fx_panel(img, cx, top, 'ドル円・買い', '金利の差 3%')
    cy0, cy1 = py0 + 4 * S, py1 - 34 * S
    fx_grid(d, x0, x1, cy0, cy1)
    ch = cy1 - cy0
    bottom, topy = cy1 - ch * 0.08, cy0 + ch * 0.3  # 左上の答えにかからないように、右へ行くほど上がる
    pts = [(x0 + 12 * S, bottom)]
    for i in range(12):
        x = x0 + 12 * S + (x1 - x0 - 30 * S) * (i + 1) / 12
        y = bottom - (bottom - topy) * (i + 1) / 12
        pts += [(x, pts[-1][1]), (x, y)]
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).polygon(pts + [(pts[-1][0], bottom)], fill=(63, 185, 80, 44))
    img.alpha_composite(layer)
    d = ImageDraw.Draw(img)
    d.line(pts, fill=FX_UP, width=4 * S)
    d.text((x0 + 18 * S, cy0 + 14 * S), '1日に', font=font('bold', 24), fill=FX_MUTED)
    f_big = font('black', 62)
    d.text((x0 + 18 * S, cy0 + 42 * S), '約123', font=f_big, fill=FX_GOLD)
    d.text((x0 + 26 * S + d.textlength('約123', font=f_big), cy0 + 72 * S), '円 もらえる', font=font('black', 28), fill=FX_INK)
    f = font('bold', 18)
    for txt, fx in (('0日', 0.02), ('半年', 0.5), ('1年', 0.96)):
        tw = d.textlength(txt, font=f)
        d.text((x0 + (x1 - x0) * fx - tw / 2, py1 - 28 * S), txt, font=f, fill=FX_MUTED)


def receipt(img, cx, top, lines, tickets, rows):
    """割り勘：お会計のレシート（サイトの結果と同じ見た目）。lines は（名前, 額, 人数）、tickets は券の高さの割合"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 214 * S, cx + 238 * S
    y0, y1 = top - 78 * S, top + 334 * S
    teeth = 18
    pts = [(x0, y0), (x1, y0), (x1, y1)]
    for i in range(1, teeth + 1):
        pts += [(x1 - (i - 0.5) * (x1 - x0) / teeth, y1 + 12 * S), (x1 - i * (x1 - x0) / teeth, y1)]
    d.polygon(pts, fill=SHEET, outline='#B4C1D2', width=2 * S)
    spaced(d, (x0 + x1) / 2, y0 + 14 * S, 'お会計', font('black', 26), INK, 18 * S)

    def dashed(y):
        x = x0 + 18 * S
        while x < x1 - 18 * S:
            d.line([(x, y), (min(x + 10 * S, x1 - 18 * S), y)], fill='#B4C1D2', width=2 * S)
            x += 17 * S

    dashed(y0 + 58 * S)
    y = y0 + 70 * S
    big = len(lines) == 1
    for k, v, n in lines:
        f_v = font('black', 70 if big else 44)
        f_u = font('black', 26 if big else 22)
        uw = d.textlength('円', font=f_u)
        vw = d.textlength(v, font=f_v)
        h = (82 if big else 54) * S
        d.text((x1 - 22 * S - uw, y + h - 36 * S), '円', font=f_u, fill=RED)
        d.text((x1 - 26 * S - uw - vw, y + h - (78 if big else 50) * S - 6 * S), v, font=f_v, fill=RED)
        d.text((x0 + 22 * S, y + h - 38 * S), k, font=font('black', 28 if big else 24), fill=INK)
        if n:
            d.text((x0 + 104 * S, y + h - 32 * S), n, font=font('bold', 18), fill=PENCIL)
        y += h + (4 if big else 2) * S
    # 人数分の券（切り取り線）。券がない（消費税）ときは、すぐ下に明細
    n = len(tickets)
    gap = 8 * S
    w = (x1 - x0 - 44 * S - gap * (n - 1)) / n if n else 0
    base = y + ((66 if big else 60) if n else 4) * S
    for i, hr in enumerate(tickets):
        h = (30 + 30 * hr) * S
        x = x0 + 22 * S + i * (w + gap)
        for (ax, ay), (bx, by) in (((x, base - h), (x + w, base - h)), ((x, base), (x + w, base)), ((x, base - h), (x, base)), ((x + w, base - h), (x + w, base))):
            steps = int(max(abs(bx - ax), abs(by - ay)) / (9 * S)) or 1
            for j in range(0, steps, 2):
                d.line([(ax + (bx - ax) * j / steps, ay + (by - ay) * j / steps), (ax + (bx - ax) * (j + 1) / steps, ay + (by - ay) * (j + 1) / steps)], fill='#B4C1D2', width=2 * S)
        if big:
            tw = d.textlength(lines[0][1], font=font('bold', 18))
            d.text((x + w / 2 - tw / 2, base - h / 2 - 12 * S), lines[0][1], font=font('bold', 18), fill=INK)
    y = base + 14 * S
    dashed(y)
    for k, v in rows:
        y += 12 * S
        d.text((x0 + 22 * S, y), k, font=font('bold', 22), fill=INK)
        vw = d.textlength(v, font=font('black', 24))
        d.text((x1 - 22 * S - vw, y), v, font=font('black', 24), fill=INK)
        y += 30 * S


def meter_slip(img, cx, top, what, digits, month, cells):
    """電気代：電気代のお知らせ（サイトの結果と同じ見た目）。digits は1か月の使用量（整数4けた＋小数1けたの文字）、cells は（1時間, 1日, 1年）"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 220 * S, cx + 240 * S
    y0, y1 = top - 70 * S, top + 290 * S
    d.rectangle([x0, y0, x1, y1], fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.rectangle([x0, y0, x1, y0 + 10 * S], fill=INK)
    d.text((x0 + 22 * S, y0 + 24 * S), '電気代のお知らせ', font=font('black', 26), fill=INK)
    tw = d.textlength('目安', font=font('bold', 18))
    d.text((x1 - 22 * S - tw, y0 + 30 * S), '目安', font=font('bold', 18), fill=PENCIL)
    # メーターの数字の窓
    my = y0 + 78 * S
    d.text((x0 + 22 * S, my + 4 * S), '1か月の', font=font('bold', 17), fill=PENCIL)
    d.text((x0 + 22 * S, my + 26 * S), '使用量', font=font('bold', 17), fill=PENCIL)
    uw = d.textlength('kWh', font=font('black', 20))
    d.text((x1 - 22 * S - uw, my + 16 * S), 'kWh', font=font('black', 20), fill=INK)
    bw, bh, gap = 34 * S, 46 * S, 5 * S
    wx1 = x1 - 30 * S - uw
    wx0 = wx1 - len(digits) * bw - (len(digits) - 1) * gap - 12 * S
    d.rounded_rectangle([wx0, my - 6 * S, wx1, my + bh + 6 * S], radius=4 * S, fill=INK)
    for i, ch in enumerate(digits):
        bx = wx0 + 6 * S + i * (bw + gap)
        if i == len(digits) - 1:
            d.ellipse([bx - gap / 2 - 3 * S, my + bh - 7 * S, bx - gap / 2 + 3 * S, my + bh - 1 * S], fill='#FFFFFF')
        dec = i == len(digits) - 1
        d.rounded_rectangle([bx, my, bx + bw, my + bh], radius=3 * S, fill=RED if dec else '#FFFFFF')
        cw = d.textlength(ch, font=font('black', 30))
        d.text((bx + bw / 2 - cw / 2, my + 2 * S), ch, font=font('black', 30), fill='#FFFFFF' if dec else INK)
    ww = d.textlength(what, font=font('bold', 18))
    d.text((x1 - 22 * S - ww, my + bh + 14 * S), what, font=font('bold', 18), fill=PENCIL)
    # いちばん大きな1か月の電気代と、下の線
    sy = my + bh + 44 * S
    d.text((x0 + 22 * S, sy + 46 * S), '1か月', font=font('black', 26), fill=INK)
    f_v, f_u = font('black', 70), font('black', 26)
    yw = d.textlength('円', font=f_u)
    vw = d.textlength(month, font=f_v)
    d.text((x1 - 22 * S - yw, sy + 46 * S), '円', font=f_u, fill=RED)
    d.text((x1 - 26 * S - yw - vw, sy - 6 * S), month, font=f_v, fill=RED)
    aw = d.textlength('約', font=f_u)
    d.text((x1 - 30 * S - yw - vw - aw, sy + 46 * S), '約', font=f_u, fill=RED)
    d.line([(x0 + 18 * S, sy + 88 * S), (x1 - 18 * S, sy + 88 * S)], fill=INK, width=2 * S)
    # 1時間・1日・1年
    ty = sy + 100 * S
    cw3 = (x1 - x0 - 36 * S) / 3
    for i, (k, v) in enumerate(zip(('1時間', '1日', '1年'), cells)):
        cxx = x0 + 18 * S + cw3 * (i + 0.5)
        kw = d.textlength(k, font=font('bold', 17))
        d.text((cxx - kw / 2, ty), k, font=font('bold', 17), fill=PENCIL)
        vw = d.textlength(v, font=font('black', 24))
        d.text((cxx - vw / 2, ty + 26 * S), v, font=font('black', 24), fill=INK)
        if i:
            d.line([(x0 + 18 * S + cw3 * i, ty), (x0 + 18 * S + cw3 * i, ty + 58 * S)], fill='#D3DCE8', width=2 * S)


def pic_slip(img, cx, top, title, pic, cap, value, unit, under, head, cells, pre='', tag='目安'):
    """灯油代・塩分濃度：左に絵、右に大きな答え、下に3つの表（サイトの .slip.pic と同じ見た目）
    pic(d, x0, y0) は絵を描く（幅 180・高さ 200 の中）。under(d, x, y) は大きな答えの下に描く（スプーンなど）"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 220 * S, cx + 240 * S
    y0, y1 = top - 70 * S, top + 290 * S
    d.rectangle([x0, y0, x1, y1], fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.rectangle([x0, y0, x1, y0 + 10 * S], fill=INK)
    d.text((x0 + 22 * S, y0 + 24 * S), title, font=font('black', 26), fill=INK)
    tw = d.textlength(tag, font=font('bold', 18))
    d.text((x1 - 22 * S - tw, y0 + 30 * S), tag, font=font('bold', 18), fill=PENCIL)
    py = y0 + 70 * S
    pic(d, x0 + 18 * S, py)
    rx = x0 + 218 * S
    d.text((rx, py + 20 * S), cap, font=font('black', 24), fill=INK)
    f_v, f_u = font('black', 64), font('black', 24)
    x = rx
    if pre:
        d.text((x, py + 92 * S), pre, font=f_u, fill=RED)
        x += d.textlength(pre, font=f_u) + 4 * S
    d.text((x, py + 46 * S), value, font=f_v, fill=RED)
    x += d.textlength(value, font=f_v) + 4 * S
    d.text((x, py + 92 * S), unit, font=f_u, fill=RED)
    under(d, rx, py + 134 * S)
    ty = py + 220 * S
    d.line([(x0 + 18 * S, ty - 12 * S), (x1 - 18 * S, ty - 12 * S)], fill=INK, width=2 * S)
    cw3 = (x1 - x0 - 36 * S) / 3
    for i, (k, v) in enumerate(zip(head, cells)):
        cxx = x0 + 18 * S + cw3 * (i + 0.5)
        kw = d.textlength(k, font=font('bold', 17))
        d.text((cxx - kw / 2, ty), k, font=font('bold', 17), fill=PENCIL)
        vw = d.textlength(v, font=font('black', 24))
        d.text((cxx - vw / 2, ty + 26 * S), v, font=font('black', 24), fill=INK)
        if i:
            d.line([(x0 + 18 * S + cw3 * i, ty), (x0 + 18 * S + cw3 * i, ty + 58 * S)], fill='#D3DCE8', width=2 * S)


def salt_slip(img, cx, top):
    """塩分濃度：ボウルの絵と塩の量、スプーンの絵（ページの計算例：水500mlで3％）"""
    def bowl(d, x, y):
        w = 180 * S
        # 塩の山
        d.chord([x + 58 * S, y + 62 * S, x + 122 * S, y + 138 * S], 180, 360, fill='#EEF2F7', outline='#9AA9BB', width=3 * S)
        # ボウルと水
        d.chord([x, y + 10 * S, x + w, y + 190 * S], 0, 180, fill='#FFFFFF', outline=INK, width=4 * S)
        d.chord([x + 12 * S, y + 22 * S, x + w - 12 * S, y + 178 * S], 0, 180, fill='#CFE3F3')
        d.line([(x - 4 * S, y + 100 * S), (x + w + 4 * S, y + 100 * S)], fill=INK, width=5 * S)
        t = '500g'
        f = font('black', 26)
        d.text((x + w / 2 - d.textlength(t, font=f) / 2, y + 116 * S), t, font=f, fill=INK)

    def spoons(d, x, y):
        r = 11 * S
        for i, full in enumerate((1, 1, 0.5)):
            bx = x + i * 48 * S
            d.ellipse([bx, y, bx + 2 * r, y + 2 * r], outline=INK, width=3 * S)
            if full == 1:
                d.ellipse([bx, y, bx + 2 * r, y + 2 * r], fill=INK)
            else:
                d.pieslice([bx, y, bx + 2 * r, y + 2 * r], 90, 270, fill=INK)
            d.rounded_rectangle([bx + 2 * r - 2 * S, y + r - 3 * S, bx + 2 * r + 16 * S, y + r + 3 * S], radius=2 * S, fill=INK)
        d.text((x, y + 34 * S), '小さじ2と1/2', font=font('black', 22), fill=INK)

    pic_slip(img, cx, top, '塩の量', bowl, '塩', '15', 'g', spoons, ('塩', '濃度', '全体に対して'), ('15g', '3%', '2.91%'))


def percent_slip(img, cx, top):
    """パーセント：方眼の100マス（15マスを赤ペンでぬる）と、大きな答え（ページの計算例：200の15％は30）"""
    def grid(d, x, y):
        x += 6 * S
        size = 176 * S
        c = size / 10
        d.rectangle([x, y, x + size, y + size], fill='#FFFFFF')
        for i in range(15):
            r, k = divmod(i, 10)
            d.rectangle([x + k * c, y + r * c, x + (k + 1) * c, y + (r + 1) * c], fill='#D3505A')
        for i in range(1, 10):
            d.line([(x + i * c, y), (x + i * c, y + size)], fill='#9FB7D4', width=1 * S)
            d.line([(x, y + i * c), (x + size, y + i * c)], fill='#9FB7D4', width=1 * S)
        d.rectangle([x, y, x + size, y + size], outline=INK, width=3 * S)

    def say(d, x, y):
        d.text((x, y + 6 * S), '200の15%は30', font=font('black', 24), fill=INK)

    pic_slip(img, cx, top, '100マスでみると', grid, 'その数', '30', '', say, ('%', '割', '小数'), ('15%', '1.5割', '0.15'), tag='1マス＝1%')


def nissu_slip(img, cx, top):
    """日数：日めくりカレンダー（2026年10月21日の100日後）と、大きな「100日後」"""
    def cal(d, x, y):
        x += 14 * S
        w, h = 160 * S, 190 * S
        d.rectangle([x, y, x + w, y + h], fill='#FFFFFF', outline=INK, width=3 * S)
        d.rectangle([x, y, x + w, y + 36 * S], fill=RED)
        for t, f, yy, col in (('2027年1月', font('black', 22), 4, '#FFFFFF'), ('29', font('black', 92), 34, INK), ('金曜日', font('black', 24), 150, PENCIL)):
            d.text((x + w / 2 - d.textlength(t, font=f) / 2, y + yy * S), t, font=f, fill=col)

    def say(d, x, y):
        d.text((x, y + 6 * S), '2027年1月29日（金）', font=font('black', 22), fill=INK)

    pic_slip(img, cx, top, 'カレンダー', cal, 'はじめの日から', '100', '日後', say, ('週と日', '初日もふくむ', '和暦'), ('14週2日', '101日', '令和9年'), tag='10月21日（水）から')


def nenrei_slip(img, cx, top):
    """年齢：干支の輪（卯に赤ペンの丸）と、大きな満年齢（1987年6月15日生まれ・2026年10月21日）"""
    import math
    eto = '子丑寅卯辰巳午未申酉戌亥'

    def ring(d, x, y):
        cx2, cy2, r = x + 88 * S, y + 96 * S, 66 * S
        d.ellipse([cx2 - r, cy2 - r, cx2 + r, cy2 + r], outline='#D3DCE8', width=2 * S)
        f = font('black', 21)
        for i, k in enumerate(eto):
            a = math.radians(i * 30 - 90)
            px, py = cx2 + r * math.cos(a), cy2 + r * math.sin(a)
            on = i == 3
            if on:
                d.ellipse([px - 16 * S, py - 16 * S, px + 16 * S, py + 16 * S], fill='#FFFFFF', outline=RED, width=3 * S)
            tw = d.textlength(k, font=f)
            d.text((px - tw / 2, py - 15 * S), k, font=f, fill=RED if on else PENCIL)
        f2 = font('black', 52)
        d.text((cx2 - d.textlength('卯', font=f2) / 2, cy2 - 36 * S), '卯', font=f2, fill=INK)

    def say(d, x, y):
        d.text((x, y + 6 * S), '昭和62年生まれ・卯年', font=font('black', 20), fill=INK)

    pic_slip(img, cx, top, '年齢', ring, '満年齢', '39', '歳', say, ('数え年', '学年', '次の誕生日'), ('40歳', '—', 'あと237日'), tag='2026年10月21日')


def rireki_sheet(img, cx, top):
    """入学・卒業年：履歴書の学歴の欄（2004年6月10日生まれ。年は赤ペン、和暦とその時の年齢は小さく）"""
    d = ImageDraw.Draw(img)
    rows = (('2011', '平成23', '4', '小学校 入学', '6歳'), ('2017', '平成29', '3', '小学校 卒業', '12歳'), ('2017', '平成29', '4', '中学校 入学', '12歳'),
            ('2020', '令和2', '3', '中学校 卒業', '15歳'), ('2020', '令和2', '4', '高校 入学', '15歳'), ('2023', '令和5', '3', '高校 卒業', '18歳'),
            ('2023', '令和5', '4', '大学 入学', '18歳'), ('2027', '令和9', '3', '大学 卒業', '22歳'))
    x0, x1 = cx - 220 * S, cx + 240 * S
    y0 = top - 70 * S
    rh = 36 * S
    y1 = y0 + 20 * S + 30 * S + rh * len(rows) + 40 * S
    d.rectangle([x0, y0, x1, y1], fill=SHEET, outline=INK, width=2 * S)
    c1, c2 = x0 + 170 * S, x0 + 214 * S
    hy = y0 + 14 * S
    f_h = font('bold', 17)
    for text, a, b in (('年', x0, c1), ('月', c1, c2), ('学歴', c2, x1)):
        d.text(((a + b) / 2 - d.textlength(text, font=f_h) / 2, hy), text, font=f_h, fill=PENCIL)
    ly = hy + 32 * S
    d.line([(x0 + 14 * S, ly), (x1 - 14 * S, ly)], fill=INK, width=2 * S)
    f_y, f_w, f_m, f_s, f_a = font('black', 24), font('bold', 16), font('black', 22), font('black', 21), font('bold', 17)
    for i, (y, w, m, sch, age) in enumerate(rows):
        ry = ly + rh * i
        d.text((x0 + 18 * S, ry + 4 * S), y, font=f_y, fill=RED)
        d.text((x0 + 18 * S + d.textlength(y, font=f_y) + 6 * S, ry + 11 * S), w, font=f_w, fill=PENCIL)
        d.text(((c1 + c2) / 2 - d.textlength(m, font=f_m) / 2, ry + 5 * S), m, font=f_m, fill=INK)
        d.text((c2 + 12 * S, ry + 6 * S), sch, font=f_s, fill=INK)
        d.text((x1 - 18 * S - d.textlength(age, font=f_a), ry + 10 * S), age, font=f_a, fill=PENCIL)
        d.line([(x0 + 14 * S, ry + rh), (x1 - 14 * S, ry + rh)], fill='#D3DCE8', width=2 * S)
    for x in (c1, c2):
        d.line([(x, hy - 2 * S), (x, ly + rh * len(rows))], fill='#D3DCE8', width=2 * S)
    t = '以上'
    d.text((x1 - 18 * S - d.textlength(t, font=font('black', 19)), ly + rh * len(rows) + 6 * S), t, font=font('black', 19), fill=INK)


def wareki_slip(img, cx, top):
    """和暦・西暦：元号の年表（平成に赤い印）と、大きな「平成元年」（1989年）"""
    eras = (('明治', 1868, 1912), ('大正', 1912, 1926), ('昭和', 1926, 1989), ('平成', 1989, 2019), ('令和', 2019, 2032))
    total = sum(b - a for _, a, b in eras)

    def nenpyo(d, x, y):
        H, MIN, W = 200 * S, 24 * S, 150 * S
        top_y = y
        f = font('black', 18)
        for name, a, b in eras:
            h = MIN + (b - a) / total * (H - MIN * len(eras))
            on = name == '平成'
            d.rectangle([x, top_y, x + W, top_y + h], fill='#F4DADB' if on else '#FFFFFF', outline=RED if on else INK, width=2 * S)
            d.text((x + 12 * S, top_y + h / 2 - 13 * S), name, font=f, fill=RED if on else PENCIL)
            if on:
                my = top_y + (1989.5 - a) / (b - a) * h
                d.line([(x + 86 * S, my), (x + W, my)], fill=RED, width=4 * S)
                d.ellipse([x + 80 * S, my - 6 * S, x + 92 * S, my + 6 * S], fill=RED)
            top_y += h

    def say(d, x, y):
        d.text((x, y + 6 * S), '己巳（つちのとみ）', font=font('black', 20), fill=INK)

    pic_slip(img, cx, top, '和暦と西暦', nenpyo, '1989年は', '平成元', '年', say, ('今年から', 'その年生まれ', '干支'), ('37年前', '今年37歳', '巳'), tag='1月7日までは昭和64年')


def jikan_slip(img, cx, top):
    """時間の計算：合計（3時間45分＋2時間30分＋7時間15分）と、時間の帯"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 220 * S, cx + 240 * S
    y0, y1 = top - 30 * S, top + 290 * S
    d.rectangle([x0, y0, x1, y1], fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.rectangle([x0, y0, x1, y0 + 10 * S], fill=INK)
    sy = y0 + 30 * S
    d.text((x0 + 22 * S, sy + 46 * S), '合計', font=font('black', 26), fill=INK)
    f_v = font('black', 64)
    v = '13時間30分'
    d.text((x1 - 22 * S - d.textlength(v, font=f_v), sy), v, font=f_v, fill=RED)
    d.line([(x0 + 18 * S, sy + 92 * S), (x1 - 18 * S, sy + 92 * S)], fill=INK, width=2 * S)
    by, bh = sy + 110 * S, 40 * S
    bx0, bx1 = x0 + 22 * S, x1 - 22 * S
    span = 14 * 60
    x = bx0
    for k, mins in enumerate((225, 150, 435)):
        w = (bx1 - bx0) * mins / span
        d.rectangle([x, by, x + w, by + bh], fill=RED if k % 2 == 0 else '#D98A90')
        t = str(k + 1)
        d.text((x + w / 2 - d.textlength(t, font=font('black', 20)) / 2, by + 8 * S), t, font=font('black', 20), fill='#FFFFFF')
        x += w
    for i in range(1, 14):
        tx = bx0 + (bx1 - bx0) * i / 14
        d.line([(tx, by + bh * 0.6), (tx, by + bh)], fill=INK, width=2 * S)
    d.rectangle([bx0, by, bx1, by + bh], outline=INK, width=3 * S)
    d.text((bx0, by + bh + 4 * S), '0', font=font('bold', 18), fill=PENCIL)
    t = '14時間'
    d.text((bx1 - d.textlength(t, font=font('bold', 18)), by + bh + 4 * S), t, font=font('bold', 18), fill=PENCIL)
    ty = by + bh + 44 * S
    cw3 = (x1 - x0 - 36 * S) / 3
    for i, (k, v2) in enumerate(zip(('小数', '分', '日'), ('13.5時間', '810分', '—'))):
        cxx = x0 + 18 * S + cw3 * (i + 0.5)
        d.text((cxx - d.textlength(k, font=font('bold', 17)) / 2, ty), k, font=font('bold', 17), fill=PENCIL)
        d.text((cxx - d.textlength(v2, font=font('black', 24)) / 2, ty + 26 * S), v2, font=font('black', 24), fill=INK)
        if i:
            d.line([(x0 + 18 * S + cw3 * i, ty), (x0 + 18 * S + cw3 * i, ty + 58 * S)], fill='#D3DCE8', width=2 * S)


def furusato_doc(img, cx, top):
    """ふるさと納税の上限の目安（年収500万円・ひとり。2026年の寄付）：寄付する → 住民税が減る → 自己負担"""
    doc_sheet(img, cx, top, '寄付の上限', '上限の目安', '57,000', '円', ('いつ', 'お金', '金額'),
              (('今年中', '寄付する', '57,000円'), ('翌年6月から', '住民税が減る', ('55,000円',)), ('のこり', '自己負担', '2,000円')))


def furusato_nenshu_doc(img, cx, top):
    """ふるさと納税に必要な年収（5万円・ひとり。2026年の寄付）"""
    doc_sheet(img, cx, top, '年収の目安', '必要な年収', '452', '万円から', ('寄付額', 'ひとり', '夫婦'),
              (('3万円', '314万', '376万'), ('5万円', ('452万',), '503万'), ('10万円', '677万', '727万')))


def furusato_fuufu_doc(img, cx, top):
    """共働き・夫婦の上限（600万円と300万円。2026年の寄付）"""
    doc_sheet(img, cx, top, '夫婦の上限', '2人の合計', '105,000', '円', ('だれ', '年収', '上限'),
              (('あなた', '600万円', ('77,000円',)), ('配偶者', '300万円', '28,000円'), ('配偶者150万', 'あなた', '69,000円')))


def furusato_uchiwake_doc(img, cx, top):
    """控除の内わけ（年収500万円・ひとりで5万円。2026年の寄付）"""
    doc_sheet(img, cx, top, '控除の内わけ', '自己負担', '2,000', '円', ('税', '戻る額'),
              (('所得税', '2,450円'), ('住民税 基本分', '4,800円'), ('住民税 特例分', ('40,750円',))))


def furusato_jougen_doc(img, cx, top):
    """控除上限額の計算（所得割235,500円・所得税率5%）"""
    doc_sheet(img, cx, top, '控除上限額', '上限の目安', '57,000', '円', ('計算', '金額'),
              (('所得割×20%', '47,100円'), ('特例の割合', '84.895%'), ('住民税が減る', ('55,000円',))))


def furusato_memo_doc(img, cx, top):
    """寄付メモ（上限57,000円・2つの自治体に30,000円）"""
    doc_sheet(img, cx, top, '寄付の控え', 'のこり', '27,000', '円', ('自治体', '金額', '申請書'),
              (('A市', '10,000円', '済'), ('B町', '20,000円', ('未',)), ('合計', '30,000円', '2つ')))


def furusato_onestop_doc(img, cx, top):
    """ワンストップ特例（寄付先3つ・マイナンバーカードあり）"""
    doc_sheet(img, cx, top, 'ワンストップ特例', '寄付先に出す', '3', '通', ('もの', '中身'),
              (('申請書', '寄付ごとに1枚'), ('コピー', 'カードの表と裏'), ('期限', ('1月10日必着',))))


def furusato_shimekiri_doc(img, cx, top):
    """ふるさと納税はいつまで（年内の寄付・申請書・確定申告）"""
    doc_sheet(img, cx, top, '締め切り', '年内の寄付', '12月31日', '', ('こと', '期限'),
              (('申請書', ('翌年1月10日必着',)), ('確定申告', '2月16日〜3月15日'), ('住民税', '6月から減る')))


def furusato_seido_doc(img, cx, top):
    """制度の変更点（2027年の寄付から、特例控除に193万円の上限）"""
    doc_sheet(img, cx, top, '制度の変更点', '2027年の寄付から', '193万', '円', ('いつから', 'こと'),
              (('2019年6月', '返礼品は3割以下'), ('2026年の寄付', '控除の見直し'), ('2027年の寄付', ('特例控除の上限',))))


def henreihin_doc(title, unit, rows):
    """返礼品：1万円あたりの量の帳面（商品は出さない。ページの計算の例と同じ数字）"""
    return lambda img, cx, top: doc_sheet(img, cx, top, title, '1万円あたり', '5' if unit == 'kg' else '40', unit, ('量', '寄付額', '1万円あたり'), rows)


def point_card(img, cx, top):
    """お買い物マラソン：買いまわりカード（10マスのうち5つに赤ペンの丸）と、大きな特典（合計3万円・5店舗）"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 226 * S, cx + 250 * S
    y0, y1 = top - 40 * S, top + 316 * S
    d.rounded_rectangle([x0, y0, x1, y1], radius=8 * S, fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.text((x0 + 22 * S, y0 + 16 * S), '買いまわりカード', font=font('black', 26), fill=INK)
    t = '5倍'
    d.text((x1 - 22 * S - d.textlength(t, font=font('black', 26)), y0 + 16 * S), t, font=font('black', 26), fill=RED)
    gap = 8 * S
    cw = (x1 - x0 - 44 * S - gap * 9) / 10
    cy = y0 + 88 * S
    for i in range(10):
        sx = x0 + 22 * S + i * (cw + gap)
        box = [sx, cy - cw / 2, sx + cw, cy + cw / 2]
        f = font('black' if i < 5 else 'bold', 18)
        n = str(i + 1)
        if i < 5:
            layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
            ImageDraw.Draw(layer).ellipse(box, outline=RED, width=4 * S)
            img.alpha_composite(layer.rotate(-8, center=(sx + cw / 2, cy), resample=Image.BICUBIC))
            d = ImageDraw.Draw(img)
        else:
            for a in range(0, 360, 30):
                d.arc(box, a, a + 16, fill='#B4C1D2', width=2 * S)
        d.text((sx + cw / 2 - d.textlength(n, font=f) / 2, cy - 12 * S), n, font=f, fill=RED if i < 5 else PENCIL)
    ys = cy + 44 * S
    d.text((x0 + 22 * S, ys + 46 * S), '特典', font=font('black', 30), fill=INK)
    f_v, f_u = font('black', 84), font('black', 26)
    u = 'ポイント'
    uw = d.textlength(u, font=f_u)
    v = '1,088'
    d.text((x1 - 22 * S - uw, ys + 60 * S), u, font=f_u, fill=RED)
    d.text((x1 - 22 * S - uw - 8 * S - d.textlength(v, font=f_v), ys), v, font=f_v, fill=RED)
    x = x0 + 18 * S
    while x < x1 - 18 * S:
        d.line([(x, ys + 104 * S), (min(x + 10 * S, x1 - 18 * S), ys + 104 * S)], fill='#B4C1D2', width=2 * S)
        x += 17 * S
    for j, (k, v2) in enumerate((('上限まで', 'あと5,912ポイント'), ('あと1店舗で', '+317ポイント'))):
        yy = ys + 118 * S + j * 40 * S
        d.text((x0 + 22 * S, yy), k, font=font('bold', 23), fill=INK)
        d.text((x1 - 22 * S - d.textlength(v2, font=font('black', 23)), yy), v2, font=font('black', 23), fill=INK)


def spu_card(img, cx, top):
    """SPU：今月のSPUのカード（倍率の帯に楽天会員の1倍と使っているサービスの分）と、大きなポイント（3万円・楽天カード・モバイル・銀行・ブックス）"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 226 * S, cx + 250 * S
    y0, y1 = top - 40 * S, top + 316 * S
    d.rounded_rectangle([x0, y0, x1, y1], radius=8 * S, fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.text((x0 + 22 * S, y0 + 16 * S), '今月のSPU', font=font('black', 26), fill=INK)
    t = '8倍'
    d.text((x1 - 22 * S - d.textlength(t, font=font('black', 26)), y0 + 16 * S), t, font=font('black', 26), fill=RED)
    bx0, bx1 = x0 + 22 * S, x1 - 22 * S
    by, bh = y0 + 70 * S, 40 * S
    d.rectangle([bx0, by, bx1, by + bh], fill='#FFFFFF')
    x = bx0
    for k, (rate, color, label) in enumerate(((1, INK, '1'), (2, RED, '+2'), (4, '#D98A90', '+4'), (0.5, RED, ''), (0.5, '#D98A90', ''))):
        w = (bx1 - bx0) * rate / 18.5
        d.rectangle([x, by, x + w, by + bh], fill=color)
        if label:
            f = font('black', 20)
            d.text((x + w / 2 - d.textlength(label, font=f) / 2, by + 8 * S), label, font=f, fill='#FFFFFF')
        x += w
    d.rectangle([bx0, by, bx1, by + bh], outline=INK, width=3 * S)
    d.text((bx0, by + bh + 4 * S), '1倍', font=font('bold', 18), fill=PENCIL)
    t = '全部で18.5倍'
    d.text((bx1 - d.textlength(t, font=font('bold', 18)), by + bh + 4 * S), t, font=font('bold', 18), fill=PENCIL)
    ys = by + bh + 40 * S
    d.text((x0 + 22 * S, ys + 46 * S), 'ポイント', font=font('black', 30), fill=INK)
    f_v, f_u = font('black', 68), font('black', 26)
    u = 'ポイント'
    uw = d.textlength(u, font=f_u)
    v = '2,206'
    d.text((x1 - 22 * S - uw, ys + 60 * S), u, font=f_u, fill=RED)
    d.text((x1 - 22 * S - uw - 8 * S - d.textlength(v, font=f_v), ys + 14 * S), v, font=f_v, fill=RED)
    x = x0 + 18 * S
    while x < x1 - 18 * S:
        d.line([(x, ys + 104 * S), (min(x + 10 * S, x1 - 18 * S), ys + 104 * S)], fill='#B4C1D2', width=2 * S)
        x += 17 * S
    k, v2 = '楽天モバイルの上限', '55,000円で'
    yy = ys + 118 * S
    d.text((x0 + 22 * S, yy), k, font=font('bold', 23), fill=INK)
    d.text((x1 - 22 * S - d.textlength(v2, font=font('black', 23)), yy), v2, font=font('black', 23), fill=INK)


def floors_card(title, rate, rows, k, v, foot):
    """しくみ・比較：段の棒（名前・棒・数）と大きな数（楽天のポイントのしくみ・楽天とAmazonのポイント比較）"""
    def draw(img, cx, top):
        d = ImageDraw.Draw(img)
        x0, x1 = cx - 226 * S, cx + 250 * S
        y0, y1 = top - 40 * S, top + 316 * S
        d.rounded_rectangle([x0, y0, x1, y1], radius=8 * S, fill=SHEET, outline='#B4C1D2', width=2 * S)
        d.text((x0 + 22 * S, y0 + 16 * S), title, font=font('black', 26), fill=INK)
        d.text((x1 - 22 * S - d.textlength(rate, font=font('black', 26)), y0 + 16 * S), rate, font=font('black', 26), fill=RED)
        top_n = max(n for _, n, _ in rows)
        y = y0 + 66 * S
        for name, n, color in rows:
            d.text((x0 + 22 * S, y), name, font=font('bold', 21), fill=INK)
            bx0, bx1 = x0 + 150 * S, x1 - 110 * S
            d.rectangle([bx0, y + 2 * S, bx1, y + 26 * S], fill='#FFFFFF', outline=INK, width=2 * S)
            d.rectangle([bx0, y + 2 * S, bx0 + (bx1 - bx0) * n / top_n, y + 26 * S], fill=color)
            t = f'{n:,}'
            d.text((x1 - 22 * S - d.textlength(t, font=font('black', 23)), y), t, font=font('black', 23), fill=INK)
            y += 42 * S
        ys = y + 6 * S
        d.text((x0 + 22 * S, ys + 46 * S), k, font=font('black', 28), fill=INK)
        f_v, f_u = font('black', 68), font('black', 26)
        u = 'ポイント'
        uw = d.textlength(u, font=f_u)
        d.text((x1 - 22 * S - uw, ys + 60 * S), u, font=f_u, fill=RED)
        d.text((x1 - 22 * S - uw - 8 * S - d.textlength(v, font=f_v), ys + 14 * S), v, font=f_v, fill=RED)
        x = x0 + 18 * S
        while x < x1 - 18 * S:
            d.line([(x, ys + 104 * S), (min(x + 10 * S, x1 - 18 * S), ys + 104 * S)], fill='#B4C1D2', width=2 * S)
            x += 17 * S
        if foot:
            d.text((x0 + 22 * S, ys + 116 * S), foot, font=font('bold', 21), fill=PENCIL)
    return draw


def taishou_card(img, cx, top):
    """買いまわりの1店舗の判定：数える額の棒と1,000円の点線、大きな「数える」（1,280円の商品に300円のクーポン→980円で数えない、の例はページの本文。絵は1,280円で数える）"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 226 * S, cx + 250 * S
    y0, y1 = top - 40 * S, top + 316 * S
    d.rounded_rectangle([x0, y0, x1, y1], radius=8 * S, fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.text((x0 + 22 * S, y0 + 16 * S), '1店舗の判定', font=font('black', 26), fill=INK)
    ys = y0 + 56 * S
    d.text((x0 + 22 * S, ys + 46 * S), 'この買い物は', font=font('black', 26), fill=INK)
    v = '数える'
    f_v = font('black', 64)
    d.text((x1 - 22 * S - d.textlength(v, font=f_v), ys + 14 * S), v, font=f_v, fill=RED)
    bx0, bx1 = x0 + 22 * S, x1 - 22 * S
    by, bh = ys + 110 * S, 36 * S
    d.rectangle([bx0, by, bx1, by + bh], fill='#FFFFFF')
    d.rectangle([bx0, by, bx0 + (bx1 - bx0) * 0.64, by + bh], fill=RED)
    d.rectangle([bx0, by, bx1, by + bh], outline=INK, width=3 * S)
    mx = (bx0 + bx1) / 2
    yy = by - 8 * S
    while yy < by + bh + 8 * S:
        d.line([(mx, yy), (mx, min(yy + 7 * S, by + bh + 8 * S))], fill=INK, width=3 * S)
        yy += 12 * S
    t = '1,000円'
    d.text((mx - d.textlength(t, font=font('bold', 18)) / 2, by + bh + 12 * S), t, font=font('bold', 18), fill=PENCIL)
    for j, (k, v2) in enumerate((('数える額', '1,280円'), ('送料', '入れない'))):
        yy = by + bh + 50 * S + j * 36 * S
        d.text((x0 + 22 * S, yy), k, font=font('bold', 23), fill=INK)
        d.text((x1 - 22 * S - d.textlength(v2, font=font('black', 23)), yy), v2, font=font('black', 23), fill=INK)


def loan_doc(img, cx, top):
    """ローン：返済予定表（3,000万円・金利1％・35年）。書類に入りきるよう、共有画像では帯をのせない"""
    doc_sheet(img, cx, top, '返済予定表', '毎月の返済', '84,686', '円', ('経過', '返した額', 'のこり'),
              (('10年後', '1,016.2万円', '2,247.1万円'), ('20年後', '2,032.5万円', '1,415万円'), ('完済', '3,556.8万円', ('0万円',))))


def bmi_slip(img, cx, top):
    """BMI：身長170cm・体重65kg（22.5・普通体重）と、体重計のような目もりに針"""
    d = ImageDraw.Draw(img)
    x0, x1 = cx - 220 * S, cx + 240 * S
    y0, y1 = top - 30 * S, top + 290 * S
    d.rectangle([x0, y0, x1, y1], fill=SHEET, outline='#B4C1D2', width=2 * S)
    d.rectangle([x0, y0, x1, y0 + 10 * S], fill=INK)
    d.text((x0 + 22 * S, y0 + 24 * S), 'BMI', font=font('black', 26), fill=INK)
    tw = d.textlength('大人の目安', font=font('bold', 18))
    d.text((x1 - 22 * S - tw, y0 + 30 * S), '大人の目安', font=font('bold', 18), fill=PENCIL)
    sy = y0 + 66 * S
    d.text((x0 + 22 * S, sy + 46 * S), '普通体重', font=font('black', 28), fill=INK)
    f_v = font('black', 74)
    d.text((x1 - 22 * S - d.textlength('22.5', font=f_v), sy - 4 * S), '22.5', font=f_v, fill=RED)
    d.line([(x0 + 18 * S, sy + 92 * S), (x1 - 18 * S, sy + 92 * S)], fill=INK, width=2 * S)
    bx0, bx1, by, bh = x0 + 22 * S, x1 - 22 * S, sy + 122 * S, 22 * S
    pos = lambda v: bx0 + (bx1 - bx0) * (min(40, max(15, v)) - 15) / 25
    prev = 15
    for end, col in ((18.5, '#B9CFE6'), (25, '#FFFFFF'), (30, '#F1C9CC'), (35, '#E49AA0'), (40, '#D56B74')):
        d.rectangle([pos(prev), by, pos(end), by + bh], fill=col)
        prev = end
    d.rectangle([bx0, by, bx1, by + bh], outline=INK, width=3 * S)
    nx = pos(22.5)
    d.polygon([(nx - 12 * S, by - 18 * S), (nx + 12 * S, by - 18 * S), (nx, by - 2 * S)], fill=INK)
    for v in (18.5, 25, 30, 35):
        t = str(v)
        d.text((pos(v) - d.textlength(t, font=font('bold', 17)) / 2, by + bh + 4 * S), t, font=font('bold', 17), fill=PENCIL)
    ty = by + bh + 40 * S
    cw2 = (x1 - x0 - 36 * S) / 2
    for i, (k, v2) in enumerate(zip(('標準体重', '普通体重の範囲'), ('63.6kg', '53.4〜72.1kg'))):
        cxx = x0 + 18 * S + cw2 * (i + 0.5)
        d.text((cxx - d.textlength(k, font=font('bold', 17)) / 2, ty), k, font=font('bold', 17), fill=PENCIL)
        d.text((cxx - d.textlength(v2, font=font('black', 24)) / 2, ty + 26 * S), v2, font=font('black', 24), fill=INK)
    d.line([(x0 + 18 * S + cw2, ty), (x0 + 18 * S + cw2, ty + 58 * S)], fill='#D3DCE8', width=2 * S)


def touyu_slip(img, cx, top, days, month, cans, liters, cells):
    """灯油代：青いポリタンクの絵（ラベルに18Lで何日）と1か月の灯油代、1か月に使うポリタンクの数"""
    blue, dark = '#2E6FB7', '#1D4F8C'

    def tank(d, x, y):
        x += 16 * S
        u = 1.2 * S  # サイトの SVG（120×140）の1を何pxにするか
        R = lambda a, b, w, h: [x + a * u, y + b * u, x + (a + w) * u, y + (b + h) * u]
        d.rounded_rectangle(R(16, 2, 50, 32), radius=9 * u, fill=blue)
        d.rounded_rectangle(R(25, 10, 32, 13), radius=5 * u, fill='#FFFFFF')
        d.rectangle(R(80, 10, 20, 20), fill=blue)
        d.rounded_rectangle(R(76, 2, 28, 11), radius=3 * u, fill=INK)
        d.rounded_rectangle(R(4, 26, 112, 112), radius=11 * u, fill=blue)
        for yy in (44, 128):
            d.line([(x + 10 * u, y + yy * u), (x + 110 * u, y + yy * u)], fill=dark, width=3 * S)
        d.rounded_rectangle(R(18, 53, 84, 60), radius=4 * u, fill='#FFFFFF')
        cx2 = x + 60 * u
        for t, f, yy, col in (('18Lで', font('black', 16), 58, INK), (days, font('black', 34), 72, RED)):
            d.text((cx2 - d.textlength(t, font=f) / 2, y + yy * u), t, font=f, fill=col)

    def can_row(d, x, y):
        for i in range(int(cans) + (1 if cans % 1 else 0)):
            bx = x + i * 24 * S
            f = min(1, cans - i)
            d.rounded_rectangle([bx, y + 4 * S, bx + 16 * S, y + 26 * S], radius=3 * S, fill='#D5E2F2')
            d.rounded_rectangle([bx, y + 4 * S + 22 * S * (1 - f), bx + 16 * S, y + 26 * S], radius=3 * S, fill=blue)
            d.rectangle([bx + 3 * S, y, bx + 9 * S, y + 4 * S], fill=blue)
        d.text((x, y + 36 * S), liters, font=font('bold', 19), fill=PENCIL)

    pic_slip(img, cx, top, '灯油代', tank, '1か月', month, '円', can_row, ('1時間', '1日', '1L'), cells, pre='約')


def denki_slip(img, cx, top, name, mode, watt, hours):
    """家電別の電気代：電気代のお知らせ（単価31円・1か月30日。ページの計算と同じ）"""
    hour = watt * 31 / 1000
    kwh = watt * hours * 30 / 1000
    fmt0 = lambda x: f'{round(x):,}'
    fmt1 = lambda x: (f'{x:,.1f}'.rstrip('0').rstrip('.'))
    digits = f'{kwh:.1f}'.replace('.', '').rjust(5, '0')
    meter_slip(img, cx, top, f'{name} {mode} {watt:,}W・1日{hours}時間', digits, fmt0(hour * hours * 30),
               (f'{fmt1(hour)}円', f'{fmt0(hour * hours) if hour * hours >= 100 else fmt1(hour * hours)}円', f'{fmt0(hour * hours * 365)}円'))


VISUALS = {
    'waribiki': price_tag, 'tanka': compare_tags, 'recipe': recipe_memo, 'kishaku': dilute_bottle,
    'fx-iji-ritsu': fx_gauge, 'fx-losscut': fx_cut, 'fx-swap': fx_swap_chart,
    'rieki-ritsu': rieki_doc, 'kakeritsu': kakeritsu_doc, 'seisou-jikan': seisou_doc, 'seisou-mitsumori': mitsumori_doc, 'zangyo-dai': zangyo_doc, 'zangyo-gekkyu': zangyo_gekkyu_doc,
    # 割引計算・実質単価の比較の下のページ（10/21）
    'warikan': lambda img, cx, top: receipt(img, cx, top, [('1人', '3,400', '')], [1, 1, 1], [('合計', '10,000円'), ('集める（3人分）', '10,200円'), ('おつり', '200円')]),
    'warikan-keisha': lambda img, cx, top: receipt(img, cx, top, [('多め', '8,600', '× 1人'), ('ふつう', '4,300', '× 4人'), ('少なめ', '2,200', '× 2人')],
                                                    [1, 0.5, 0.5, 0.5, 0.5, 0.26, 0.26], [('合計', '30,000円'), ('おつり', '200円')]),
    'enbun-noudo': salt_slip,
    'percent': percent_slip,
    'nissu': nissu_slip, 'nenrei': nenrei_slip, 'jikan': jikan_slip, 'loan': loan_doc, 'bmi': bmi_slip,
    'gakureki': rireki_sheet, 'wareki': wareki_slip,
    'furusato': furusato_doc, 'furusato-nenshu': furusato_nenshu_doc, 'furusato-fuufu': furusato_fuufu_doc, 'furusato-uchiwake': furusato_uchiwake_doc, 'furusato-jougen': furusato_jougen_doc,
    'furusato-memo': furusato_memo_doc, 'furusato-onestop': furusato_onestop_doc, 'furusato-shimekiri': furusato_shimekiri_doc, 'furusato-seido': furusato_seido_doc,
    'point': point_card, 'point-spu': spu_card, 'point-taishou': taishou_card,
    'point-shikumi': floors_card('今月のポイント', '12倍', (('キャンペーン', 1360, '#D98A90'), ('SPU', 1662, RED), ('いつもの1倍', 272, INK)), 'ポイント', '3,294', ''),
    'point-amazon': floors_card('ポイントくらべ', '4倍・3%', (('楽天', 1116, RED), ('Amazon', 900, INK)), '楽天が多い', '216', '3万円・5と0のつく日とプライム会員'),
    # 返礼品（楽天から取ったデータで作るときだけ公開。共有画像は HENREIHIN=api python3 scripts/make-images.py で作る）
    'furusato-henreihin': henreihin_doc('返礼品', 'kg', (('5kg×3袋', '3万円', ('5kg',)), ('1.5kg', '1.5万円', ('1kg',)), ('12ロール×8', '2万円', ('48ロール',)))),
    'furusato-kome': henreihin_doc('お米', 'kg', (('5kg×3袋', '3万円', ('5kg',)), ('10kg', '1.7万円', ('5.9kg',)), ('2kg', '6,000円', ('3.3kg',)))),
    'furusato-niku': henreihin_doc('肉', 'kg', (('500g×3', '1.5万円', ('1kg',)), ('4kg', '1.6万円', ('2.5kg',)), ('800g', '3万円', ('0.27kg',)))),
    'furusato-gyokai': henreihin_doc('魚介', 'kg', (('1kg', '1.8万円', ('0.56kg',)), ('250g×2', '2万円', ('0.25kg',)), ('500g×4', '1.2万円', ('1.7kg',)))),
    'furusato-nichiyouhin': henreihin_doc('日用品', 'ロール', (('12ロール×8', '1.6万円', ('60ロール',)), ('5箱×12', '1.4万円', ('43箱',)), ('18ロール×4', '1.3万円', ('55ロール',)))),
    'shohizei': lambda img, cx, top: receipt(img, cx, top, [('税込', '2,178', '')], [], [('税抜', '1,980円'), ('消費税（10%）', '198円'), ('税込', '2,178円')]),
    'touyu-dai': lambda img, cx, top: touyu_slip(img, cx, top, '7.5日', '10,252', 4.0, '1か月 72L・18L缶 4本', ('42.7円', '342円', '142.4円')),
    'denki-dai': lambda img, cx, top: meter_slip(img, cx, top, 'こたつ 600W・1日8時間', '01440', '4,464', ('18.6円', '149円', '54,312円')),
    # 電気代の計算の下のページ（家電別）
    'kotatsu': lambda img, cx, top: denki_slip(img, cx, top, 'こたつ', '強', 180, 8),
    'denki-moufu': lambda img, cx, top: denki_slip(img, cx, top, '電気毛布', '強', 32, 8),
    'hot-carpet': lambda img, cx, top: denki_slip(img, cx, top, 'カーペット', '高', 471, 8),
    'ceramic-heater': lambda img, cx, top: denki_slip(img, cx, top, 'ヒーター', '強', 1170, 4),
    'oil-heater': lambda img, cx, top: denki_slip(img, cx, top, 'オイルヒーター', '弱', 600, 8),
    'waribiki-ritsu': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '15', '%オフ', '300円 おトク！', None),
    # 率ごとの割引（10/27）
    'waribiki-10': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '1,800', '円', '200円 おトク！', '10%'),
    'waribiki-15': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '1,700', '円', '300円 おトク！', '15%'),
    'waribiki-20': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '1,600', '円', '400円 おトク！', '20%'),
    'waribiki-30': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '1,400', '円', '600円 おトク！', '30%'),
    'waribiki-40': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '1,200', '円', '800円 おトク！', '40%'),
    'waribiki-50': lambda img, cx, top: price_tag(img, cx, top, '元の値段 2,000円', '1,000', '円', '1,000円 おトク！', '50%'),
    'matomegai': lambda img, cx, top: compare_tags(img, cx, top, (('A', '56.2', '6本 1,180円', True), ('B', '59.4', '1本 208円', False)), '100mlあたり'),
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


def favicon(path):
    """ブラウザのタブ用：白地に赤い「計」のはんこだけ（public/favicon.svg と同じ形）。16・32・48px を1つの .ico に"""
    big = 48 * 8
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    logo(img, big / 2, big / 2, big)
    img.save(path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('wrote', path.relative_to(ROOT))


# トップ・固定ページの共有画像：サイトの決めの1枚（10/26 しょーくんが3案から「B 切り紙」をえらんだ）に、左の方眼の所へ字をのせる
# 絵は Canva の generate-image で作ったもの（字・数字・人なし。2000×1000）。作り直すときの prompt：
#   Cut paper collage illustration on a white notebook page with a faint light blue square grid: a measuring cup, a blank price tag
#   with a string, a small calculator with plain blank keys, and a pencil, each made from layered matte colored paper in navy blue,
#   white, warm red and soft yellow, with crisp scissor-cut edges and very subtle paper shadows. Simple, calm, handmade feeling, flat
#   lighting. Wide panoramic composition: the paper objects are grouped on the right half, the left half is empty grid paper.
#   No people, no hands, no faces, no animals, no text, no letters, no numbers, no digits, no logos, no brand names.
#   （LANDSCAPE_2_1 → あそびトークの docs/eyecatch.md の手順で 2000×1000 に書き出す）
def og_home(path):
    art = Image.open(ROOT / 'scripts' / 'art' / 'ogp-kirigami.jpg').convert('RGB')
    img = art.crop((95, 0, 2000, 1000)).resize((1200 * S, 630 * S), Image.LANCZOS).convert('RGBA')
    d = ImageDraw.Draw(img)
    x, y = 70 * S, 150 * S
    logo(img, x + 32 * S, y + 34 * S, 64 * S)
    d.text((x + 80 * S, y), 'サクッと計算', font=font('black', 60), fill=INK)
    sub, f_sub = '暮らしの計算ツール', font('black', 40)
    y2 = y + 120 * S
    d.rectangle([x - 4 * S, y2 + 30 * S, x + d.textlength(sub, font=f_sub) + 6 * S, y2 + 54 * S], fill=MARKER)
    d.text((x, y2), sub, font=f_sub, fill=INK)
    f = font('bold', 26)
    d.text((x, y2 + 84 * S), '割引・割り勘・電気代・薄め方・', font=f, fill=PENCIL)
    d.text((x, y2 + 124 * S), '残業代・FXを計算できます', font=f, fill=PENCIL)
    d.text((x, 540 * S), 'sakutto-keisan.com', font=f, fill=PENCIL)
    img.convert('RGB').resize((1200, 630), Image.LANCZOS).save(path, quality=88, optimize=True, progressive=True)


def main():
    tools = json.loads(subprocess.check_output(
        ['node', '--input-type=module', '-e',
         "import('./src/tools.mjs').then((m) => console.log(JSON.stringify(m.TOOLS)))"], cwd=ROOT))
    (PUBLIC / 'og').mkdir(parents=True, exist_ok=True)
    og_home(PUBLIC / 'og' / 'default.jpg')
    for t in tools:
        if t.get('published'):
            title = t.get('ogTitle') or t['name'].split('（')[0]
            og(PUBLIC / 'og' / f"{t['slug']}.png", title, t['short'], CATEGORY_THEME.get(t['category'], 'home'), t['slug'])
    icon(PUBLIC / 'icon-192.png', 192)
    icon(PUBLIC / 'icon-512.png', 512)
    icon(PUBLIC / 'apple-touch-icon.png', 180)
    favicon(PUBLIC / 'favicon.ico')


if __name__ == '__main__':
    main()
