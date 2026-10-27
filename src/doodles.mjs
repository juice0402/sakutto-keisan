// トップの目次に置く小さな絵（ノートの余白にペンで描いた、そのツールの答えの絵）。文字は入れない。
// 線のゆれは線の形に入れる（フィルターは使わない）。色は site.css の .dd のクラス（紺のペン・赤ペン・紙・付箋）
const f = (n) => Math.round(n * 10) / 10;
const at = (cx, cy, r, deg) => [f(cx + r * Math.cos((deg * Math.PI) / 180)), f(cy + r * Math.sin((deg * Math.PI) / 180))];
// 赤ペンで手描きした丸（少し重ねて閉じる）
const loop = (cx, cy, rx, ry) =>
  `<path class="r" d="M${f(cx - rx)} ${f(cy + 0.6)} Q${f(cx - rx + 0.4)} ${f(cy - ry)} ${f(cx + 0.4)} ${f(cy - ry + 0.2)} Q${f(cx + rx)} ${f(cy - ry + 0.5)} ${f(cx + rx - 0.2)} ${f(cy)} Q${f(cx + rx - 0.4)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry - 0.1)} Q${f(cx - rx + 0.2)} ${f(cy + ry - 0.3)} ${f(cx - rx + 0.3)} ${f(cy - 0.8)} Q${f(cx - rx + 1)} ${f(cy - ry + 1.4)} ${f(cx - rx + 3.4)} ${f(cy - ry + 0.6)}"/>`;
const doc = (cls = 'fs') => `<path class="${cls}" d="M15 5.5Q36 5 57 5.6L56.6 48.5Q36 49 15.4 48.4Z"/>`;

const ETO_SPOKES = Array.from({ length: 12 }, (_, k) => {
  const [x1, y1] = at(36, 27, 11, 15 + 30 * k);
  const [x2, y2] = at(36, 27, 18.5, 15 + 30 * k);
  return `M${x1} ${y1}L${x2} ${y2}`;
}).join('');
const [etoX, etoY] = at(36, 27, 14.8, -60);
const BMI_TICKS = Array.from({ length: 9 }, (_, k) => {
  const deg = 180 + 22.5 * k;
  const [x1, y1] = at(36, 40, 22, deg);
  const [x2, y2] = at(36, 40, k % 2 ? 19.5 : 18, deg);
  return `M${x1} ${y1}L${x2} ${y2}`;
}).join('');
const arc = (cx, cy, r, d1, d2) => {
  const [x1, y1] = at(cx, cy, r, d1);
  const [x2, y2] = at(cx, cy, r, d2);
  return `M${x1} ${y1}A${r} ${r} 0 ${d2 - d1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};
const [bmiX, bmiY] = at(36, 40, 17, 245);
const [ijiX, ijiY] = at(36, 42, 15, 300);

const D = {
  // 値札（元の値段に赤い線、下に赤い新しい値段）
  waribiki: `<path class="ft" d="M13 15.5Q28 14.6 43.5 15L58 27.2L43.8 39.6Q28 40.4 13.4 39.8Q12.6 27.5 13 15.5Z"/><circle cx="48.5" cy="27.2" r="2.4"/><path d="M50.7 26Q60 18.5 66.5 21.5"/><path class="mu" d="M19 22.6H37"/><path class="r" d="M18 25.4L38.2 20"/><path class="r b" d="M20 32.4Q28 31.9 34.5 32.3"/>`,
  // レシート
  shohizei: `<path class="fs" d="M22 6.5Q36 5.8 50 6.4L50.2 44L46.7 47.5L43.2 44L39.7 47.5L36.2 44L32.7 47.5L29.2 44L25.7 47.5L22.2 44Q21.6 25 22 6.5Z"/><path class="mu" d="M26.5 13H45.5M26.5 19H41M26.5 25H44"/><path class="mu dsh" d="M26.5 31H45.5"/><path d="M26.5 37.5H30"/><path class="r b" d="M34 37.5H45.5"/>`,
  // 方眼のマスを赤でぬる
  percent: `<path class="fr fo ns" d="M19 11h35v7H19zM19 18h14v7H19z"/><path class="th" d="M19 18H54M19 25H54M19 32H54M26 11V39M33 11V39M40 11V39M47 11V39"/><path d="M19 11Q36 10.6 54 11L54 39Q36 39.4 19 39Z"/>`,
  // レシートと人数分の券
  warikan: `<path class="fs" d="M16 5.5Q36 5 56 5.6L56 43.5L53.2 46.5L50.4 43.5L47.6 46.5L44.8 43.5L42 46.5L39.2 43.5L36.4 46.5L33.6 43.5L30.8 46.5L28 43.5L25.2 46.5L22.4 43.5L19.6 46.5L16.4 43.5Q15.6 24 16 5.5Z"/><path class="mu" d="M20.5 11.5H44"/><path class="r b" d="M38 18.5H51.5"/><path class="dsh" d="M16 25.5H56M29.3 25.5V44M42.6 25.5V44"/><path class="r" d="M19.8 34.5H26M33 34.5H39.2M46.2 34.5H52.4"/>`,
  // カレンダーの日に赤ペンの丸
  nissu: `<path class="fw" d="M15 9.5Q36 9 57 9.6L56.6 47Q36 47.5 15.4 47Z"/><path class="fn ns" d="M15 9.5Q36 9 57 9.6L57 17H15Z"/><circle class="fw" cx="25" cy="9" r="2.3"/><circle class="fw" cx="47" cy="9" r="2.3"/><g class="fn ns"><circle cx="21.5" cy="23.5" r="1.6"/><circle cx="28.5" cy="23.5" r="1.6"/><circle cx="35.5" cy="23.5" r="1.6"/><circle cx="42.5" cy="23.5" r="1.6"/><circle cx="49.5" cy="23.5" r="1.6"/><circle cx="21.5" cy="31.5" r="1.6"/><circle cx="28.5" cy="31.5" r="1.6"/><circle cx="35.5" cy="31.5" r="1.6"/><circle cx="42.5" cy="31.5" r="1.6"/><circle cx="49.5" cy="31.5" r="1.6"/><circle cx="21.5" cy="39.5" r="1.6"/><circle cx="28.5" cy="39.5" r="1.6"/><circle cx="35.5" cy="39.5" r="1.6"/></g>${loop(42.5, 31.5, 5.6, 4.8)}`,
  // 干支の輪（生まれ年に赤ペンの丸）
  nenrei: `<circle class="fw" cx="36" cy="27" r="18.5"/><circle class="th" cx="36" cy="27" r="11"/><path class="th" d="${ETO_SPOKES}"/><circle class="fm ns" cx="36" cy="27" r="6.5"/>${loop(etoX, etoY, 4.4, 3.9)}`,
  // 時間の帯
  jikan: `<path class="f2 ns" d="M9 22h18v11H9z"/><path class="f3 ns" d="M27 22h13v11H27z"/><path class="fm ns" d="M40 22h12v11H40z"/><path d="M9 22Q36 21.6 63 22L63 33Q36 33.4 9 33Z"/><path class="th" d="M27 22V33M40 22V33M52 22V33M9 33v4M18 33v2.5M27 33v4M36 33v2.5M45 33v4M54 33v2.5M63 33v4"/><path class="r" d="M9 17V14Q30 13.4 52 14V17"/>`,
  // 値札と安い順の棒
  tanka: `<path class="ft" d="M6.5 14H21.5L27.5 20.5L21.5 27H6.8Q6.2 20.5 6.5 14Z"/><circle cx="23.6" cy="20.5" r="1.5"/><path class="th" d="M33 9.5V45"/><path class="fr ns" d="M33 12.5h27v6.5H33z"/><path class="f2" d="M33 24.5h19.5v6.5H33z"/><path class="f2" d="M33 36.5h12.5v6.5H33z"/>`,
  // 元号の年表と今年の赤い線
  wareki: `<path class="fs ns" d="M8 20h10v12H8zM23 20h18v12H23zM54 20h10v12H54z"/><path d="M8 20Q36 19.6 64 20L64 32Q36 32.4 8 32Z"/><path class="th" d="M18 20V32M23 20V32M41 20V32M54 20V32M8 32v4M18 32v4M23 32v4M41 32v4M54 32v4M64 32v4"/><path class="r b" d="M47.5 13.5V39"/>`,
  // テープでとめたメモと人数分のお皿
  recipe: `<path class="fw" d="M20 6Q36 5.4 52 6.2L51.6 27Q36 27.6 20.4 27Z"/><path class="f2 ns tp" d="M30 3h12v6H30z"/><path class="mu" d="M25 14H46M25 20H40"/><ellipse class="fw" cx="16.5" cy="40.5" rx="9.3" ry="4.6"/><ellipse class="fm th" cx="16.5" cy="40" rx="5" ry="2.2"/><ellipse class="fw" cx="36" cy="40.5" rx="9.3" ry="4.6"/><ellipse class="fm th" cx="36" cy="40" rx="5" ry="2.2"/><ellipse class="fw" cx="55.5" cy="40.5" rx="9.3" ry="4.6"/><ellipse class="fm th" cx="55.5" cy="40" rx="5" ry="2.2"/>`,
  // 電気代のお知らせとメーターの数字
  denki: `${doc()}<path d="M20 12H35"/><path class="fw th" d="M20 18h6v8.5h-6zM27.5 18h6v8.5h-6zM35 18h6v8.5h-6zM42.5 18h6v8.5h-6z"/><path class="fw r" d="M50 18h4.5v8.5H50z"/><path class="mu" d="M20 36.5H26M20 42.5H40"/><path class="r b" d="M31 36.5H52"/>`,
  // 体重計の目もりと針
  bmi: `<path class="fw" d="M9 42Q9 40 11 40H61Q63 40 63 42V46Q63 48.5 61 48.5H11Q9 48.5 9 46Z"/><path class="ok" d="${arc(36, 40, 18.6, 222, 272)}"/><path d="${arc(36, 40, 22, 180, 360)}"/><path class="th" d="${BMI_TICKS}"/><path class="r b" d="M36 40L${bmiX} ${bmiY}"/><circle class="fn ns" cx="36" cy="40" r="2.2"/>`,
  // ボトルに水と原液
  kishaku: `<path class="f2 ns" d="M28.2 25H44.2L44.4 38H27.8Z"/><path class="f3 ns" d="M27.8 38H44.4V46Q44.4 48.6 41.5 48.6H30.5Q27.8 48.6 27.8 46Z"/><path d="M28 13.5Q28 11.5 31 11.5H41Q44 11.5 44 13.5L44.5 46Q44.5 49 41.5 49H30.5Q27.5 49 27.5 46Z"/><path class="fw" d="M31.5 5.5h9v6h-9z"/><path class="fn ns" d="M30.5 3h11v4h-11z"/><path class="th" d="M47.5 25h3.5M47.5 31.5h2.2M47.5 38h3.5M47.5 44h2.2"/>`,
  // 明細書（二重線の金額と表）
  meisai: `${doc()}<path class="b" d="M29 11.5H43"/><path class="r b" d="M34 19H51"/><path class="th" d="M20 23H52M20 25.3H52M20 31.5H52M20 37H52M20 42.5H52M38 28.5V45"/>`,
  // 利益計算書と粗利率のはんこ
  rieki: `${doc()}<path class="b" d="M20 11.5H33"/><path class="mu" d="M20 18H32M20 23.5H30"/><circle class="r" cx="45.5" cy="20.5" r="6.8"/><circle class="r th" cx="45.5" cy="20.5" r="4.3"/><path class="f2 ns" d="M20 35h21v6.5H20z"/><path class="fr ns" d="M41 35h11v6.5H41z"/><path class="th" d="M20 35h32v6.5H20z"/>`,
  // 返済予定表（家と、元金と利息の帯）
  loan: `${doc()}<path d="M20 17.5L26 12L32 17.5V23H20Z"/><path class="mu" d="M36 15H51M36 20.5H47"/><path class="f2 ns" d="M20 29h22v6H20z"/><path class="fr ns" d="M42 29h10v6H42z"/><path class="th" d="M20 29h32v6H20zM20 40H52M20 44.5H52"/>`,
  // 封筒と赤いはんこ
  furusato: `<path class="fw" d="M11 13.5Q36 12.8 61 13.5L60.6 44Q36 44.6 11.4 44Z"/><path d="M11.4 14L36 31.5L60.6 14"/><circle class="fr ns" cx="36" cy="31.5" r="4.2"/><path class="mu" d="M16 40H27"/>`,
  // 寄付の控え（自治体の5つのマスに赤ペンのチェック）
  memo: `<path class="fs" d="M13 7Q36 6.4 59 7.2L58.6 46Q36 46.6 13.4 46Z"/><path class="mu" d="M18 14H40M18 20H34"/><path class="fw th" d="M17.5 29.5h6.5v6.5h-6.5zM26.5 29.5h6.5v6.5h-6.5zM35.5 29.5h6.5v6.5h-6.5zM44.5 29.5h6.5v6.5h-6.5zM53.5 29.5h6.5v6.5h-6.5z"/><path class="r" d="M18.8 32.6L21 35L25.6 27.6M27.8 32.6L30 35L34.6 27.6M36.8 32.6L39 35L43.6 27.6"/>`,
  // いつもの1倍・SPU・キャンペーンの3段
  shikumi: `<path class="th" d="M9 45H63"/><path class="f2" d="M13 35h10v10H13z"/><path class="f2" d="M31 35h10v10H31z"/><path class="f3" d="M31 23h10v12H31z"/><path class="f2" d="M49 35h10v10H49z"/><path class="f3" d="M49 23h10v12H49z"/><path class="fm" d="M49 11h10v12H49z"/>`,
  // 2つのポイントの棒
  hikaku: `<path class="th" d="M10 45H62"/><path class="f3" d="M19 15h13v30H19z"/><path class="f2" d="M40 27h13v18H40z"/><path class="r dsh" d="M32 15H53"/><path class="r" d="M46.5 16.5V25"/>`,
  // 買いまわりカード（10マスに赤ペンの丸）
  point: `<path class="fw" d="M9 11.5Q36 11 63 11.6L62.6 43Q36 43.5 9.4 43Z"/><g class="th"><circle cx="17" cy="21" r="3.4"/><circle cx="26.5" cy="21" r="3.4"/><circle cx="36" cy="21" r="3.4"/><circle cx="45.5" cy="21" r="3.4"/><circle cx="55" cy="21" r="3.4"/><circle cx="17" cy="33" r="3.4"/><circle cx="26.5" cy="33" r="3.4"/><circle cx="36" cy="33" r="3.4"/><circle cx="45.5" cy="33" r="3.4"/><circle cx="55" cy="33" r="3.4"/></g><g class="fr ns fo"><circle cx="17" cy="21" r="3.4"/><circle cx="26.5" cy="21" r="3.4"/><circle cx="36" cy="21" r="3.4"/><circle cx="45.5" cy="21" r="3.4"/><circle cx="55" cy="21" r="3.4"/><circle cx="17" cy="33" r="3.4"/></g>`,
  // 数える額の棒と1,000円の点線
  taishou: `<path class="f2" d="M11 15h36v10H11z"/><path class="fs" d="M11 31h20v8H11z"/><path class="dsh" d="M40 9V45"/><path class="r" d="M51 18.5L53.6 21.5L58.6 14.5"/>`,
  // 倍率の帯
  spu: `<path class="f2 ns" d="M8 21h8v11H8z"/><path class="f3 ns" d="M16 21h14v11H16z"/><path class="fm ns" d="M30 21h9v11H30z"/><path class="f2 ns" d="M39 21h6v11H39z"/><path d="M8 21Q36 20.6 64 21L64 32Q36 32.4 8 32Z"/><path class="th" d="M16 21V32M30 21V32M39 21V32"/><path class="r b" d="M45 16V37"/>`,
  // 口座の画面の半円のメーター
  iji: `<path class="mu w6" d="${arc(36, 42, 21, 180, 360)}"/><path class="w6" d="${arc(36, 42, 21, 180, 300)}"/><path class="th" d="${arc(36, 42, 13, 180, 360)}"/><path class="r b" d="M36 42L${ijiX} ${ijiY}"/><circle class="fn ns" cx="36" cy="42" r="2.2"/>`,
  // いまのレートとロスカットのライン
  losscut: `<path class="fr ns fo2" d="M8 30h56v10H8z"/><path d="M8 17L15 23L21 19.5L29 27L36 23.5L44 30L51 26.5L56 30"/><path class="dsh" d="M8 30H64"/><path class="r dsh" d="M8 40H64"/>`,
  // 1年でたまる額の階段
  swap: `<path class="f2 ns" d="M10 46V41H20V36H30V30H40V24H50V17H62V46Z"/><path d="M10 41H20V36H30V30H40V24H50V17H62"/><path class="th" d="M8 46H64"/><path class="r" d="M62 17v-4"/>`,
};

// slug → 絵
const BY_SLUG = {
  waribiki: D.waribiki, shohizei: D.shohizei, percent: D.percent, warikan: D.warikan, nissu: D.nissu, nenrei: D.nenrei,
  jikan: D.jikan, tanka: D.tanka, wareki: D.wareki, recipe: D.recipe, 'denki-dai': D.denki, bmi: D.bmi, kishaku: D.kishaku,
  'zangyo-dai': D.meisai, 'rieki-ritsu': D.rieki, loan: D.loan, furusato: D.furusato, 'furusato-memo': D.memo,
  'point-shikumi': D.shikumi, 'point-amazon': D.hikaku, point: D.point, 'point-taishou': D.taishou, 'point-spu': D.spu,
  'fx-iji-ritsu': D.iji, 'fx-losscut': D.losscut, 'fx-swap': D.swap,
};

export const doodle = (slug) =>
  BY_SLUG[slug] ? `<svg class="dd" viewBox="0 0 72 54" width="72" height="54" aria-hidden="true" focusable="false">${BY_SLUG[slug]}</svg>` : '';
