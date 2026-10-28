"""印刷用の早見表（A4・1枚のPDF）を作る。Claude の環境で動かしてコミットする（Playwright のブラウザと日本語フォントが要る）

    python3 scripts/make-prints.py          今年と来年のぶん（年が入らない消毒液は1つ）
    python3 scripts/make-prints.py 2028     その年のぶん

HTML は src/prints.mjs（表の数字はサイトの計算とデータから）。中身が変わったものだけ作り直し、
src/data/prints.json に HTML の指紋を書く。右下のすみのQRコードは segno（pip install segno）で作って、
HTML の印 <span class="qr" data-url="…"></span> に線の絵（SVG）で入れる（サイトには読みこまない）。QRが表や字とかさなったら止まる（tests/prints.test.mjs が作り直し忘れを見張る）。去年より前の年のPDFは消す
"""
import hashlib, html, json, re, subprocess, sys
from pathlib import Path
import segno
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'print'
MANIFEST = ROOT / 'src' / 'data' / 'prints.json'

data = json.loads(subprocess.run(['node', str(ROOT / 'scripts' / 'print-html.mjs'), *sys.argv[1:]], check=True, capture_output=True, text=True).stdout)
this_year = data['thisYear']
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

QR_MARK = re.compile(r'<span class="qr" data-url="([^"]+)"></span>')


def with_qr(src):
    """QRの印を、そのURLのQRコード（SVG）にかえる。印は1つだけ"""
    urls = QR_MARK.findall(src)
    if len(urls) != 1:
        sys.exit(f'QRの印が {len(urls)} こある（1つにする）')
    url = html.unescape(urls[0])
    svg = segno.make(url, error='m', micro=False).svg_inline(border=2, omitsize=True, dark='#222')
    return QR_MARK.sub(lambda m: f'<span class="qr" title="{urls[0]}">{svg}</span>', src)


# QRコード（footer）と、ほかの字・表がかさなっていないか、ページからはみ出していないか
OVERLAP_JS = """() => {
  const page = document.querySelector('.page').getBoundingClientRect();
  const foot = document.querySelector('footer').getBoundingClientRect();
  const bad = [];
  for (const el of document.querySelectorAll('.page *')) {
    if (el.closest('footer') || !el.matches('h1,h2,p,li,th,td,header,.rule2')) continue;
    let r = el.getBoundingClientRect();
    if (el.matches('p,li,h1,h2')) { const g = document.createRange(); g.selectNodeContents(el); r = g.getBoundingClientRect(); } // 字のあるところだけ
    if (!r.width || !r.height) continue;
    if (r.bottom > page.bottom + 0.5) bad.push('はみ出し：' + el.tagName + ' ' + el.textContent.slice(0, 20));
    if (r.right > foot.left - 2 && r.left < foot.right && r.bottom > foot.top - 2 && r.top < foot.bottom) bad.push('かさなり：' + el.tagName + ' ' + el.textContent.slice(0, 20));
  }
  return bad;
}"""

made = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    for item in data['list']:
        sha = hashlib.sha256(item['html'].encode()).hexdigest()
        pdf = OUT / item['file']
        if manifest.get(item['file']) == sha and pdf.exists():
            continue
        page.set_content(with_qr(item['html']))
        page.evaluate('document.fonts.ready')
        bad = page.evaluate(OVERLAP_JS)
        if bad:
            sys.exit(f'{item["file"]}：QRコードのまわり（下の余白をふやす）\n' + '\n'.join(bad[:5]))
        page.pdf(path=str(pdf), format='A4', print_background=True, prefer_css_page_size=True, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
        pages = len(re.findall(rb'/Type\s*/Page[^s]', pdf.read_bytes()))
        if pages != 1:
            sys.exit(f'{item["file"]} が {pages} ページになった（1ページにおさめる）')
        manifest[item['file']] = sha
        made.append(item['file'])
    browser.close()

# 去年より前の年のPDFと指紋を消す
for f in sorted(OUT.glob('*-*.pdf')):
    m = re.fullmatch(r'.+-(\d{4})\.pdf', f.name)
    if m and int(m.group(1)) < this_year:
        f.unlink()
        manifest.pop(f.name, None)
        print('消した', f.name)
manifest = {k: manifest[k] for k in sorted(manifest) if (OUT / k).exists()}
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for f in made:
    print('作った', f, f'{(OUT / f).stat().st_size // 1024}KB')
if not made:
    print('変わったものはない')
