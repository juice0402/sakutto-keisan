// 冬の家電の型番の値段（楽天市場）と、この冬の電気代（#172。ブラウザとテストとビルドで使う。DOM を触らない）
// 取り方は scripts/fetch-kaden.mjs、ページの節は src/kaden.mjs、帯を入力に合わせて変えるのは src/client/kaden.mjs
import { fmt, yenBand } from './number.mjs';

// 商品名にこの言葉が入るものは外す（本体ではないもの・新品でないもの）
export const KD_NG = ['中古', '訳あり', 'アウトレット', 'カバー', '替え', '部品', '互換', 'リモコン', 'レンタル'];
export const KD_PICK = 3; // 値段の安いほうから使う数
export const KD_LINKS = 2; // 楽天市場へのリンクの数

/** 型番くらべのならし：全角→半角（NFKC）・大文字に・いろいろなハイフンを「-」に */
export const kdNorm = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[‐-―−ーｰ-]/g, '-');

/** 型番の正規表現。ハイフンや空白はあってもなくてもよい。前後が英数字のとき（DC-3NKC など別の型番）は入れない。「用」「対応」が続くもの（付属品）も入れない */
export function kdModelRe(model) {
  const chars = [...kdNorm(model).replace(/[-\s]/g, '')].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![A-Z0-9])${chars.join('[-\\s]?')}(?![A-Z0-9])(?!\\s*(?:用|対応))`);
}

export const kdHasModel = (name, model) => kdModelRe(model).test(kdNorm(name));

/** 本体の商品だけにしぼって、値段の安いほうから n 件 */
export function kdPick(items, model, n = KD_PICK) {
  if (!Array.isArray(items)) return [];
  const re = kdModelRe(model);
  return items
    .filter((it) => it && Number(it.price) > 0 && /^https:\/\/(hb\.afl|item)\.rakuten\.co\.jp\//.test(String(it.url ?? '')))
    .filter((it) => re.test(kdNorm(it.name)) && !KD_NG.some((w) => String(it.name).includes(w)))
    .sort((a, b) => a.price - b.price)
    .slice(0, n);
}

/** 「4,900円台から」（説明文と同じ幅の書き方） */
export const kdPriceText = (price) => `${yenBand(price)}から`;

/** 取った日（日本時間）「11月6日」 */
export function kdDay(iso) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

/**
 * この冬（11月1日〜3月31日）の日数。11〜12月はその年から、1〜3月は前の年からの冬、4〜10月は次の冬
 * 2月がうるう年なら152日。日付は日本時間で見る
 */
export function kdWinter(now = new Date()) {
  const j = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = j.getUTCMonth() <= 2 ? j.getUTCFullYear() - 1 : j.getUTCFullYear();
  const end = y + 1;
  const leap = (end % 4 === 0 && end % 100 !== 0) || end % 400 === 0;
  return { start: y, days: 30 + 31 + 31 + (leap ? 29 : 28) + 31 };
}

/** この冬の電気代（円・整数） */
export const kdElec = (watt, hours, price, days) => Math.round((watt / 1000) * price * hours * days);

/** 帯の幅と字：本体の値段と、この冬の電気代 */
export function kdBand(body, elec) {
  const total = body + elec;
  const w = Number(((body / total) * 100).toFixed(1));
  return {
    total,
    parts: [
      { w, text: w >= 18 ? '本体' : '', kind: 'pay' },
      { w: Number((100 - w).toFixed(1)), text: 100 - w >= 18 ? '電気代' : '', kind: 'alt' },
    ],
    ans: `本体 ${fmt(body)}円＋この冬の電気代 約${fmt(elec)}円 → <b>約${fmt(total)}円</b>`,
  };
}

export const kdDaysText = (days) => `この冬（11月1日〜3月31日・${days}日）`;
