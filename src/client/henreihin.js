import { fmt } from '../lib/number.mjs';
import { memoParse, memoLeftOf, jstDate, nenmatsuDaysLeft, readNokori } from '../lib/furusato-memo.mjs';
import { hrNextState, hrMaxOf } from './henreihin-shibori.mjs';

// ふるさと納税の返礼品：寄付額のマス（1万円・2万円・3万円まで・すべて）か、寄付メモの残りで一覧をしぼる
// 一覧はビルドのときに楽天から取ったもの。ここでは見せる行を切りかえるだけ（どこにも送らない）
// 寄付メモ（localStorage の sakutto-furusato-memo）は、この端末の中で読むだけ
const tiles = [...document.querySelectorAll('.hr-price .tile')];
const memoBtn = document.getElementById('hr-memo');
const today = jstDate(new Date());
let state = { max: 0, memo: false };

function memoLeft() {
  try {
    return memoLeftOf(memoParse(localStorage.getItem('sakutto-furusato-memo') || '{}'), today.y);
  } catch {
    return null;
  }
}
// 寄付メモの「返礼品」から来たとき（#nokori=…）は、チェック欄を入れて開く
const fromMemo = readNokori(location.hash);
if (fromMemo) {
  try { history.replaceState(null, '', location.pathname); } catch { /* 何もしない */ }
}
const left = memoLeft();

function show() {
  const max = hrMaxOf(state, left);
  tiles.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.max) === state.max)));
  if (memoBtn) memoBtn.setAttribute('aria-pressed', String(state.memo));
  document.querySelectorAll('.hr-group').forEach((g) => {
    let n = 0;
    g.querySelectorAll('.hr-row').forEach((r) => {
      const on = !max || Number(r.dataset.price) <= max;
      r.hidden = !on;
      if (on) n++;
    });
    const none = g.querySelector('.hr-none');
    if (none) none.hidden = n > 0;
  });
}

tiles.forEach((t) =>
  t.addEventListener('click', () => {
    state = hrNextState(state, { tile: Number(t.dataset.max) });
    show();
  }),
);

if (memoBtn && left) {
  document.getElementById('hr-left').textContent = fmt(left);
  memoBtn.parentElement.hidden = false;
  memoBtn.addEventListener('click', () => {
    state = hrNextState(state, { memo: true });
    show();
  });
  if (fromMemo) {
    state = hrNextState(state, { memo: true });
    show();
  }
}

// 11月1日〜12月31日だけ、今年の寄付の締め切りまでの日数
const due = document.getElementById('hr-due');
const days = nenmatsuDaysLeft(today);
if (due && days !== null) {
  document.getElementById('hr-days').textContent = days ? `あと${days}日` : '今日が最終日';
  due.hidden = false;
}
