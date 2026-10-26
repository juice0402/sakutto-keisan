// 数字の入力・丸め・表示の共通部品（ブラウザとテストの両方で使う）
// ※ src/lib のファイルはビルドで1つにまとめられるので、関数名はファイルをまたいで重ならないようにする

/** 入力文字列を数字にする。空なら null、数字でなければ NaN。全角・カンマ・単位はOK */
export function parseNum(input) {
  if (input === null || input === undefined) return null;
  let s = String(input)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .replace(/[−－ー‐]/g, '-')
    .replace(/[,，、\s円%％]/g, '');
  if (s === '') return null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

/** 小数の誤差（0.1+0.2 など）を消す */
export const fix = (x) => Number(x.toFixed(10));

/** 1未満の丸め。mode: floor（切り捨て）/ round（四捨五入）/ ceil（切り上げ） */
export function roundBy(x, mode = 'floor') {
  const v = fix(x);
  if (mode === 'round') return Math.sign(v) * Math.round(Math.abs(v));
  if (mode === 'ceil') return Math.ceil(v);
  return Math.floor(v);
}

/** 3桁区切りで表示（小数は maxFrac 桁まで） */
export const fmt = (x, maxFrac = 2) =>
  fix(x).toLocaleString('ja-JP', { maximumFractionDigits: maxFrac });

// 説明文（meta description）の値段は、ぴったりではなく幅で書く（検索結果に古い値段が残るので）
// 2,563 → 2,500円台、10,252 → 1万円台、980 → 980円台
export function yenBand(n) {
  if (n >= 10000) return `${fmt(Math.floor(n / 10000))}万円台`;
  const step = n >= 1000 ? 100 : 10;
  return `${fmt(Math.floor(n / step) * step)}円台`;
}
