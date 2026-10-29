// 図解の式と帯の図（#82）：生活のページ（電気・灯油・日付・からだ）の図の数字が、計算例と同じになっているか
import test from 'node:test';
import assert from 'node:assert/strict';
import { Z_DENKI } from '../src/pages/denki-dai.mjs';
import { denkiZukai, denkiBars } from '../src/denki.mjs';
import { DENKI_USES } from '../src/data/denki.mjs';
import { Z_TOUYU } from '../src/pages/touyu-dai.mjs';
import { Z_BMI } from '../src/pages/bmi.mjs';
import { Z_HENSACHI } from '../src/pages/hensachi.mjs';
import { Z_YOUBI } from '../src/pages/dai-nan-youbi.mjs';
import { Z_WAREKI } from '../src/pages/wareki.mjs';
import { Z_GAKU } from '../src/pages/nenrei.mjs';
import { daiNanYoubi } from '../src/lib/dai-nan-youbi.mjs';
import { TOUYU_PRICE } from '../src/data/touyu.mjs';
import { literPrice } from '../src/lib/touyu.mjs';

test('電気代の図：こたつ600W・1日8時間・単価31円', () => {
  assert.deepEqual(Z_DENKI, { day: 148.8, month: 4464 });
  assert.equal(Z_DENKI.day * 30, Z_DENKI.month);
});

test('家電別の図：強さごとの棒と絵の式', () => {
  const kotatsu = DENKI_USES.find((u) => u.slug === 'kotatsu');
  assert.equal(denkiZukai('こたつの強', 180, 8).r.month, 1339.2);
  const bars = denkiBars(kotatsu.name, kotatsu.modes, kotatsu.hours);
  assert.equal((bars.match(/class="fz2"/g) || []).length, kotatsu.modes.length);
  assert.match(bars, /最大 600W・1か月 4,464円/);
  assert.match(bars, /強で1日8時間 → <b>1か月 約1,339円<\/b>/);
});

test('灯油代の図：1時間0.3L・1日8時間', () => {
  assert.equal(Z_TOUYU.litersDay, 2.4);
  assert.equal(Z_TOUYU.canDays, 7.5);
  assert.equal(Z_TOUYU.month, Math.round(Z_TOUYU.litersDay * 30 * literPrice(TOUYU_PRICE.can)));
});

test('からだの図：BMIと偏差値', () => {
  assert.deepEqual(Z_BMI, { value: 22.5, level: '普通体重', std: 63.6 });
  assert.deepEqual(Z_HENSACHI, { dev: 60, up: '15.9', rank: 16 });
});

test('日付の図：第何曜日・和暦・学歴', () => {
  const ex = daiNanYoubi(`${Z_YOUBI.y}-10-27`);
  assert.equal(Z_YOUBI.n, 4);
  assert.equal(Z_YOUBI.youbi, ex.youbi);
  assert.equal(Z_WAREKI.y, 1998);
  assert.deepEqual(Z_GAKU, [2011, 2017, 2017, 2020, 2020, 2023, 2023, 2027]);
});
