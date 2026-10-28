import { fmt } from '../lib/number.mjs';
import { overUnit } from '../lib/zangyo.mjs';
import { $ } from './ui.mjs';
import { zangyoUpdate, zangyoSetup, numVal, ZANGYO_HOUR_IDS, zgMemoHours } from './zangyo-ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 残業代の計算（時給から）：時給と、残業・深夜・休日の時間。結果は残業代明細書（大きな残業代・時給と残業1時間・明細の表）
const INPUTS = ['wage', ...ZANGYO_HOUR_IDS].map((id) => $(id));
const EMPTY = { wage: '時給を入れてください', hours: '残業の時間を入れてください' };

function update() {
  const wage = numVal('wage');
  const res = zangyoUpdate(wage === null ? { ok: false, empty: true, missing: 'wage' } : { ok: true, wage }, EMPTY);
  const ok = wage > 0 && res.field !== 'wage';
  $('r-wage').textContent = ok ? `時給 ${fmt(wage, 2)}円` : '';
  $('r-unit').textContent = ok ? `残業1時間 ${fmt(overUnit(wage), 0)}円` : '';
  memo(res.ok ? { q: `時給${fmt(wage, 2)}円で${zgMemoHours()}`, a: `${fmt(res.total, 0)}円` } : null);
}

zangyoSetup(INPUTS, update);
