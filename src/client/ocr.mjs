// 写真・スクショの文字を、端末の中だけで読み取る（Tesseract.js。写真はどこにも送らない）
// 読み取りソフトと日本語のデータは、このサイトの /ocr/<版>/ に置いたもの（scripts/fetch-ocr.mjs が公開のときに用意）を、
// ボタンを押したときだけ読み込む。ページを開いたときには読み込まないので、表示の速さは変わらない

export const OCR_VERSION = '5.1.1'; // Tesseract.js の版（変えたら scripts/fetch-ocr.mjs も動かして確かめる）
const OCR_BASE = `/ocr/${OCR_VERSION}`;
let ocrScript = null;

function loadOcrScript() {
  if (!ocrScript) {
    ocrScript = new Promise((ok, ng) => {
      const s = document.createElement('script');
      s.src = `${OCR_BASE}/tesseract.min.js`;
      s.onload = ok;
      s.onerror = () => ng(new Error('読み取りソフトを読み込めませんでした'));
      document.head.appendChild(s);
    }).catch((e) => {
      ocrScript = null;
      throw e;
    });
  }
  return ocrScript;
}

/**
 * 読み取りやすい画像にする（ImageData の中身をその場で書きかえる）
 * 1. 白黒にして明るさの幅を広げる（うすい・暗い写真をくっきり）。黒い背景（ダークモードのスクショ）は反転
 * 2. 下線のような細長い横線を消す（リンクの下線が文字にくっついて読みまちがえるため）
 * 3. 黒い丸の印（Ⓐ Ⓑ）を消す（「の」「富」などに読まれるため）
 */
export function cleanImage(px, w, h, opt = {}) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const y = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8; // 明るさ
    px[i] = y;
    hist[y]++;
  }
  const total = w * h;
  let lo = 0;
  let hi = 255;
  let sum = 0;
  for (let acc = 0; lo < 255 && acc + hist[lo] < total * 0.01; lo++) acc += hist[lo];
  for (let acc = 0; hi > 0 && acc + hist[hi] < total * 0.01; hi--) acc += hist[hi];
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  const invert = sum / total < 110;
  const span = Math.max(1, hi - lo);
  const dark = new Uint8Array(total); // 1 = 文字（黒）
  for (let i = 0, k = 0; i < px.length; i += 4, k++) {
    let y = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / span));
    if (invert) y = 255 - y;
    px[i] = y;
    dark[k] = y < 128 ? 1 : 0;
  }
  const erase = (k) => {
    dark[k] = 0;
    px[k * 4] = 255;
  };
  if (opt.lines !== false) {
    const minRun = Math.max(24, Math.round(w * 0.03));
    for (let y = 3; y < h - 3; y++) {
      for (let x = 0; x < w; ) {
        if (!dark[y * w + x]) {
          x++;
          continue;
        }
        let e = x;
        while (e < w && dark[y * w + e]) e++;
        if (e - x >= minRun) {
          let thin = 0;
          for (let k = x; k < e; k++) if (!dark[(y - 3) * w + k] && !dark[(y + 3) * w + k]) thin++;
          if (thin >= (e - x) * (opt.thin || 0.85)) for (let k = x; k < e; k++) erase(y * w + k);
        }
        x = e;
      }
    }
  }
  if (opt.marks !== false) {
    // つながった黒いかたまりごとに見て、正方形に近く・中までほぼ黒い（白い文字が少しある）ものを消す
    const seen = new Uint8Array(total);
    const stack = new Int32Array(total);
    const minS = Math.max(10, Math.round(w * 0.012));
    const maxS = Math.round(w * 0.06);
    for (let start = 0; start < total; start++) {
      if (!dark[start] || seen[start]) continue;
      let n = 0;
      let top = 0;
      let x0 = w;
      let x1 = 0;
      let y0 = h;
      let y1 = 0;
      stack[top++] = start;
      seen[start] = 1;
      while (top) {
        const k = stack[--top];
        n++;
        const x = k % w;
        const y = (k - x) / w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && dark[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack[top++] = k - 1; }
        if (x < w - 1 && dark[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack[top++] = k + 1; }
        if (y > 0 && dark[k - w] && !seen[k - w]) { seen[k - w] = 1; stack[top++] = k - w; }
        if (y < h - 1 && dark[k + w] && !seen[k + w]) { seen[k + w] = 1; stack[top++] = k + w; }
      }
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      const fill = n / (bw * bh);
      if (bw >= minS && bh >= minS && bw <= maxS && bh <= maxS && Math.abs(bw - bh) <= Math.max(bw, bh) * 0.2 && fill >= 0.55 && fill <= 0.86) {
        // 丸の中の白い文字（A・B）もいっしょに消す
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) erase(y * w + x);
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) px[i + 1] = px[i + 2] = px[i];
}

/** 写真を開いて、えらんだ範囲（0〜1 の割合 {x0, y0, x1, y1}）を切り抜き、読みやすい大きさにして整える */
async function prepareImage(file, crop) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ng) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ng(new Error('画像を開けませんでした'));
      i.src = url;
    });
    const r = crop || { x0: 0, y0: 0, x1: 1, y1: 1 };
    const sx = Math.round(img.naturalWidth * r.x0);
    const sy = Math.round(img.naturalHeight * r.y0);
    const sw = Math.max(1, Math.round(img.naturalWidth * (r.x1 - r.x0)));
    const sh = Math.max(1, Math.round(img.naturalHeight * (r.y1 - r.y0)));
    const long = Math.max(sw, sh);
    const scale = long > 2400 ? 2400 / long : long < 1000 ? 2 : 1; // 大きすぎる写真は小さく、小さすぎるスクショは大きく
    const c = document.createElement('canvas');
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const pic = ctx.getImageData(0, 0, c.width, c.height);
    cleanImage(pic.data, c.width, c.height);
    ctx.putImageData(pic, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 写真の文字を読み取る。onProgress(進み具合 0〜1, 読み取り中なら true)。crop：読み取る範囲（なければ全体）
 * @returns {Promise<string>}
 */
export async function readImageText(file, onProgress, crop) {
  onProgress(0.02, false);
  const [image] = await Promise.all([prepareImage(file, crop), loadOcrScript()]);
  const worker = await window.Tesseract.createWorker('jpn', 1, {
    workerPath: `${OCR_BASE}/worker.min.js`,
    corePath: `${OCR_BASE}/core`,
    langPath: `${OCR_BASE}/lang`,
    workerBlobURL: false,
    logger: (m) => {
      const p = typeof m.progress === 'number' ? m.progress : 0;
      if (m.status === 'recognizing text') onProgress(0.4 + 0.6 * p, true);
      else if (/language/.test(m.status)) onProgress(0.1 + 0.3 * p, false);
      else onProgress(0.06, false);
    },
  });
  try {
    // 1つのかたまりとして1行ずつ読む（PSM 6）。日本語の文字の間に空白が入りにくくする
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(image);
    return data.text || '';
  } finally {
    await worker.terminate(); // スマホのメモリを空ける
  }
}
