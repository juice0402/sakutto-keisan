// （調べもの用・main には入れない）ふるさと納税と楽天のポイントの、Google の検索候補（サジェスト）を集める。
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
const ABC = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
const PART = ['とは', 'って', 'は', 'の', 'を', 'で', 'に', 'が', 'と', 'も'];

// ふるさと納税
const F = 'ふるさと納税';
const F_TOPIC = ['上限', '限度額', '計算', 'シミュレーション', '仕組み', 'やり方', '始め方', '初心者', 'ワンストップ', 'ワンストップ特例', '確定申告', '申請書', 'いつまで', '期限', '締め切り', '2026', '2027', '改正', '変更', 'ルール', 'ポイント', '返礼品', 'おすすめ', '人気', 'ランキング', '米', '肉', '日用品', 'トイレットペーパー', '定期便', '楽天', 'さとふる', 'ふるさとチョイス', 'ふるなび', '住民税', '所得税', '控除', '控除額', '控除 確認', '年末調整', '医療費控除', '住宅ローン控除', 'iDeCo', 'NISA', '主婦', '専業主婦', 'パート', '年金', '年金受給者', '退職', '転職', '副業', '個人事業主', '自営業', '会社員', '学生', '扶養', '共働き', '夫婦', '独身', '子供', '年収', 'いくらまで', '自己負担', '2000円', 'デメリット', 'メリット', '損', '意味ない', 'しない方がいい', 'おかしい', 'マイナンバー', '寄付金受領証明書', '受領証明書', '決定通知書', '控除されてない', '確認方法', '反映', 'いつ 反映', '引っ越し', '住所変更', '間に合わない', '12月', '年末', '1月', '年明け', '届かない', '届く', '2回目', '何回', '何ヶ所', '6自治体', '同じ自治体', '寄付', '寄附', '還元率', '節税', 'カード', 'クレジットカード', '支払い', '名義', '家族', '妻', '夫', '親', '使い道', '応援', '災害', '地元', '住んでる', '自分の住んでる'];
// 楽天のポイント（SPU・お買い物マラソン）
const P_SEEDS = ['楽天 spu', '楽天spu', 'spu 楽天', 'spu', '楽天 お買い物マラソン', 'お買い物マラソン', '楽天 マラソン', '楽天 買いまわり', '買いまわり', '買い回り', '楽天 買い回り', '楽天スーパーセール', '楽天 スーパーセール', '楽天 ポイント', '楽天ポイント', '楽天 ポイント 倍', '楽天 5と0のつく日', '5と0のつく日', '0と5のつく日', '楽天 ワンダフルデー', '楽天 ブラックフライデー', '楽天 期間限定ポイント', '楽天 エントリー', '楽天 ポイントアップ', '楽天 勝ったら倍', '楽天市場 ポイント', '楽天カード ポイント', '楽天モバイル spu'];
const P_TOPIC = ['計算', 'シミュレーション', '上限', '条件', '一覧', '確認', '確認方法', '2026', '2026 11月', '11月', '12月', '改悪', '変更', '最大', '何倍', '倍率', '仕組み', 'やり方', 'コツ', '攻略', '次回', 'いつ', '期間', '時間', '1000円', '店舗', 'ふるさと納税', 'カウント', 'されない', '対象外', '付与', '付与日', 'いつ もらえる', '期間限定', '使い道', '使い方', '有効期限', '税込', '税抜', '送料', 'クーポン', 'エントリー', '忘れた', '後から', '併用', '重複', 'カード', 'モバイル', 'プレミアム', 'ゴールド', 'アプリ', 'ブックス', 'kobo', 'ビューティ', 'ファッション', 'トラベル', '証券', '銀行', 'でんき', 'ガス', 'ひかり', 'ウォレット', 'ペイ'];

const seeds = new Set();
for (const s of [`${F} `, `${F}`]) seeds.add(s);
for (const k of KANA) seeds.add(`${F} ${k}`);
for (const k of ABC) seeds.add(`${F} ${k}`);
for (const p of PART) seeds.add(`${F}${p}`);
for (const t of F_TOPIC) seeds.add(`${F} ${t} `);
for (const s of ['ワンストップ特例 ', 'ワンストップ特例制度 ', 'ワンストップ 申請 ', '寄附金控除 ', '寄付金控除 ', '寄付金 控除 ', '住民税 決定通知書 ', '控除上限額 ', '自己負担 2000円 ', '返礼品 ', '寄附金税額控除 ', '税額控除 ふるさと ', 'ふるさと 納税 ']) seeds.add(s);
for (const k of KANA.slice(0, 44)) { seeds.add(`ワンストップ特例 ${k}`); seeds.add(`返礼品 ${k}`); }
for (const s of P_SEEDS) seeds.add(`${s} `);
for (const s of ['楽天 spu', 'お買い物マラソン', '楽天 ポイント', '楽天スーパーセール', '楽天 買いまわり']) for (const t of P_TOPIC) seeds.add(`${s} ${t} `);
for (const k of KANA) { seeds.add(`楽天 spu ${k}`); seeds.add(`お買い物マラソン ${k}`); seeds.add(`楽天 ポイント ${k}`); }
for (const k of KANA.slice(0, 44)) { seeds.add(`楽天スーパーセール ${k}`); seeds.add(`楽天 買いまわり ${k}`); }

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
  .filter(([s]) => (s.startsWith(F) || /楽天|spu|マラソン|買いまわり|買い回り|スーパーセール/.test(s)) && s.split(/\s+/).length <= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([s]) => `${s} `)
  .filter((q) => !(q in out))
  .slice(0, 260);
for (const q of deeper) {
  const s = await suggest(q);
  if (s === null) fail++;
  out[q] = s ?? [];
}
mkdirSync('survey', { recursive: true });
writeFileSync('survey/suggest.json', JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
const all = new Set(Object.values(out).flat());
notice('集めた', `聞いた ${Object.keys(out).length}回（2回目 ${deeper.length}回）・取れなかった ${fail}回・候補 ${all.size}種類・例：${[...all].slice(0, 20).join(' ／ ')}`);
