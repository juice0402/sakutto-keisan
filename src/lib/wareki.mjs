import { ERAS, etoOf, parseYmd, dayNum, dateOfDay } from './hizuke.mjs';

// 和暦・西暦の変換（ブラウザとテストの両方で使う）
// 年で変換する。改元の年（1912・1926・1989・2019年）は、その年の終わりの元号にして、前の元号の最後の日を添える
// 明治は、慶応4年を明治元年とした（国立天文台 暦Wiki）ので、1868年から。明治5年までは旧暦なので、月日は西暦とずれる
// 令和の終わりは決まっていないので、2200年（令和182年）までを、令和が続いたときの年として出す

export const WAREKI_MAX = 2200;
export const JIKKAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const JIKKAN_YOMI = ['きのえ', 'きのと', 'ひのえ', 'ひのと', 'つちのえ', 'つちのと', 'かのえ', 'かのと', 'みずのえ', 'みずのと'];

/** 元号（古い順）：name・はじまりの年・西暦との差（y0。和暦の年 ＋ y0 ＝ 西暦）・最後の年（last）・前の元号の最後の日（prevEnd）・はじまりの日（start） */
export const ERA_TABLE = [...ERAS].reverse().map((e, i, all) => {
  const start = parseYmd(e.start);
  const next = all[i + 1];
  const y0 = start.y - 1;
  return {
    name: e.name,
    start,
    y0,
    last: next ? Number(next.start.slice(0, 4)) - y0 : WAREKI_MAX - y0,
    prevEnd: i > 0 ? dateOfDay(dayNum(start) - 1) : null,
  };
});
const eraByName = (name) => ERA_TABLE.find((e) => e.name === name);

/** 六十干支（2026年は丙午・ひのえうま） */
export function kanshiOf(y) {
  const k = (((y - 4) % 10) + 10) % 10;
  const e = etoOf(y);
  return { kanji: JIKKAN[k] + e.kanji, yomi: JIKKAN_YOMI[k] + e.yomi };
}

/**
 * 元号の年表の区切り（上から明治〜令和。高さ150）。どの元号にも名前が入るように、高さの一部は5つで同じに分け、残りを年数で分ける
 * end：令和の帯のおわりの年（今年の6年後か、入れた年の次の次の年）
 */
export function nenpyoLayout(end) {
  const MIN = 18;
  const H = 150;
  const spans = ERA_TABLE.map((e, i) => ({ from: i === 0 ? 1868 : e.start.y, to: ERA_TABLE[i + 1] ? ERA_TABLE[i + 1].start.y : end }));
  const total = spans.reduce((sum, x) => sum + (x.to - x.from), 0);
  let top = 0;
  return spans.map((x) => {
    const h = MIN + ((x.to - x.from) / total) * (H - MIN * spans.length);
    const r = { ...x, top, h };
    top += h;
    return r;
  });
}

/** 年表の中の、その年のまん中の高さ */
export function nenpyoY(layout, y) {
  const r = layout.find((x) => y < x.to) || layout[layout.length - 1];
  return r.top + ((y + 0.5 - r.from) / (r.to - r.from)) * r.h;
}

/** 和暦の年の書き方（1年は「元年」） */
export const nenText = (era, nen) => `${era}${nen === 1 ? '元' : nen}年`;

/** 元号が続いていたとして数えた、その西暦の年の和暦の年（「今年は平成何年」のよくある質問） */
export const nenIfContinued = (era, y) => y - Number(ERAS.find((e) => e.name === era).start.slice(0, 4)) + 1;

/**
 * @param {{from:'seireki'|'wareki'|null, seireki?:number|null, era?:string|null, nen?:number|null, thisYear:number}} p
 *   from：あとから入れたほう　seireki：西暦の年　era・nen：元号と和暦の年　thisYear：今年（ブラウザの日付）
 */
export function wareki({ from, seireki = null, era = null, nen = null, thisYear }) {
  let y;
  let e;
  if (from === 'seireki') {
    if (seireki === null) return { ok: false, empty: true, missing: 'seireki' };
    if (Number.isInteger(seireki) && seireki >= 0 && seireki < 1000) return { ok: false, empty: true, missing: 'digits' }; // 4けたを入れているとちゅう
    if (!Number.isInteger(seireki) || seireki < 1868 || seireki > WAREKI_MAX) return { ok: false, error: '西暦は1868年から2200年までにしてください。', field: 'seireki' };
    y = seireki;
    e = [...ERA_TABLE].reverse().find((x) => x.start.y <= y);
    nen = y - e.y0;
  } else if (from === 'wareki') {
    if (!era) return { ok: false, empty: true, missing: 'era' };
    if (nen === null) return { ok: false, empty: true, missing: 'nen' };
    e = eraByName(era);
    if (!Number.isInteger(nen) || nen < 1) return { ok: false, error: '和暦の年は、1や31のように入れてください。', field: 'wareki' };
    if (nen > e.last) {
      return { ok: false, error: e.name === '令和' ? '2200年（令和182年）までにしてください。' : `${e.name}は${e.last}年までです。`, field: 'wareki' };
    }
    y = e.y0 + nen;
  } else {
    return { ok: false, empty: true, missing: 'seireki' };
  }
  // 改元の年は、前の元号の最後の日か、次の元号のはじまりの日を添える
  const prev = ERA_TABLE[ERA_TABLE.indexOf(e) - 1];
  const next = ERA_TABLE[ERA_TABLE.indexOf(e) + 1];
  let note = '';
  if (from === 'wareki' && next && nen === e.last) note = `${next.start.m}月${next.start.d}日からは${next.name}元年`;
  else if (nen === 1 && prev) note = `${e.prevEnd.m}月${e.prevEnd.d}日までは${nenText(prev.name, prev.last)}`;
  if (!note && y <= 1872) note = '明治5年までは旧暦で、月日はずれます';
  if (!note && y > thisYear) note = '令和が続いたときの年です';
  return {
    ok: true,
    y,
    era: e.name,
    nen,
    text: nenText(e.name, nen),
    note,
    eto: etoOf(y),
    kanshi: kanshiOf(y),
    ago: thisYear - y, // 何年前（マイナスは何年後）
  };
}
