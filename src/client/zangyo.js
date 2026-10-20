import { fmt } from '../lib/number.mjs';
import { overUnit } from '../lib/zangyo.mjs';
import { $ } from './ui.mjs';
import { zangyoUpdate, zangyoSetup, numVal, ZANGYO_HOUR_IDS } from './zangyo-ui.mjs';

// 残業代の計算（時給から）：時給と、残業・深夜・休日の時間。結果は大きな残業代と、時給の分と割増の分に分けた帯、明細
const INPUTS = ['wage', ...ZANGYO_HOUR_IDS].map((id) => $(id));
const EMPTY = { wage: '時給を入れてください', hours: '残業の時間を入れてください' };

/** 残業代の帯を、時給の分と割増の分に分ける */
function drawSplit(res) {
  const ok = res.ok && res.total > 0;
  $('b-base').style.width = ok ? `${(res.base / res.total) * 100}%` : '0%';
  $('b-extra').style.width = ok ? `${(res.extra / res.total) * 100}%` : '0%';
  $('b-left').textContent = ok ? `時給の分 ${fmt(res.base, 0)}円` : '時給の分';
  $('b-right').textContent = ok ? `割増の分 ${fmt(res.extra, 0)}円` : '割増の分';
}

function update() {
  const wage = numVal('wage');
  const res = zangyoUpdate(wage === null ? { ok: false, empty: true, missing: 'wage' } : { ok: true, wage }, EMPTY);
  drawSplit(res);
  $('r-unit').textContent = wage > 0 && !res.error ? `残業1時間 ${fmt(overUnit(wage), 0)}円` : '';
}

zangyoSetup(INPUTS, update);
