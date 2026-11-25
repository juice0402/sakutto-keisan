// 楽天のポイントのコーナー：お買い物マラソンの過去の開催一覧 /point/kiroku/（#193）
// 終わった回の表（回・期間・上限・付与日・有効期限）を、src/data/point.mjs の POINT_EVENTS からビルドのときに作る。
// 回が足されると、その回が終わったあとのビルドで表に入る（毎朝の作り直しで伸びる）。公式で確かめられなかった所は「—」
// 本文の文は表の数字から作る（上限ごとの回の数・期間の長さ・付与と期限の関係）。数え方は src/lib/kiroku.mjs、例は tests/kiroku.test.mjs
// 終わった回6以上・上限が数字の回4以上になるまでは noindex でサイトマップの外（kirokuReady）。とどいたビルドで自動で外れる
// 決まりは /point/ と同じ（公式で確かめたものだけ・予想や次の回の日程を書かない・楽天グループとは関係のない個人のサイト）
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc } from '../layout.mjs';
import { relatedHtml, themeOf } from '../parts.mjs';
import { POINT_EVENTS, POINT_CAPS, POINT_MAX_SHOPS, POINT_SOURCES } from '../data/point.mjs';
import { SPU_CHANGES, SPU_PAGE, SPU_SOURCES } from '../data/spu.mjs';
import { kirokuEnded, kirokuCount, kirokuReady, kirokuSpan, kirokuStats, grantIsNext15, expiresIsNextEnd } from '../lib/kiroku.mjs';
import { pointReach } from '../lib/point.mjs';
import { fmt } from '../lib/number.mjs';

const yOf = (s) => Number(s.slice(0, 4));
const mdJa = (s) => `${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const jaDate = (s) => `${yOf(s)}年${mdJa(s)}`;
const hm = (s) => s.slice(11).replace(/^0/, '');
// 回の年とちがう年のときだけ年を書く
const dayOf = (s, base) => (yOf(s) === yOf(base) ? mdJa(s) : jaDate(s));
const spanJa = (sp) => `${sp.days ? `${sp.days}日` : ''}${sp.rest ? `${sp.rest}時間` : ''}`;
const capName = (c) => (c >= 10000 ? `${c / 10000}万` : fmt(c));
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const DASH = '—';
// 表のマス：年がちがうときは年のあとで折り返せるように
const dayCell = (s, base) => (yOf(s) === yOf(base) ? `<span class="nw">${mdJa(s)}</span>` : `<span class="nw">${yOf(s)}年</span><wbr><span class="nw">${mdJa(s)}</span>`);
const dayBefore = (s) => new Date(Date.parse(`${s.slice(0, 10)}T00:00:00Z`) - 86400000).toISOString();

/** 終わった回の表（新しい回が上）。行がないときは空 */
export function kirokuTable(events, nowMs) {
  const ended = kirokuEnded(events, nowMs).slice().reverse();
  if (!ended.length) return '';
  const rows = ended
    .map(
      (e) =>
        `<tr><td><span class="nw">${yOf(e.start)}年</span><wbr><span class="nw">${mdJa(e.start)}</span></td><td><span class="nw">${hm(e.start)}〜</span><wbr><span class="nw">${dayOf(e.end, e.start)} ${hm(e.end)}</span></td><td class="num">${typeof e.cap === 'number' ? fmt(e.cap) : DASH}</td><td>${e.grant ? dayCell(e.grant, e.start) : DASH}</td><td>${e.expires ? dayCell(e.expires, e.start) : DASH}</td></tr>`,
    )
    .join('\n');
  return `<div class="tbl-wrap"><table class="tbl-tight kr-table">
<thead><tr><th>回</th><th>期間</th><th class="num">上限</th><th>付与日</th><th>有効期限</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;
}

// 期間の長さの棒（新しい回が上。いちばん長い回を棒いっぱいに）
function spanBars(ended) {
  const list = ended.slice().reverse().map((e) => ({ e, sp: kirokuSpan(e) }));
  const max = Math.max(...list.map((x) => x.sp.hours));
  return `<ul class="kr-bars" aria-label="回ごとの期間の長さ">${list
    .map(({ e, sp }) => `<li><span class="kr-k">${mdJa(e.start)}から</span><span class="kr-bar"><i style="width:${((sp.hours / max) * 100).toFixed(1)}%"></i></span><span class="kr-v">${spanJa(sp)}</span></li>`)
    .join('')}</ul>`;
}

// 上限ごとの回の数のマス（1回1マス。わからない回は「—」の段）
export function capTally(stats) {
  const rows = [...stats.byCap.map((x) => [capName(x.cap), x.n, true]), ...(stats.unknown ? [[DASH, stats.unknown, false]] : [])];
  return `<ul class="kr-tally" aria-label="上限ごとの回の数">${rows
    .map(([k, n, known]) => `<li><span class="kr-k">${k}</span><span class="kr-ms">${Array.from({ length: n }, () => `<span class="kr-m${known ? '' : ' kr-m-un'}"></span>`).join('')}</span><span class="kr-v">${n}回</span></li>`)
    .join('')}</ul>`;
}

/** 表の数字から言えることの文（ページの本文と説明文で使う） */
export function kirokuFacts(events, nowMs) {
  const ended = kirokuEnded(events, nowMs);
  const stats = kirokuStats(ended, POINT_CAPS);
  const known = stats.byCap.filter((x) => x.n > 0);
  const withCap = known.reduce((s, x) => s + x.n, 0);
  const last = ended.at(-1) || null;
  let caps;
  if (!withCap) caps = '上限がわかっている回は、まだありません。';
  else if (known.length === 1) caps = `上限がわかっている${withCap}回は、${withCap === 1 ? '' : 'どれも'}${fmt(known[0].cap)}ポイントでした。`;
  else caps = `上限がわかっている${withCap}回のうち、${known.map((x) => `${fmt(x.cap)}ポイントが${x.n}回`).join('、')}でした。`;
  return { ended, stats, withCap, last, caps };
}

export default function render(nowMs = Date.now()) {
  const tool = toolBySlug('point-kiroku');
  const parent = toolBySlug('point');
  const path = '/point/kiroku/';
  const { ended, stats, withCap, last, caps } = kirokuFacts(POINT_EVENTS, nowMs);
  const ready = kirokuReady(kirokuCount(POINT_EVENTS, nowMs));
  const n = ended.length;

  // 期間：始まりと終わりの時刻
  const starts = [...new Set(ended.map((e) => hm(e.start)))];
  const ends = [...new Set(ended.map((e) => hm(e.end)))];
  const lastEnd = last ? last.end : null;
  const nightEnd = ended.find((e) => Number(hm(e.end).split(':')[0]) < 6);

  // 付与と期限
  const granted = ended.filter((e) => e.grant && e.expires);
  const allNext15 = granted.length > 0 && granted.every((e) => grantIsNext15(e));
  const allNextEnd = granted.length > 0 && granted.every((e) => expiresIsNextEnd(e));
  const keep = granted.map((e) => daysBetween(e.grant, e.expires));
  const crossYear = granted.find((e) => yOf(e.expires) > yOf(e.end));
  const keepJa = Math.min(...keep) === Math.max(...keep) ? `${keep[0]}日` : `${Math.min(...keep)}日から${Math.max(...keep)}日`;
  const every = granted.length === 1 ? '' : 'どれも';
  let fuyoText = `付与日と有効期限がわかっている${granted.length}回は、`;
  if (allNext15 && allNextEnd) fuyoText += `${every}終わった月の翌月15日ごろに特典がつき、その翌月の末日が有効期限でした。付与日から有効期限までは${keepJa}です。`;
  else if (allNext15) fuyoText += `${every}終わった月の翌月15日ごろに特典がつき、付与日から有効期限まで${keepJa}ありました。`;
  else fuyoText += `付与日から有効期限まで${keepJa}ありました。`;
  const capsSeen = stats.byCap.filter((x) => x.n > 0).map((x) => x.cap);

  // 出典：確かめたページごとに、その回と確かめた日
  const sources = [...new Set(ended.map((e) => e.url))].map((url) => {
    const list = ended.filter((e) => e.url === url);
    const named = POINT_SOURCES.find((x) => x.url === url);
    return { url, name: named ? named.name : '楽天市場「お買い物マラソン」', starts: list.map((e) => mdJa(e.start)).join('・'), checked: [...new Set(list.map((e) => jaDate(e.checked)))].join('・') };
  });

  const FAQS = [
    last && {
      q: '前回のお買い物マラソンはいつでしたか？',
      a: `<p>この記録でいちばん新しい回は、${jaDate(last.start)} ${hm(last.start)}から${dayOf(last.end, last.start)} ${hm(last.end)}まででした。${typeof last.cap === 'number' ? `上限は${fmt(last.cap)}ポイントです。` : ''}</p>`,
    },
    {
      q: '上限は毎回同じですか？',
      a: `<p>回によって${POINT_CAPS.map(fmt).join('・')}ポイントのどれかで、同じとは限りません。${caps}</p>`,
    },
    {
      q: 'これから始まる回はのせますか？',
      a: `<p>このページは終わった回だけです。公式に出た回は、始まる前から<a href="/point/">${esc(parent.name)}</a>の開催の期間にのせています。</p>`,
    },
    {
      q: 'これは楽天のページですか？',
      a: '<p>いいえ。楽天グループとは関係のない個人のサイトです。数字は楽天市場の公式のページで確かめたものです。</p>',
    },
  ].filter(Boolean);

  const body = `
<h1>${tool.name}</h1>
<p class="lead">終わったお買い物マラソンの上限と期間です。</p>

${section(
  'rec',
  '終わった回の記録',
  `${kirokuTable(POINT_EVENTS, nowMs) || '<p>終わった回は、まだありません。</p>'}
<p class="note">表の上限と日付は、買いまわりの特典の分です。</p>
${n ? `<p>楽天市場の公式のページで確かめた${n}回をのせています。${caps}${stats.unknown ? `上限が${DASH}の${stats.unknown}回は、その回の公式のページで上限を確かめられなかった回です。` : ''}</p>` : ''}
<p>回の欄は始まった日、期間の欄は始まりの時刻から終わりの日時までです。付与日は特典がつく日のめやすです。有効期限は、その日までに使わないと特典の分が消える日です。</p>`,
)}

${n
    ? section(
        'nagasa',
        '期間の長さ',
        `${spanBars(ended)}
<p>${starts.length === 1 ? `どの回も${starts[0]}に始まり、` : ''}終わりの時刻は${ends.map((t) => `${t}が${ended.filter((e) => hm(e.end) === t).length}回`).join('、')}です。${stats.longest.hours !== stats.shortest.hours ? `いちばん長いのは${mdJa(stats.longest.e.start)}からの${spanJa(stats.longest)}で、短いのは${mdJa(stats.shortest.e.start)}からの${spanJa(stats.shortest)}です。` : ''}</p>
${nightEnd ? `<p>終わりが${hm(nightEnd.end)}の回は、終わりの日の前の夜から続いて、日付が変わったあとに終わります。${mdJa(nightEnd.end)} ${hm(nightEnd.end)}までの回なら、${mdJa(dayBefore(nightEnd.end))}の夜から日付が変わって${hm(nightEnd.end)}までが期間のうちです。</p>` : ''}
<p>この記録では、期間の長さは回ごとにちがい、そろっていません。</p>`,
      )
    : ''}

${n
    ? section(
        'jougen',
        '上限の種類',
        `${capTally(stats)}
<p>買いまわりの特典の上限は、回によって${POINT_CAPS.map(fmt).join('・')}ポイントのどれかです。${caps}</p>
${capsSeen.length ? `<p>${capsSeen.map((c) => `上限${fmt(c)}の回は、${POINT_MAX_SHOPS}店舗なら税込${fmt(pointReach(POINT_MAX_SHOPS, c))}円、5店舗なら税込${fmt(pointReach(5, c))}円の合計で特典が上限に届きます`).join('。')}。店の数ごとの届く額は<a href="/point/">${esc(parent.name)}</a>の早見表にあります。</p>` : ''}`,
      )
    : ''}

${granted.length
    ? section(
        'fuyo',
        '付与日と有効期限',
        `<p>${fuyoText}</p>
${crossYear ? `<p>${mdJa(crossYear.start)}からの回のように、有効期限が次の年の${mdJa(crossYear.expires)}になる回もあります。${yOf(crossYear.grant) === yOf(crossYear.end) ? 'この回は、特典がつくのは同じ年のうちで、使える期限は年が明けてからです。' : 'この回は、特典がつくのも使える期限も、年が明けてからです。'}</p>` : ''}
<p>表の付与日と有効期限は、買いまわりの特典の分だけです。</p>`,
      )
    : ''}

${section(
  'spu',
  'SPUの変更の記録',
  `<div class="tbl-wrap"><table class="tbl-text">
<thead><tr><th>日付</th><th>変わったこと</th></tr></thead>
<tbody>
${SPU_CHANGES.map((c) => `<tr><td class="nw">${jaDate(c.date)}</td><td>${esc(c.text)}</td></tr>`).join('\n')}
</tbody>
</table></div>
<p>SPUは毎月の買い物にかかる倍率で、お買い物マラソンの特典とは別に足されます。今の倍率と上限は<a href="/point/spu/">SPUのポイント計算</a>にあります。</p>`,
)}

${section(
  'tashikame',
  'データの確かめ方',
  `<p>表の回は、楽天市場の公式のページで期間を確かめたものです。上限・付与日・有効期限は、その回の公式のページに出てから書いています。確かめる前に公式のページがあとの回の中身に変わったときは、${DASH}のままにしています。</p>
<p>このページは作り直すたびに、終わりの日時を過ぎた回を表に足します。始まる前の回と開催中の回はのせません。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(FAQS))}

${section(
  'sources',
  '出典',
  `<ul class="src-list">${sources.map((x) => `<li><a href="${x.url}" rel="noopener">${esc(x.name)}</a>（${x.starts}からの回、${x.checked}に確認）</li>`).join('')}<li><a href="${SPU_PAGE}" rel="noopener">${esc(SPU_SOURCES[0].name)}</a>（SPUの変更）</li></ul>
<p>このサイトは楽天グループとは関係のない個人のサイトです。キャンペーンの決まりは変わることがあるので、買う前に公式のページで確かめてください。</p>`,
)}

${relatedHtml(tool)}
`;
  const lastCap = last && typeof last.cap === 'number' ? `上限は${fmt(last.cap)}ポイントでした` : '上限は公式で確かめられませんでした';
  const html = page({
    path,
    title: `${tool.name}｜前回の上限・付与日・有効期限`,
    description: last
      ? `楽天市場のお買い物マラソンの終わった${n}回を、期間・上限・付与日・有効期限の表にまとめました。前回は${mdJa(last.start)}から${mdJa(lastEnd)}までで、${lastCap}。SPUの変更の記録ものせています。`
      : '楽天市場のお買い物マラソンの終わった回を、期間・上限・付与日・有効期限の表にまとめるページです。上限は5,000・7,000・10,000ポイントのどれかです。',
    breadcrumbs: [
      { name: 'ホーム', path: '/' },
      { name: parent.name, path: '/point/' },
      { name: tool.name, path },
    ],
    jsonLd: [faqLd(FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    noindex: !ready,
    body,
  });
  return { path, html, sitemap: ready, updated: tool.updated };
}
