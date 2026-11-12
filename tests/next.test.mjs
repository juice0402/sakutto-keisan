// 計算のあとの「つぎに」（#159・C-027 サイトの中の沼・案B）：tools.mjs の next と src/parts.mjs の nextHtml、layout.mjs の差しこみ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOOLS, toolBySlug, toolUrl } from '../src/tools.mjs';
import { nextHtml, nextPicks, relatedHtml } from '../src/parts.mjs';
import { setInlineScripts, page, placeNext, spread } from '../src/layout.mjs';
import { loadYomimono, yomimono, setYomimono, sortNew, textWidth } from '../src/yomimono/_shelf.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL = yomimono();
const MIHON = sortNew(await loadYomimono(join(HERE, 'fixtures/yomimono')));
setInlineScripts(Object.fromEntries(readdirSync(join(HERE, '../src/client')).filter((f) => f.endsWith('.js')).map((f) => [f, '/* */'])));
const withShelf = (list, fn) => {
  setYomimono(list);
  try {
    return fn();
  } finally {
    setYomimono(REAL);
  }
};
const PUBLISHED = TOOLS.filter((t) => t.published);
// 全ページの使わない言葉（CLAUDE.md の文章の決まり。「ポイント」も）と、コーナーごとの言葉（scripts/verify-dist.mjs と同じ）
const NG = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '——', '→', '›', '<', '*'];
const NG_FURUSATO = ['お得', 'コスパ', '還元', '購入', '買う', 'セール', 'ドカ盛り', '節税', '残りわずか', '今だけ', 'ポイント'];
const NG_POINT = ['お得', '最安', '必ず得', '倍確定', '予想', '次回は', 'ラッキーくじ', 'スロット', '楽天公認'];
const names = (html) => [...html.matchAll(/<span class="tool-name">([^<]*)<\/span>/g)].map((m) => m[1]);
const sectionOf = (html, id) => (html.match(new RegExp(`<section[^>]*aria-labelledby="${id}"[\\s\\S]*?</section>`)) || [''])[0];

test('公開している計算は全部 next が1〜2つ・公開している計算で自分ではない・理由は全角26字まで・使わない言葉がない', () => {
  for (const t of PUBLISHED) {
    assert.ok(Array.isArray(t.next) && t.next.length >= 1 && t.next.length <= 2, `${t.slug}: next が1〜2つでない`);
    assert.equal(new Set(t.next.map(([s]) => s)).size, t.next.length, `${t.slug}: next が重なる`);
    for (const [slug, why] of t.next) {
      const to = toolBySlug(slug);
      assert.ok(to?.published, `${t.slug}: next の ${slug} が公開している計算でない`);
      assert.notEqual(slug, t.slug, `${t.slug}: next に自分がある`);
      assert.ok(typeof why === 'string' && why.length > 0 && textWidth(why) <= 26, `${t.slug}: 理由が全角26字をこえる（${why}）`);
      const ng = [...NG, ...(t.category === 'furusato' ? NG_FURUSATO : []), ...(t.category === 'point' ? NG_POINT : [])];
      for (const w of ng) assert.ok(!why.includes(w), `${t.slug}: 理由に「${w}」`);
      // ふるさと納税・楽天のポイントは、それぞれのコーナーの中だけでつなぐ
      if (t.category === 'furusato' || t.category === 'point') assert.equal(to.category, t.category, `${t.slug}: ${slug} はコーナーの外`);
    }
  }
});

test('決まった6ページの next は連絡 C-027 の文のまま', () => {
  const want = {
    waribiki: [['kakeritsu', '割引を何掛けかに直して、仕入れ値を出す'], ['warikan', '割引後の値段を、何人かで分ける']],
    kakeritsu: [['rieki-ritsu', '上代で売ったときの利益率を出す'], ['waribiki', '何掛けを、割引後の値段で確かめる']],
    kishaku: [['hyohakuzai', '消毒液は、漂白剤の濃度から量を出す'], ['genba', '現場ごとの薄め方を、手帳に残す']],
    'seisou-jikan': [['seisou-mitsumori', '同じ作業と面積で、1か月の料金の目安を出す'], ['genba', '場所ごとの時間を、現場手帳にまとめる']],
    'enbun-noudo': [['recipe', '人数を変えたときの塩の量を出す'], ['mentsuyu', 'めんつゆを何倍に薄めるか出す']],
    'touyu-dai': [['denki-dai', 'エアコンの電気代とくらべる'], ['ceramic-heater', '電気のヒーターの電気代とくらべる']],
  };
  for (const [slug, next] of Object.entries(want)) assert.deepEqual(toolBySlug(slug).next, next, slug);
});

test('nextHtml：読みものがないと計算2つ', () =>
  withShelf([], () => {
    const t = toolBySlug('kishaku');
    const html = nextHtml(t);
    assert.match(html, /^<section class="prose nx" id="nx" aria-labelledby="nx-h"><h2 id="nx-h">つぎに<\/h2><ul class="tool-list">/);
    assert.deepEqual(names(html), ['次亜塩素酸ナトリウムの薄め方', '現場手帳']);
    assert.ok(html.includes('<span class="tool-desc">消毒液は、漂白剤の濃度から量を出す</span>'));
    assert.ok(html.includes(`href="${toolUrl(toolBySlug('genba'))}"`));
    assert.ok(!html.includes('読みもの。'));
  }));

test('nextHtml：読みものがあると計算1つと、いちばん新しい読みもの1本', () =>
  withShelf(MIHON, () => {
    const t = toolBySlug('touyu-dai');
    const html = nextHtml(t);
    const newest = MIHON.find((y) => y.tools.includes('touyu-dai'));
    assert.deepEqual(names(html), ['電気代の計算', newest.title]);
    assert.ok(html.includes(`href="/yomimono/${newest.slug}/"`));
    assert.ok(html.includes(`<span class="tool-desc">読みもの。${newest.lead}</span>`));
    assert.equal((html.match(/<li>/g) || []).length, 2);
  }));

test('いちばん下の2つの節から、つぎにで出したものが消える', () =>
  withShelf(MIHON, () => {
    // 灯油代：related は denki-dai・oil-heater・ceramic-heater・warikan。つぎにの denki-dai と見本の読みもの1本が下から消える
    const t = toolBySlug('touyu-dai');
    const html = relatedHtml(t);
    const { tools, yomi } = nextPicks(t);
    const rel = names(sectionOf(html, 'related'));
    for (const { t: x } of tools) assert.ok(!rel.includes(x.name), `ほかの計算ツールに ${x.name}`);
    assert.equal(rel.length, 4);
    assert.ok(rel.includes('オイルヒーターの電気代'));
    const ym = names(sectionOf(html, 'ym-for'));
    assert.ok(!ym.includes(yomi.title));
    assert.equal(ym.length, MIHON.filter((y) => y.tools.includes('touyu-dai')).length - 1);
    // 読みものが1本だけの計算は「この計算の読みもの」を節ごと出さない
    const p = relatedHtml(toolBySlug('point'));
    assert.ok(names(p).includes(MIHON.find((y) => y.slug === 'point-mihon').title));
    assert.ok(!p.includes('id="ym-for"'));
  }));

test('読みものがないとき：ほかの計算ツールは related の残りと同じカテゴリから補う', () =>
  withShelf([], () => {
    const t = toolBySlug('waribiki');
    const rel = names(sectionOf(relatedHtml(t), 'related'));
    assert.ok(!rel.includes('掛け率の計算') && !rel.includes('割り勘の計算'));
    assert.equal(rel.length, 4);
    assert.deepEqual(rel.slice(0, 3), ['割引率の計算', '実質単価の比較', '利益率の計算']);
  }));

test('差しこみ：「つぎに」は計算カード（#calc）のすぐ外・下、パソコンの見開きでは左の段', () =>
  withShelf([], () => {
    const t = toolBySlug('kishaku');
    const body = `<h1>割引計算</h1><div class="calc" id="calc"><div class="in"><p>答え</p></div></div>\n<section class="prose" aria-labelledby="how"><h2 id="how">しくみ</h2><p>本文</p></section>\n${relatedHtml(t)}`;
    const placed = placeNext(body);
    assert.match(placed, /id="calc"><div class="in"><p>答え<\/p><\/div><\/div>\n<section class="prose nx" id="nx"/);
    assert.equal((placed.match(/id="nx"/g) || []).length, 1);
    const s = spread(placed, '/waribiki/');
    const left = s.slice(0, s.indexOf('<div class="pc-right">'));
    assert.ok(left.includes('id="nx"') && !left.includes('id="how"'));
    const html = page({ path: '/waribiki/', title: 't', description: 'd', body });
    assert.ok(html.indexOf('id="nx"') > html.indexOf('id="calc"') && html.indexOf('id="nx"') < html.indexOf('id="how"'));
    // #calc のないページは動かさない
    const noCalc = `<h1>x</h1>${relatedHtml(t)}`;
    assert.equal(placeNext(noCalc), noCalc);
  }));
