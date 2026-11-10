// 返礼品のページ：寄付額のマスと「寄付メモの残り」のチェック欄の切りかえ（DOM なし。テストでも使う）
// どちらか1つだけが効く。チェック欄を入れるとマスは「すべて」の扱い、マスを押すとチェックを外す

/** 押したあとの状態。state = { max, memo }、act = { tile: 額 } か { memo: true } */
export function hrNextState(state, act) {
  if (act.memo) return { max: 0, memo: !state.memo };
  return { max: act.tile, memo: false };
}

/** 一覧をしぼる額（0 はしぼらない） */
export const hrMaxOf = (state, left) => (state.memo && left > 0 ? left : state.max);
