// ふるさと納税のコーナー第2弾（10/22）：手続きの3つのページ。テーマは紺の手帳（コーナーと同じ）
// /furusato/onestop/：ワンストップ特例の申請（寄付先の数・確定申告・マイナンバーカードから、出す封筒の数と中身と期限）
// /furusato/shimekiri/：今年の締め切り（年内の寄付・申請書・確定申告まで、あと何日か。今日は見た人のブラウザの日付）
// /furusato/memo/：寄付メモ（寄付の記録・残りの枠・自治体の数・申請書。記録はこの端末のブラウザの中だけに保存して送らない）
// 計算は src/lib/furusato-tetsuzuki.mjs・furusato-memo.mjs、出典は src/data/furusato.mjs の FURUSATO_TETSUZUKI_SOURCES
// 使わない言葉（総務省のQ&A）：お得・還元・購入・ポイント など。scripts/verify-dist.mjs が見張る
import { toolBySlug } from '../tools.mjs';
import { page, section, faqHtml, faqLd, esc, icon } from '../layout.mjs';
import { relatedHtml, toolLd, themeOf } from '../parts.mjs';
import { boxField } from '../fields.mjs';
import { FURUSATO_TETSUZUKI_SOURCES } from '../data/furusato.mjs';
import { kakuteiEnd, ONESTOP_MAX } from '../lib/furusato-tetsuzuki.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';
import { MEMO_MAX_ROWS, MEMO_NAME_MAX } from '../lib/furusato-memo.mjs';

const YEAR = 2026; // 寄付の年（本文の表。1月1日に次の年へ。src/pages/furusato.mjs と同じ）
const jaDate = (s) => `${Number(s.slice(0, 4))}年${Number(s.slice(5, 7))}月${Number(s.slice(8))}日`;
const dw = (d) => `${d.y}年${d.m}月${d.d}日（${weekdayOf(d)}）`;
const NOSCRIPT = '<noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>';

const SOURCES = `<ul class="src-list">${FURUSATO_TETSUZUKI_SOURCES.map(
  (s) => `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>（${esc(s.what)}、${jaDate(s.checked)}に確認）</li>`,
).join('')}</ul>
<p>個人で作っているツールで、税理士の監修ではありません。最後は寄付先の自治体や、住んでいる市区町村で確かめてください。</p>`;

const crumbs = (tool, path) => [
  { name: 'ホーム', path: '/' },
  { name: toolBySlug('furusato').name, path: '/furusato/' },
  { name: tool.name, path },
];

// 2つのマス（はじめにえらんでおくほうは pressed）
const tile2 = (attr, label, opts) => `<div class="tiles tiles-2" role="group" aria-label="${label}">
      ${opts.map(([v, b, small, pressed]) => `<button type="button" class="tile tile-word" ${attr}="${v}" aria-pressed="${pressed}"><b>${b}</b><small>${small}</small></button>`).join('\n      ')}
    </div>`;

/* ---- /furusato/onestop/ ワンストップ特例の申請 ---- */
// 寄付先の数：大きな −／＋ と、名前を中に書いたまん中の欄（下のマスと左右のはしをそろえる）
const STEPPER = `<div class="stepper box-stepper">
      <button type="button" class="step-btn" id="cities-minus" aria-label="寄付先を1つへらす">${icon('<path d="M5 12h14"/>')}</button>
      <div class="field box-field" id="f-cities"><label for="cities">寄付先</label><div class="input"><input id="cities" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="3" data-hint="寄付した自治体の数。同じ自治体は1つ"><span class="unit">つ</span></div></div>
      <button type="button" class="step-btn" id="cities-plus" aria-label="寄付先を1つふやす">${icon('<path d="M5 12h14M12 5v14"/>')}</button>
    </div>`;

const OS_FAQS = [
  {
    q: '同じ自治体に2回寄付したら？',
    a: '<p>申請書は寄付ごとに出すので2枚です。5つまでの数え方では、同じ年の同じ自治体は1つです。</p>',
  },
  {
    q: '申請書はどこでもらえますか？',
    a: '<p>寄付を申し込むときに送ってもらうか、寄付先の自治体のページから印刷します。</p>',
  },
  {
    q: 'オンラインで出せますか？',
    a: '<p>マイナンバーカードをスマホで読み取って出せる自治体があります。そのときは紙の申請書もコピーも要りません。</p>',
  },
  {
    q: '申請書を出したあとに引っ越したら？',
    a: '<p>寄付した翌年の1月10日までに、申請事項変更届出書を寄付先に出します。名前が変わったときも同じです。</p>',
  },
  {
    q: '医療費控除で確定申告することになったら？',
    a: '<p>ワンストップ特例の申請は、ぜんぶ使えなくなります。確定申告に、申請した分もふくめてその年の寄付をぜんぶ書きます。</p>',
  },
  {
    q: '6つ目の自治体に寄付したら？',
    a: '<p>5つまでの申請も使えなくなり、その年の寄付はぜんぶ確定申告で控除を受けます。</p>',
  },
  {
    q: '1月10日に間に合わなかったら？',
    a: '<p>確定申告をすれば控除を受けられます。寄付した翌年の2月16日から3月15日までです。</p>',
  },
  {
    q: 'ちゃんと控除されたか、どこで見ますか？',
    a: '<p>翌年6月ごろの住民税の決定通知書で、寄附金税額控除の額を見ます。ワンストップ特例では所得税は戻らず、その分も住民税から減ります。</p>',
  },
];

function renderOnestop() {
  const tool = toolBySlug('furusato-onestop');
  const path = '/furusato/onestop/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">寄付先の数から、申請書と期限を出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    ${STEPPER}
    ${tile2('data-kakutei', '確定申告', [['0', '申告しない', '会社員など', true], ['1', '確定申告', '医療費控除など', false]])}
    ${tile2('data-card', 'マイナンバーカード', [['1', 'カードあり', 'マイナンバー', true], ['0', 'カードなし', '通知カードなど', false]])}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">特例の申請</p>
    <button type="button" class="clear-btn doc-clear" id="clear">クリア</button>
    <p class="doc-sum" id="r-sum"><span class="doc-sum-k" id="r-cap">出す申請書</span><span class="doc-sum-v"><b id="r-num">？</b><span id="r-unit">通</span></span></p>
    <p class="doc-info"><span id="r-due"></span><span id="r-left"></span></p>
    <div class="os-envs" id="os-envs" aria-hidden="true"></div>
    <table class="doc-table os-table"><tbody>
      <tr><td id="d-k-0">封筒の中</td><td id="d-v-0">—</td></tr>
      <tr><td id="d-k-1">出す先</td><td id="d-v-1">—</td></tr>
    </tbody></table>
    <p class="doc-foot"><span id="r-foot">寄付先の数を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools"><a class="tool-btn tool-link" href="/furusato/memo/">寄付メモ</a><a class="tool-btn tool-link span-2" href="/furusato/shimekiri/">締め切りまでの日数</a></div>
  ${NOSCRIPT}
</div>

${section(
  'items',
  '出すもの',
  `<div class="tbl-wrap"><table>
<thead><tr><th>もの</th><th>中身</th></tr></thead>
<tbody>
<tr><td>申請書</td><td>寄付ごとに1枚。住所・名前・マイナンバー・寄付した日と金額を書き、2つのチェック欄に印をつけます</td></tr>
<tr><td>カードがあるとき</td><td>マイナンバーカードの表と裏のコピー</td></tr>
<tr><td>カードがないとき</td><td>通知カードか番号の入った住民票の写しと、運転免許証などのコピー</td></tr>
<tr><td>出す先</td><td>寄付した自治体。封筒は寄付先ごとに分けます</td></tr>
<tr><td>期限</td><td>寄付した翌年の1月10日に届いていること</td></tr>
</tbody>
</table></div>
<p>2つのチェック欄は、確定申告をしないことと、寄付先が5つまでであることです。通知カードは、名前と住所が住民票と同じときだけ使えます。</p>`,
)}

${section(
  'cannot',
  '使えないとき',
  `<div class="tbl-wrap"><table>
<thead><tr><th>こんなとき</th><th>どうなるか</th></tr></thead>
<tbody>
<tr><td>確定申告をした</td><td>申請はぜんぶ使えない。確定申告に寄付をぜんぶ書く</td></tr>
<tr><td>寄付先が6つ以上</td><td>5つまでの分も使えない。確定申告をする</td></tr>
<tr><td>1月10日に届かなかった</td><td>その申請は使えない。確定申告をする</td></tr>
<tr><td>引っ越して届け出ていない</td><td>使えない。1月10日までに変更の届出を出す</td></tr>
</tbody>
</table></div>
<p>確定申告をしない会社員などで、寄付先が${ONESTOP_MAX}つまでの人が使えます。医療費控除や住宅ローン控除の1年目で確定申告をする人は、はじめから確定申告にします。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(OS_FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'ワンストップ特例の申請｜申請書と期限・書き方（ふるさと納税）',
    description: 'ふるさと納税のワンストップ特例で、寄付先に出す申請書の数と、いっしょに送るマイナンバーカードのコピー、1月10日の期限を出します。使えないときと、引っ越したときの届出ものせています。',
    breadcrumbs: crumbs(tool, path),
    jsonLd: [toolLd(tool, 'ふるさと納税のワンストップ特例で、寄付先の数から出す申請書の数と添える書類、期限までの日数を出すツール。'), faqLd(OS_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-onestop.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---- /furusato/shimekiri/ 今年の締め切り ---- */
const SK_END = kakuteiEnd(YEAR + 1);
const SK_FAQS = [
  {
    q: '12月31日の夜に寄付しても間に合いますか？',
    a: `<p>12月31日までに決済や入金が終わった寄付が、${YEAR}年の寄付です。銀行のATMやネットバンキングは、時間外だと次の営業日の入金になることがあります。</p>`,
  },
  {
    q: '年末に寄付したら、申請書が間に合いますか？',
    a: '<p>年末の寄付は、紙の申請書が1月に届く自治体があります。自治体のページから印刷するか、オンラインで出すと間に合いやすくなります。</p>',
  },
  {
    q: '申請書が1月10日に届かなかったら？',
    a: '<p>ワンストップ特例は使えないので、確定申告で控除を受けます。</p>',
  },
  {
    q: '1月1日に寄付したら？',
    a: '<p>その年の寄付になり、上限もその年の所得で決まります。住民税が減るのは、次の年の6月からです。</p>',
  },
  {
    q: '寄付のサイトの締め切りは？',
    a: '<p>12月31日より前に受付を終える支払い方法や自治体があります。寄付のサイトと自治体のページで確かめてください。</p>',
  },
];

function renderShimekiri() {
  const tool = toolBySlug('furusato-shimekiri');
  const path = '/furusato/shimekiri/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">寄付と申請の期限まで、あと何日か出します。</p>

<div class="calc" id="calc">
  <div class="box-rows">
    <div class="tiles tiles-2" role="group" aria-label="手続き">
      <button type="button" class="tile tile-word" data-how="onestop" aria-pressed="true"><b>ワンストップ</b><small>申請書を出す</small></button>
      <button type="button" class="tile tile-word" data-how="kakutei" aria-pressed="false"><b>確定申告</b><small>医療費控除など</small></button>
    </div>
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">締め切り</p>
    <p class="doc-sum"><span class="doc-sum-k" id="r-cap">年内の寄付まで</span><span class="doc-sum-v"><small class="sk-ato">あと</small><b id="r-num">？</b>日</span></p>
    <p class="doc-info"><span id="r-today"></span></p>
    <div class="sk-cals" aria-hidden="true">
      ${[0, 1].map((i) => `<div class="sk-cal"><p class="sk-what" id="c-what-${i}">—</p><div class="cal"><p class="cal-ym" id="c-ym-${i}">—</p><p class="cal-d" id="c-d-${i}">？</p><p class="cal-w" id="c-w-${i}"></p></div><p class="sk-left" id="c-left-${i}"></p></div>`).join('')}
    </div>
    <table class="doc-table os-table"><tbody>
      <tr><td id="d-k-0">年内の寄付</td><td id="d-v-0">—</td></tr>
      <tr><td id="d-k-1">申請書</td><td id="d-v-1">—</td></tr>
    </tbody></table>
    <p class="doc-foot"><span id="r-foot"></span></p>
  </div>
  <div class="calc-tools"><a class="tool-btn tool-link span-2" href="/furusato/onestop/">申請書の出し方</a><a class="tool-btn tool-link" href="/furusato/memo/">寄付メモ</a></div>
  ${NOSCRIPT}
</div>

${section(
  'table',
  `${YEAR}年の寄付の締め切り`,
  `<div class="tbl-wrap"><table>
<thead><tr><th>こと</th><th>期限</th></tr></thead>
<tbody>
<tr><td>寄付の入金</td><td>${dw({ y: YEAR, m: 12, d: 31 })}</td></tr>
<tr><td>ワンストップ特例の申請書</td><td>${dw({ y: YEAR + 1, m: 1, d: 10 })}必着</td></tr>
<tr><td>申請のあとの変更の届出</td><td>${dw({ y: YEAR + 1, m: 1, d: 10 })}</td></tr>
<tr><td>確定申告</td><td>${dw({ y: YEAR + 1, m: 2, d: 16 })}〜${dw(SK_END)}</td></tr>
<tr><td>住民税が減る</td><td>${YEAR + 1}年6月から</td></tr>
</tbody>
</table></div>
<p>1月10日は土日でも同じ日です。確定申告の終わりの3月15日が土日のときは、次の月曜までです。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(SK_FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: `ふるさと納税はいつまで｜${YEAR}年の寄付と申請の締め切りまであと何日`,
    description: `ふるさと納税の${YEAR}年の寄付は12月31日まで、ワンストップ特例の申請書は${YEAR + 1}年1月10日必着です。今日からあと何日かを出し、確定申告の期間ものせています。`,
    breadcrumbs: crumbs(tool, path),
    jsonLd: [toolLd(tool, 'ふるさと納税の年内の寄付、ワンストップ特例の申請書、確定申告の締め切りまで、今日からあと何日かを出すツール。'), faqLd(SK_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-shimekiri.js'],
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

/* ---- /furusato/memo/ 寄付メモ ---- */
const MEMO_FIRST = 3; // はじめに出す行の数（「＋1つ追加」で MEMO_MAX_ROWS まで）
const memoRow = (i) => `<div class="kifu-row" id="row-${i}"${i >= MEMO_FIRST ? ' hidden' : ''}>
      <div class="field" id="f-name-${i}"><label class="sr-only" for="name-${i}">${i + 1}つめの自治体</label><div class="input"><input id="name-${i}" type="text" inputmode="text" maxlength="${MEMO_NAME_MAX}" autocomplete="off" enterkeyhint="next" placeholder="${['〇〇市', '〇〇町', '〇〇村'][i % 3]}"></div></div>
      <div class="field" id="f-amount-${i}"><label class="sr-only" for="amount-${i}">${i + 1}つめの金額</label><div class="input"><input id="amount-${i}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${['10,000', '20,000', '15,000'][i % 3]}"></div></div>
      <button type="button" class="kifu-sent" id="sent-${i}" aria-pressed="false" aria-label="${i + 1}つめの申請書">未</button>
    </div>`;

const MEMO_FAQS = [
  {
    q: '記録はどこに保存されますか？',
    a: '<p>この端末のブラウザの中だけです。サイトには送りません。</p>',
  },
  {
    q: '記録が消えることはありますか？',
    a: '<p>ブラウザのデータを消すと消えます。別の端末やブラウザでは見えないので、「コピー」で控えの文をメモアプリなどにも残せます。</p>',
  },
  {
    q: '申請書の「未」「済」は何ですか？',
    a: '<p>ワンストップ特例の申請書を出したかの印です。押すたびに切りかわります。</p>',
  },
  {
    q: '自治体の数はどう数えますか？',
    a: `<p>同じ名前の自治体は1つと数えます。${ONESTOP_MAX + 1}つ目を入れると、ワンストップ特例が使えないと出ます。</p>`,
  },
  {
    q: '上限の目安はどこで出しますか？',
    a: '<p><a href="/furusato/">上限の目安</a>か<a href="/furusato/jougen/">控除上限額の計算</a>で出します。上限の目安の答えの下の「寄付メモ」から開くと、上限が入ります。</p>',
  },
  {
    q: '記録を消すには？',
    a: '<p>「ぜんぶ消す」を2回押すと、その年の記録が消えます。</p>',
  },
];

function renderMemo() {
  const tool = toolBySlug('furusato-memo');
  const path = '/furusato/memo/';
  const body = `
<h1>${tool.name}</h1>
<p class="lead">寄付の合計と、残りの枠を記録します。</p>

<div class="calc" id="calc" data-first="${MEMO_FIRST}">
  <div class="box-rows">
    <div class="box-row-link">${boxField('limit', '上限', '円', '57,000', '', '上限の目安の計算で出した額')}<a class="wide-btn" href="/furusato/">上限を計算</a></div>
  </div>
  <div class="seg seg-2 kifu-years" id="memo-years" role="group" aria-label="寄付の年" hidden></div>
  <div class="cols kifu-cols"><span aria-hidden="true">自治体</span><span aria-hidden="true">金額（円）</span><span aria-hidden="true">申請書</span></div>
  <div id="memo-rows">
    ${Array.from({ length: MEMO_MAX_ROWS }, (_, i) => memoRow(i)).join('\n    ')}
  </div>
  <div class="doc" aria-live="polite">
    <p class="doc-title">寄付の控え</p>
    <p class="doc-sum" id="r-sum"><span class="doc-sum-k" id="r-cap">のこり</span><span class="doc-sum-v"><b id="r-num">？</b>円</span></p>
    <p class="doc-info"><span id="r-year"></span><span id="r-save"></span></p>
    <div class="kifu-bar" id="memo-bar" aria-hidden="true"></div>
    <table class="doc-table os-table"><tbody>
      <tr><td>合計</td><td id="d-total">—</td></tr>
      <tr><td>自治体</td><td><span class="kifu-boxes" id="memo-boxes" aria-hidden="true"></span><span id="d-cities">—</span></td></tr>
      <tr><td>まだの申請書</td><td id="d-unsent">—</td></tr>
    </tbody></table>
    <p class="doc-foot"><span id="r-foot">上限と、寄付した自治体と金額を入れてください</span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <div class="calc-tools">
    <button type="button" class="tool-btn" id="to-add"><span>＋1つ追加</span></button>
    <button type="button" class="tool-btn" id="copy">コピー</button>
    <button type="button" class="tool-btn" id="wipe">ぜんぶ消す</button>
  </div>
  ${NOSCRIPT}
</div>

${section(
  'formula',
  '計算のしかた',
  `<div class="formula">
<span>のこり ＝ 上限の目安 − 寄付の合計</span>
</div>
<p>例：上限の目安が57,000円で、10,000円と20,000円を寄付したら、のこりは27,000円です。</p>
<p>のこりが2,000円より少ないときは、寄付しても控除が増えないことがあります。上限は目安なので、ぎりぎりまで寄付しないほうが、こえる心配が減ります。</p>`,
)}

${section(
  'check',
  '寄付のあとにすること',
  `<div class="tbl-wrap"><table>
<thead><tr><th>こと</th><th>期限</th></tr></thead>
<tbody>
<tr><td>寄付の入金</td><td>12月31日</td></tr>
<tr><td>ワンストップ特例の申請書を出す</td><td>翌年1月10日必着</td></tr>
<tr><td>確定申告をする人は申告</td><td>翌年2月16日〜3月15日</td></tr>
<tr><td>住民税の決定通知書で控除を見る</td><td>翌年6月ごろ</td></tr>
</tbody>
</table></div>
<p>確定申告をする人は、寄付先から届く受領証明書を取っておきます。くわしくは<a href="/furusato/onestop/">ワンストップ特例の申請</a>です。</p>`,
)}

${section('faq', 'よくある質問', faqHtml(MEMO_FAQS))}

${section('sources', '出典', SOURCES)}

${relatedHtml(tool)}
`;
  const html = page({
    path,
    title: 'ふるさと納税の寄付メモ｜残りの枠と自治体の数・申請書を記録（登録なし）',
    description: 'ふるさと納税の寄付を記録して、上限の目安までの残り、寄付した自治体の数、出していない申請書の数を出します。記録はこの端末のブラウザの中だけに保存し、送信しません。登録はいりません。',
    breadcrumbs: crumbs(tool, path),
    jsonLd: [toolLd(tool, 'ふるさと納税の寄付を端末の中に記録し、上限の目安までの残り、自治体の数、ワンストップ特例の申請書を管理するツール。'), faqLd(MEMO_FAQS)],
    theme: themeOf(tool),
    ogImage: `/og/${tool.slug}.png`,
    scripts: ['furusato-memo.js'],
    footNote: '寄付メモの記録は、この端末のブラウザの中だけに保存します。送信はしません。',
    body,
  });
  return { path, html, sitemap: true, updated: tool.updated };
}

export default function render() {
  return [renderOnestop(), renderShimekiri(), renderMemo()];
}
