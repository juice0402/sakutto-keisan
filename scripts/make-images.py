#!/usr/bin/env python3
"""SNSで共有したときの画像（OGP）と、ホーム画面用のアイコンを作る。

使い方（Claude の作業環境で。Pillow と日本語フォント Noto Sans CJK が必要）:
    python3 scripts/make-images.py
できるもの:
    public/og/default.png        トップ・固定ページ用（1200×630）
    public/og/<slug>.png         公開中の各ツール用（1200×630）
    public/icon-192.png / icon-512.png   ホーム画面用（manifest）
ツールを公開したら、このスクリプトを動かして画像もコミットする（全ページ点検が画像の有無を確かめる）。
"""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
FONT_DIR = Path('/usr/share/fonts/opentype/noto')
BRAND = '#E8590C'
S = 2  # 2倍で描いて縮小（線をなめらかに）

THEMES = {  # src/styles/site.css のテーマの色と合わせる
    'home': dict(bg='#FAF9F6', text='#1F1F1C', muted='#64635C', card='#FFFFFF'),
    'seikatsu': dict(bg='#FFF8EF', text='#2B2420', muted='#76675B', card='#FFFFFF'),
    'shigoto': dict(bg='#F4F6FA', text='#1B2333', muted='#5B6475', card='#FFFFFF'),
    'fx': dict(bg='#0D1117', text='#E6EDF3', muted='#8B949E', card='#161B22'),
}
CATEGORY_THEME = {'seikatsu': 'seikatsu', 'shigoto': 'shigoto', 'fx': 'fx'}


def font(weight, size):
    name = {'regular': 'NotoSansCJK-Regular.ttc', 'bold': 'NotoSansCJK-Bold.ttc', 'black': 'NotoSansCJK-Black.ttc'}[weight]
    return ImageFont.truetype(str(FONT_DIR / name), size * S, index=0)  # index 0 = 日本語


def logo(d, x, y, size):
    """サイトのマーク（オレンジの角丸に ＋− ×＝）"""
    k = size / 32
    d.rounded_rectangle([x, y, x + size, y + size], radius=8 * k, fill=BRAND)
    w = max(2, round(2.2 * k))
    for x1, y1, x2, y2 in [(9, 10.5, 15, 10.5), (12, 7.5, 12, 13.5), (17.5, 10.5, 23.5, 10.5),
                           (9.6, 19.6, 14.4, 24.4), (14.4, 19.6, 9.6, 24.4), (17.5, 20, 23.5, 20), (17.5, 24, 23.5, 24)]:
        d.line([(x + x1 * k, y + y1 * k), (x + x2 * k, y + y2 * k)], fill='white', width=w)
        r = w / 2
        for px, py in ((x1, y1), (x2, y2)):
            d.ellipse([x + px * k - r, y + py * k - r, x + px * k + r, y + py * k + r], fill='white')


def price_tag(img, cx, top):
    """割引計算の値札（サイトの値札と同じ見た目）"""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = 420 * S, 312 * S
    x0, y0 = cx - w // 2, top
    d.line([(cx, y0 - 70 * S), (cx, y0 + 28 * S)], fill='#9C8F84', width=4 * S)  # ひも
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=28 * S, fill='#FFF3BF', outline='#E9D48A', width=3 * S)
    d.ellipse([cx - 13 * S, y0 + 16 * S, cx + 13 * S, y0 + 42 * S], fill='#FFFFFF')  # 穴
    d.line([(cx, y0 - 70 * S), (cx, y0 + 29 * S)], fill='#9C8F84', width=4 * S)
    f_was, f_price, f_yen, f_save = font('bold', 30), font('black', 104), font('black', 44), font('black', 32)
    was = '元の値段 2,000円'
    tw = d.textlength(was, font=f_was)
    d.text((cx - tw / 2, y0 + 62 * S), was, font=f_was, fill='#7A6B5D')
    sx = cx - tw / 2 + d.textlength('元の値段 ', font=f_was)
    d.line([(sx, y0 + 84 * S), (cx + tw / 2, y0 + 80 * S)], fill='#E03131', width=4 * S)
    pw, yw = d.textlength('1,400', font=f_price), d.textlength('円', font=f_yen)
    px = cx - (pw + yw + 6 * S) / 2
    d.text((px, y0 + 92 * S), '1,400', font=f_price, fill='#E03131')
    d.text((px + pw + 6 * S, y0 + 150 * S), '円', font=f_yen, fill='#E03131')
    save = '600円 おトク！'
    sw = d.textlength(save, font=f_save)
    d.rounded_rectangle([cx - sw / 2 - 26 * S, y0 + 236 * S, cx + sw / 2 + 26 * S, y0 + 288 * S], radius=26 * S, fill='#FFFFFF')
    d.text((cx - sw / 2, y0 + 240 * S), save, font=f_save, fill='#E03131')
    layer = layer.rotate(3, center=(cx, top), resample=Image.BICUBIC)
    # 赤い丸の「30%OFF」
    b = Image.new('RGBA', img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(b)
    bx, by, r = x0 + w - 20 * S, y0 - 10 * S, 74 * S
    bd.ellipse([bx - r - 6 * S, by - r - 6 * S, bx + r + 6 * S, by + r + 6 * S], fill='#FFFFFF')
    bd.ellipse([bx - r, by - r, bx + r, by + r], fill='#E03131')
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
        lab = f'{k} がおトク！' if win else k
        lw = ld.textlength(lab, font=f_lab)
        ld.rounded_rectangle([tx - lw / 2 - 18 * S, top - 30 * S, tx + lw / 2 + 18 * S, top + 14 * S], radius=22 * S,
                             fill='#E03131' if win else '#FFFFFF', outline=None if win else '#E5E3DC', width=2 * S)
        ld.text((tx - lw / 2, top - 28 * S), lab, font=f_lab, fill='#FFFFFF' if win else '#76675B')
        ld.line([(tx, top + 14 * S), (tx, y0 + 26 * S)], fill='#9C8F84', width=3 * S)
        bg, line, text = ('#FFF3BF', '#E9D48A', '#E03131') if win else ('#F1EFEA', '#DDD8CF', '#9C948A')
        ld.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=24 * S, fill=bg, outline=line, width=3 * S)
        ld.ellipse([tx - 10 * S, y0 + 14 * S, tx + 10 * S, y0 + 34 * S], fill='#FFFFFF')
        for t, f, y, c in (('100gあたり', f_base, 56, '#7A6B5D'), (sub, f_sub, 184, '#7A6B5D')):
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
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#FFFFFF', outline='#E8590C' if new else '#EAD9C4', width=(5 if new else 3) * S)
    ri = r * 16 / 22
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], outline='#F3E6D6', width=3 * S)
    k = r / 22
    d.chord([cx - 12.5 * k, cy - 8 * k, cx + 12.5 * k, cy + 17 * k], 180, 360, fill='#FFC04D')
    d.rounded_rectangle([cx - 12.5 * k, cy + 3.5 * k, cx + 12.5 * k, cy + 6.5 * k], radius=1.5 * k, fill='#FFC04D')
    d.line([(cx - 8 * k, cy - 1.5 * k), (cx - 2.7 * k, cy - 3.2 * k), (cx + 2.7 * k, cy - 1.5 * k), (cx + 8 * k, cy - 3.2 * k)], fill='#E03131', width=3 * S, joint='curve')


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
    ld.rounded_rectangle([x0 + 6 * S, y0 + 10 * S, x0 + w + 6 * S, y0 + h + 10 * S], radius=10 * S, fill=(120, 70, 20, 28))  # 影
    ld.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=10 * S, fill='#FFFDF8', outline='#EFE2D1', width=2 * S)
    f_title, f_name, f_amt, f_unit = font('black', 34), font('bold', 30), font('black', 40), font('black', 26)
    title = '4人分の材料'
    tw = ld.textlength(title, font=f_title)
    ld.text((cx - tw / 2, y0 + 30 * S), title, font=f_title, fill='#2B2420')
    rows = [('鶏もも肉', '', '600g'), ('玉ねぎ', '', '2個'), ('しょうゆ', '大さじ', '4')]
    for i, (name, pre, amt) in enumerate(rows):
        y = y0 + (96 + i * 64) * S
        ld.text((x0 + 30 * S, y + 6 * S), name, font=f_name, fill='#2B2420')
        aw = ld.textlength(amt, font=f_amt)
        pw = ld.textlength(pre, font=f_unit) if pre else 0
        ax = x0 + w - 30 * S - aw
        ld.text((ax, y), amt, font=f_amt, fill='#C2410C')
        if pre:
            ld.text((ax - pw - 2 * S, y + 12 * S), pre, font=f_unit, fill='#C2410C')
        if i < len(rows) - 1:
            for dx in range(int(x0 + 24 * S), int(x0 + w - 24 * S), 14 * S):
                ld.line([(dx, y + 58 * S), (dx + 7 * S, y + 58 * S)], fill='#E8D8C4', width=2 * S)
    # マスキングテープ
    tape = Image.new('RGBA', img.size, (0, 0, 0, 0))
    td = ImageDraw.Draw(tape)
    td.rectangle([cx - 70 * S, y0 - 16 * S, cx + 70 * S, y0 + 18 * S], fill=(232, 89, 12, 80))
    tape = tape.rotate(3, center=(cx, y0), resample=Image.BICUBIC)
    layer = layer.rotate(-2, center=(cx, y0), resample=Image.BICUBIC)
    img.alpha_composite(layer)
    img.alpha_composite(tape)


def dilute_bottle(img, cx, top):
    """希釈率：ボトルに原液（黄色）と水（水色）＋「10倍」のラベル、横に原液と水の量"""
    d = ImageDraw.Draw(img)
    bx = cx - 150 * S  # ボトルのまん中
    bw, bh = 150 * S, 250 * S
    x0, y0 = bx - bw // 2, top + 40 * S
    d.rounded_rectangle([bx - 26 * S, top - 20 * S, bx + 26 * S, top + 4 * S], radius=8 * S, fill='#C2410C')  # ふた
    d.rectangle([bx - 20 * S, top + 4 * S, bx + 20 * S, y0 + 4 * S], fill='#FFFFFF', outline='#B6D6EA', width=4 * S)
    # 中身（下の1割が原液・その上が水）
    body = Image.new('L', img.size, 0)
    ImageDraw.Draw(body).rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=38 * S, fill=255)
    liq = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(liq)
    ld.rectangle([x0, y0, x0 + bw, y0 + bh], fill='#FFFFFF')
    full = y0 + bh * 0.16
    conc = y0 + bh - bh * 0.84 * 0.1 - 18 * S
    ld.rectangle([x0, full, x0 + bw, conc], fill='#B4DBF6')
    ld.rectangle([x0, conc, x0 + bw, y0 + bh], fill='#F3B04A')
    img.paste(liq, (0, 0), body)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=38 * S, outline='#B6D6EA', width=5 * S)
    # ラベル
    f_lab = font('black', 40)
    lw = d.textlength('10倍', font=f_lab)
    d.rounded_rectangle([x0 + 16 * S, y0 + 92 * S, x0 + bw - 16 * S, y0 + 150 * S], radius=12 * S, fill='#FFFFFF')
    d.text((bx - lw / 2, y0 + 96 * S), '10倍', font=f_lab, fill='#2B2420')
    # 横の数字
    f_k, f_v = font('bold', 30), font('black', 58)
    for i, (k, v, color) in enumerate([('原液', '100ml', '#F0A63A'), ('水', '900ml', '#A8D5F4')]):
        y = top + 60 * S + i * 120 * S
        tx = cx - 30 * S
        d.rounded_rectangle([tx, y + 12 * S, tx + 26 * S, y + 38 * S], radius=6 * S, fill=color)
        d.text((tx + 38 * S, y + 4 * S), k, font=f_k, fill='#2B2420')
        d.text((tx, y + 46 * S), v, font=f_v, fill='#C2410C')


VISUALS = {'waribiki': price_tag, 'tanka': compare_tags, 'recipe': recipe_memo, 'kishaku': dilute_bottle}


def og(path, title, sub, theme, slug=None):
    t = THEMES[theme]
    W, H = 1200 * S, 630 * S
    img = Image.new('RGBA', (W, H), t['bg'])
    d = ImageDraw.Draw(img)
    has_visual = slug in VISUALS
    left = 80 * S
    logo(d, left, 64 * S, 64 * S)
    d.text((left + 84 * S, 68 * S), 'サクッと計算', font=font('black', 40), fill=t['text'])
    max_w = (540 if has_visual else 1040) * S
    size = 108
    while d.textlength(title, font=font('black', size)) > max_w and size > 56:
        size -= 4
    d.text((left, 210 * S), title, font=font('black', size), fill=t['text'])
    # 説明は2行まで（長ければ折り返し）
    f_sub = font('bold', 34 if has_visual else 38)
    max_w = (540 if has_visual else 1040) * S
    lines, cur = [], ''
    for ch in sub:
        if d.textlength(cur + ch, font=f_sub) > max_w:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    lines.append(cur)
    for i, line in enumerate(lines[:2]):
        d.text((left, (220 + size + 30 + i * 56) * S), line, font=f_sub, fill=t['muted'])
    d.text((left, 540 * S), 'sakutto-keisan.com', font=font('bold', 30), fill=t['muted'])
    d.rectangle([0, H - 14 * S, W, H], fill=BRAND)
    if has_visual:
        VISUALS[slug](img, 910 * S, 200 * S)
    # 色数をへらして軽く（平らな絵なので見た目はほぼ変わらない）
    img.convert('RGB').resize((1200, 630), Image.LANCZOS).quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    print('wrote', path.relative_to(ROOT))


def icon(path, px):
    """ホーム画面用（マスクで丸く切られても欠けないよう、マークは中央 60%）"""
    big = px * 4
    img = Image.new('RGB', (big, big), BRAND)
    d = ImageDraw.Draw(img)
    inner = big * 0.62
    logo(d, (big - inner) / 2, (big - inner) / 2, inner)
    img.resize((px, px), Image.LANCZOS).save(path, optimize=True)
    print('wrote', path.relative_to(ROOT))


def main():
    tools = json.loads(subprocess.check_output(
        ['node', '--input-type=module', '-e',
         "import('./src/tools.mjs').then((m) => console.log(JSON.stringify(m.TOOLS)))"], cwd=ROOT))
    (PUBLIC / 'og').mkdir(parents=True, exist_ok=True)
    og(PUBLIC / 'og' / 'default.png', 'よく使う計算を、ひとつに。', '割引・単価・FXの証拠金など、スマホでサクッと使える無料の計算ツール集', 'home')
    for t in tools:
        if t.get('published'):
            title = t['name'].split('（')[0]  # 「実質単価（どっちが得？）」→「実質単価」（説明文で補う）
            og(PUBLIC / 'og' / f"{t['slug']}.png", title, t['short'], CATEGORY_THEME.get(t['category'], 'home'), t['slug'])
    icon(PUBLIC / 'icon-192.png', 192)
    icon(PUBLIC / 'icon-512.png', 512)


if __name__ == '__main__':
    main()
