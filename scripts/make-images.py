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


VISUALS = {'waribiki': price_tag}


def og(path, title, sub, theme, slug=None):
    t = THEMES[theme]
    W, H = 1200 * S, 630 * S
    img = Image.new('RGBA', (W, H), t['bg'])
    d = ImageDraw.Draw(img)
    has_visual = slug in VISUALS
    left = 80 * S
    logo(d, left, 64 * S, 64 * S)
    d.text((left + 84 * S, 68 * S), 'サクッと計算', font=font('black', 40), fill=t['text'])
    max_w = (600 if has_visual else 1040) * S
    size = 108
    while d.textlength(title, font=font('black', size)) > max_w and size > 56:
        size -= 4
    d.text((left, 210 * S), title, font=font('black', size), fill=t['text'])
    # 説明は2行まで（長ければ折り返し）
    f_sub = font('bold', 34 if has_visual else 38)
    max_w = (620 if has_visual else 1040) * S
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
        VISUALS[slug](img, 900 * S, 200 * S)
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
            og(PUBLIC / 'og' / f"{t['slug']}.png", t['name'], t['short'], CATEGORY_THEME.get(t['category'], 'home'), t['slug'])
    icon(PUBLIC / 'icon-192.png', 192)
    icon(PUBLIC / 'icon-512.png', 512)


if __name__ == '__main__':
    main()
