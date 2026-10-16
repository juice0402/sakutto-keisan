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
 * 読みやすい画像にする：大きすぎる写真は小さく、小さすぎるスクショは大きく。
 * 白黒にして、うすい・暗い写真はくっきりさせる（明るさの幅を広げる）。黒い背景（ダークモードのスクショ）は白黒を反転
 */
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ng) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ng(new Error('画像を開けませんでした'));
      i.src = url;
    });
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = long > 2400 ? 2400 / long : long < 1000 ? 2 : 1;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const pic = ctx.getImageData(0, 0, c.width, c.height);
    const px = pic.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < px.length; i += 4) {
      const y = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8; // 明るさ
      px[i] = y;
      hist[y]++;
    }
    const total = px.length / 4;
    let lo = 0;
    let hi = 255;
    let sum = 0;
    for (let acc = 0; lo < 255 && acc + hist[lo] < total * 0.01; lo++) acc += hist[lo];
    for (let acc = 0; hi > 0 && acc + hist[hi] < total * 0.01; hi--) acc += hist[hi];
    for (let v = 0; v < 256; v++) sum += v * hist[v];
    const invert = sum / total < 110; // 暗い背景に明るい文字
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < px.length; i += 4) {
      let y = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / span));
      if (invert) y = 255 - y;
      px[i] = px[i + 1] = px[i + 2] = y;
    }
    ctx.putImageData(pic, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 写真の文字を読み取る。onProgress(進み具合 0〜1, 読み取り中なら true)
 * @returns {Promise<string>}
 */
export async function readImageText(file, onProgress) {
  onProgress(0.02, false);
  const [image] = await Promise.all([prepareImage(file), loadOcrScript()]);
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
    await worker.setParameters({ preserve_interword_spaces: '1' }); // 日本語の文字の間に空白が入りにくくする
    const { data } = await worker.recognize(image);
    return data.text || '';
  } finally {
    await worker.terminate(); // スマホのメモリを空ける
  }
}
