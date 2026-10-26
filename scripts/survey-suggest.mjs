// （調べもの用・main には入れない）行事の日付・年齢、第何曜日、偏差値、率ごとの早見表の、Google の検索候補（サジェスト）を集める。
// robots.txt で止められていたら集めない。1回だけの調べもので、0.4秒以上あけて聞く。
// 1回目：種のことば × 五十音・話題のことば。2回目：1回目で多く出た「種＋ことば」をもう一段ふかく
import { writeFileSync, mkdirSync } from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notice = (t, m) => console.log(`::notice title=${t}::${String(m).replace(/[\r\n]+/g, ' ').slice(0, 3000)}`);

async function robotsAllows(host, path) {
  const res = await fetch(`https://${host}/robots.txt`).catch(() => null);
  if (!res || !res.ok) return { ok: true, note: `robots.txt なし（${res?.status ?? 'つながらない'}）` };
  const txt = await res.text();
  let mine = false;
  const rules = [];
  for (const line of txt.split(/\r?\n/)) {
    const [k, ...v] = line.split(':');
    const val = v.join(':').trim();
    if (/^user-agent$/i.test(k.trim())) mine = val === '*';
    else if (mine && /^(dis)?allow$/i.test(k.trim())) rules.push([k.trim().toLowerCase(), val]);
  }
  const hits = rules.filter(([, p]) => p && path.startsWith(p)).sort((a, b) => b[1].length - a[1].length);
  const top = hits[0];
  return { ok: !top || top[0] === 'allow', note: `${host}：${hits.map(([k, p]) => `${k} ${p}`).join(' / ') || '当たる行なし'}` };
}
const r1 = await robotsAllows('suggestqueries.google.com', '/complete/search');
const r2 = await robotsAllows('www.google.com', '/complete/search');
notice('robots.txt', `${r1.note}／${r2.note}`);
if (!r1.ok) {
  notice('中止', 'robots.txt で止められているので集めません');
  process.exit(0);
}

async function suggest(q) {
  await sleep(400);
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ja&gl=jp&ie=utf-8&oe=utf-8&q=${encodeURIComponent(q)}`;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'Accept-Language': 'ja-JP,ja;q=0.9' } }).catch(() => null);
    if (res && res.ok) {
      const j = await res.json().catch(() => null);
      if (Array.isArray(j?.[1])) return j[1];
    }
    await sleep(3000 * (i + 1));
  }
  return null;
}

const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわがぎぐげござじずぜぞだでどばびぶべぼぱぴぷぺぽ'.split('');
const CORE = ['お食い初め', '百日祝い', '四十九日', '七五三', '厄年', '還暦', '長寿祝い', '第何曜日', '偏差値', '割引 早見表', '希釈 早見表', '一周忌'];
const MORE = ['お食い初め 計算', 'お食い初め いつ', '四十九日 計算', '四十九日 数え方', '四十九日 いつ', '法要 計算', '年忌 早見表', '三回忌', '七回忌', '七五三 年齢', '七五三 早見表', '七五三 計算', '七五三 数え年', '十三参り', 'お宮参り', '初節句', '厄年 早見表', '厄年 計算', '厄年 2027', '厄年 2026', '前厄', '後厄', '還暦 計算', '還暦 何年生まれ', '古希', '喜寿', '傘寿', '米寿', '卒寿', '白寿', '長寿祝い 早見表', '数え年', '数え年 計算', '干支 計算', '第3水曜日', '第2月曜日', '第何週', '偏差値 上位', '偏差値 パーセント', '偏差値 計算', '偏差値 上位何パーセント', '10%オフ', '20%オフ', '30%オフ', '15%オフ', '40%オフ', '半額 早見表', '割引 計算', '割増 計算', '2割増し', '5倍希釈', '10倍希釈', '100倍希釈', '希釈 計算', '大さじ 何グラム', '小さじ 何グラム', '計量スプーン'];
const seeds = new Set();
for (const s of [...CORE, ...MORE]) seeds.add(`${s} `);
for (const s of CORE) for (const k of KANA) seeds.add(`${s} ${k}`);
const out = {};
let fail = 0;
for (const q of seeds) {
  const s = await suggest(q);
  if (s === null) fail++;
  out[q] = s ?? [];
}
// 2回目：多く出た候補（種＋1語）をもう一段
const count = new Map();
for (const list of Object.values(out)) for (const s of list) count.set(s, (count.get(s) || 0) + 1);
const deeper = [...count.entries()]
  .filter(([s]) => /お食い初め|百日|四十九日|忌|七五三|厄|還暦|長寿|寿|曜日|偏差値|オフ|割引|希釈|割増/.test(s) && s.split(/\s+/).length <= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([s]) => `${s} `)
  .filter((q) => !(q in out))
  .slice(0, 160);
for (const q of deeper) {
  const s = await suggest(q);
  if (s === null) fail++;
  out[q] = s ?? [];
}
mkdirSync('survey', { recursive: true });
writeFileSync('survey/suggest.json', JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
const all = new Set(Object.values(out).flat());
notice('集めた', `聞いた ${Object.keys(out).length}回（2回目 ${deeper.length}回）・取れなかった ${fail}回・候補 ${all.size}種類・例：${[...all].slice(0, 20).join(' ／ ')}`);
