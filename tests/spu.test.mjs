import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spuPoints, spuReach, spuCapOf } from '../src/lib/spu.mjs';
import { SPU_ITEMS, SPU_SOURCES, SPU_BASE, SPU_MAX } from '../src/data/spu.mjs';

const calc = (total, picked) => spuPoints({ total, picked }, SPU_ITEMS, SPU_BASE);
const byId = (id) => SPU_ITEMS.find((x) => x.id === id);
const reachOf = (id) => {
  const c = spuCapOf(byId(id));
  return c ? spuReach(c.rate, c.cap) : null;
};

test('全部そろうと18.5倍（2026年7月から。楽天市場のSPUのページ）', () => {
  assert.equal(SPU_MAX, 18.5);
  assert.equal(calc(null, SPU_ITEMS.map((x) => x.id)).rate, 18.5);
  assert.equal(new Set(SPU_ITEMS.map((x) => x.id)).size, SPU_ITEMS.length);
});

test('ページの計算例：3万円で楽天カード・楽天モバイル・楽天銀行', () => {
  const r = calc(30000, ['card', 'mobile', 'bank']);
  assert.equal(r.rate, 7.5);
  assert.equal(r.net, 27272);
  assert.equal(r.base, 272);
  // 楽天カードは通常分が税込（300）＋特典分が税抜（272）
  assert.deepEqual(r.rows.map((x) => x.pts), [572, 1090, 136]);
  assert.equal(r.points, 2070);
  assert.equal(r.next.id, 'mobile');
  assert.equal(r.next.reach, 55000);
});

test('一覧の「上限に届く買い物」（税込）', () => {
  assert.equal(reachOf('card'), 110000); // 特典分の＋1倍・上限1,000
  assert.equal(reachOf('mobile'), 55000);
  assert.equal(reachOf('carrier'), 55000);
  assert.equal(reachOf('bank'), 220000);
  assert.equal(reachOf('toushin'), 440000);
  assert.equal(reachOf('books'), 110000);
  assert.equal(reachOf('travel'), 110000);
  assert.equal(reachOf('kdreams'), null); // 上限は公式で確かめられていない
  // 届く額のちょうどで上限、1円少ないと届かない
  for (const x of SPU_ITEMS) {
    const c = spuCapOf(x);
    if (!c) continue;
    const at = calc(reachOf(x.id), [x.id]).rows[0];
    const before = calc(reachOf(x.id) - 1, [x.id]).rows[0];
    assert.equal(at.full, true, x.id);
    assert.equal(before.full, false, x.id);
  }
});

test('0.5倍は税抜200円で1ポイント、端数は切り捨て', () => {
  assert.equal(calc(219, ['books']).rows[0].pts, 0); // 税抜199円
  assert.equal(calc(220, ['books']).rows[0].pts, 1); // 税抜200円
  assert.equal(calc(1100, ['card']).rows[0].pts, 21); // 通常分は税込1,100円で11、特典分は税抜1,000円で10
});

test('上限で止まる分と、上限に届いたサービス', () => {
  const r = calc(100000, SPU_ITEMS.map((x) => x.id));
  assert.deepEqual(r.full.map((x) => x.id), ['mobile', 'carrier', 'hikari']);
  assert.equal(r.rows.find((x) => x.id === 'mobile').pts, 2000);
  assert.equal(r.next.id, 'card');
  assert.deepEqual(r.noCap.map((x) => x.id), ['kdreams']);
  assert.ok(r.lost > 0);
  // えらんでいないときは楽天会員の1倍だけ
  const one = calc(30000, []);
  assert.deepEqual([one.rate, one.points, one.next], [1, 272, null]);
});

test('まちがった入力', () => {
  assert.equal(calc(null, []).empty, true);
  assert.equal(calc(NaN, []).field, 'total');
  assert.equal(calc(0, []).field, 'total');
  assert.equal(calc(2e8, []).field, 'total');
});

test('数字は公式のURLと確かめた日つき（確認日から90日以内）', () => {
  const now = Date.now();
  for (const x of [...SPU_ITEMS, ...SPU_SOURCES]) {
    assert.match(x.url, /^https:\/\//, x.name);
    assert.match(x.checked, /^\d{4}-\d{2}-\d{2}$/, x.name);
    const days = (now - Date.parse(`${x.checked}T00:00:00+09:00`)) / 86400000;
    assert.ok(days <= 90, `${x.name} は ${x.checked} に確かめたきり。公式のページで確かめ直して checked を直す`);
  }
  // チェック欄の名前は全角6文字ぶんまで（英字は0.6文字。360pxの幅で切れない）
  const wide = (s) => [...s].reduce((w, c) => w + (c.charCodeAt(0) < 128 ? 0.6 : 1), 0);
  for (const x of SPU_ITEMS) assert.ok(wide(x.label) <= 6, `${x.label} はチェック欄に入らない`);
});
