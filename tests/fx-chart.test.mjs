import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutChartShape, swapChartShape } from '../src/lib/fx-chart.mjs';
import { swapBars } from '../src/lib/fx.mjs';

const ys = (line) => [...line.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));

test('ロスカットのチャート：買いはロスカットのラインがいまより下', () => {
  const c = cutChartShape({ rate: 150, price: 146 });
  assert.equal(c.cutAbove, false);
  assert.equal(c.nowY, 34);
  assert.ok(c.cutY > c.nowY);
  assert.equal(ys(c.line).length, 30);
  assert.equal(ys(c.line).at(-1), c.nowY); // 線の右はしは、いまのレート
  assert.ok(ys(c.line).every((y) => y < c.cutY)); // 線はロスカットのラインをこえない
  assert.ok(ys(c.line).every((y) => y >= 0 && y <= 100));
});

test('ロスカットのチャート：売りと、もう基準より下のときは上', () => {
  const sell = cutChartShape({ rate: 150, price: 153.84 });
  assert.equal(sell.cutAbove, true);
  assert.equal(sell.nowY, 66);
  assert.ok(sell.cutY < sell.nowY);
  assert.ok(ys(sell.line).every((y) => y > sell.cutY));
  const over = cutChartShape({ rate: 150, price: 155 }); // 買いで、もう基準より下
  assert.equal(over.cutAbove, true);
});

test('ロスカットのチャート：近いほどラインが近く、遠くても枠の中', () => {
  const near = cutChartShape({ rate: 150, price: 149.9 });
  const mid = cutChartShape({ rate: 150, price: 146 });
  const far = cutChartShape({ rate: 150, price: 56 });
  assert.ok(near.cutY - near.nowY < mid.cutY - mid.nowY);
  assert.ok(mid.cutY - mid.nowY < far.cutY - far.nowY);
  assert.ok(near.cutY - near.nowY >= 12); // 2つのレートの札が重ならない
  assert.ok(far.cutY <= 84);
  assert.ok(ys(near.line).every((y) => y < near.cutY));
  const never = cutChartShape({ rate: 150, price: -10, never: true });
  assert.equal(never.cutY, null);
});

test('スワップのチャート：12の階段で、もらうときは右上へ、払うときは右下へ', () => {
  const bars = swapBars(365, 114);
  const get = swapChartShape(bars, false);
  assert.equal(get.points.length, 12);
  assert.equal(get.points.at(-1).x, 96); // 右はしの点が切れない
  assert.equal(get.points.at(-1).y, 14);
  assert.ok(get.points[0].y > get.points.at(-1).y);
  assert.ok(get.line.startsWith('M2 86'));
  assert.ok(get.area.endsWith('V86H2Z'));
  const pay = swapChartShape(bars, true);
  assert.equal(pay.points.at(-1).y, 86);
  assert.ok(pay.line.startsWith('M2 14'));
  assert.deepEqual(swapChartShape([], false).points, []);
});
