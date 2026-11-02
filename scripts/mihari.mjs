// 見張り（.github/workflows/mihari.yml）。Node の標準だけで動く（依存なし）。くわしくは docs/shikumi.md の「見張り（mihari.yml）」
// 何もなければ何もしない。何かあったときだけ Issue を作る：
//   ラベル mihari … しょーくんに知らせるだけ（公開・見張りの失敗、外のページが7日見られない など）。毎朝の「朝の確認」が知らせる
//   ラベル night  … 直すことが決まっているもの（題は「【夜】…」、本文は夜のメモの形）。毎晩の「夜のまとめ作業」が PR まで進める
// 使い方：
//   node scripts/mihari.mjs run                      workflow_run（WR_* の環境変数）。失敗 → mihari の Issue、成功 → 同じ題の Issue を閉じる
//   node scripts/mihari.mjs daily                    毎朝の点検（確認日・Kドリームス・消費税・お買い物マラソンの記録・早見表の PDF）
//   node scripts/mihari.mjs memo <kind> <report.md>  watch.yml・check-links.yml の Issue の本文（夜のメモ＋報告）を出す
// 環境変数：GITHUB_TOKEN・GITHUB_REPOSITORY・DRY_RUN=true（Issue を作らず、題と本文をログに出す）・TODAY=YYYY-MM-DD（日付を決めて試す）

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DAY = 86400000;
const ROOT = new URL('../', import.meta.url);
export const UA = 'sakutto-keisan-mihari (+https://sakutto-keisan.com/about/)';
export const footer = (file = 'mihari.yml') => `見張り（.github/workflows/${file}）が作った`;

// ---------- 日付（日本時間） ----------
export const jstDate = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
export const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 日曜 … 2 火曜
export const jaDate = (date) => date.slice(5).split('-').map(Number).join('月') + '日';
export function jaDateTime(iso) {
  const d = new Date(Date.parse(iso) + 9 * 3600e3);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// ---------- 出典の確認日（テストの決まりと同じ。tests/furusato.test.mjs・tests/spu.test.mjs を変えたらここも直す） ----------
// ふるさと納税：確認日から90日（日本時間の11・12・1月は30日）。テストは日本時間にずらした時刻でくらべる。SPU：90日
export function passesChecked(kind, checked, nowMs) {
  const at = Date.parse(`${checked}T00:00:00+09:00`);
  if (kind === 'furusato') {
    const today = nowMs + 9 * 3600e3;
    const month = new Date(today).getUTCMonth() + 1;
    const max = month >= 11 || month === 1 ? 30 : 90;
    return (today - at) / DAY <= max;
  }
  return (nowMs - at) / DAY <= 90;
}

// 期限：その日の終わりまでテストが通る、いちばん後の日（今日から先へ1日ずつ見る。月で日数が変わるので計算では出さない）
// もう過ぎていたら、通っていた最後の日（さかのぼって見る）
export function deadlineOf(kind, checked, nowMs) {
  const today = jstDate(nowMs);
  const ends = (d) => passesChecked(kind, checked, Date.parse(`${d}T23:59:59+09:00`));
  if (!ends(today)) {
    for (let i = 1; i <= 400; i++) if (ends(addDays(today, -i))) return addDays(today, -i);
    return checked;
  }
  for (let i = 0; i <= 400; i++) {
    const d = addDays(today, i);
    if (!passesChecked(kind, checked, Date.parse(`${d}T23:59:59+09:00`))) return addDays(d, -1);
  }
  return addDays(today, 400);
}

// 期限まで within 日以内の出典（同じ種類・url・確認日はまとめる）。近い順
export function checkedAlerts(sources, nowMs, within = 10) {
  const today = jstDate(nowMs);
  const groups = new Map();
  for (const s of sources) {
    const key = `${s.kind}|${s.url}|${s.checked}`;
    if (!groups.has(key)) {
      const deadline = deadlineOf(s.kind, s.checked, nowMs);
      groups.set(key, { kind: s.kind, url: s.url, checked: s.checked, deadline, left: daysBetween(today, deadline), names: [] });
    }
    groups.get(key).names.push(s.name);
  }
  return [...groups.values()].filter((g) => g.left <= within).sort((a, b) => a.left - b.left || a.url.localeCompare(b.url));
}

// ---------- 外のページ ----------
export function textOf(html) {
  return String(html)
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}
// くらべやすく：全角の英数字を半角に、空白を取る
export const norm = (s) => String(s).replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[\s\u3000]+/g, '');

export function decode(buf, ctype = '') {
  const head = buf.subarray(0, 4096).toString('latin1');
  const cs = (/charset=["']?([\w-]+)/i.exec(ctype || '') || /<meta[^>]+charset=["']?([\w-]+)/i.exec(head) || [])[1];
  try {
    return new TextDecoder(cs || 'utf-8').decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

// timeout 20秒・1回だけやり直す。つながらなくても止めない（status 0 と理由を返す）
export async function fetchPage(url) {
  let last = '';
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ja' }, signal: AbortSignal.timeout(20000) });
      const buf = Buffer.from(await r.arrayBuffer());
      const page = { status: r.status, url: r.url || url, title: '', text: '' };
      const html = decode(buf, r.headers.get('content-type'));
      page.title = textOf((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '');
      page.text = textOf(html);
      if (r.status >= 500 && i === 0) { last = `HTTP ${r.status}`; continue; }
      return page;
    } catch (e) {
      last = e?.message || String(e);
    }
  }
  return { status: 0, url, title: '', text: '', error: last };
}

// Kドリームスの SPU のページ：open（開けた）・maintenance（メンテナンス中）・unknown（開けたが SPU のページではない）・error
// 2026-10-23 は「緊急メンテナンス中のため全てのサービスを停止」だった。メンテナンスのページへ飛ばされたときも maintenance
export function kdreamsState({ status, url = '', title = '', text = '' }) {
  if (status === 503 || /mainte/i.test(url) || /メンテナンス/.test(title)) return 'maintenance';
  if (!(status >= 200 && status < 300)) return 'error';
  const t = norm(text);
  if (/緊急メンテナンス|(?:全て|すべて)のサービスを(?:一時)?停止/.test(t)) return 'maintenance';
  if (!/SPU|スーパーポイントアップ/i.test(t)) return /メンテナンス/.test(t) ? 'maintenance' : 'unknown';
  return 'open';
}

// 国税庁の消費税率引下げ特設サイト：enacted（法律になったとはっきり書いてある）・changed（法案の文が変わった。知らせるだけ）・pending・unknown
// いまの文（2026-11-02）は「…今後、法案が国会に提出され、審議を経た上で可決・成立した場合のものです。」なので、「成立」の言葉だけでは決めない
// 「〜ましたら」「〜次第」（これからの話）は数えない。法律の番号は、同じ文に飲食料品か引下げがあるときだけ
const ENACTED = [
  [/成立(?:いた)?しました(?!ら)/, '成立しました'],
  [/公布されました(?!ら)/, '公布されました'],
  [/施行(?:日|期日)?が決まりました(?!ら)/, '施行が決まりました'],
  [/施行されることとなりました/, '施行されることとなりました'],
];
export function shohizeiStatus(text) {
  const t = norm(text);
  if (!/消費税/.test(t) || !/引下げ|引き下げ/.test(t)) return { status: 'unknown', why: '特設サイトの文が見つからない' };
  const sentences = t.split('。');
  for (const [re, word] of ENACTED) {
    if (sentences.some((s) => re.test(s) && !/場合/.test(s))) return { status: 'enacted', why: `「${word}」の言葉が出た` };
  }
  if (sentences.some((s) => /令和\d+年法律第\d+号/.test(s) && /飲食料品|引下げ|引き下げ/.test(s))) return { status: 'enacted', why: '引下げの法律の番号（令和◯年法律第◯号）が出た' };
  if (/廃案|審議未了|継続審議/.test(t)) return { status: 'changed', why: '「廃案」「継続審議」などの言葉が出た' };
  if (!/成立した場合/.test(t)) return { status: 'changed', why: '「法案が…成立した場合のもの」の文がなくなった' };
  return { status: 'pending', why: 'まだ「法案が…成立した場合のもの」のまま' };
}

// ---------- お買い物マラソンの記録・早見表 ----------
export function kirokuCount(events, nowMs) {
  const endOf = (e) => Date.parse(`${/T\d\d:\d\d$/.test(e.end) ? `${e.end}:00` : e.end}+09:00`);
  const ended = events.filter((e) => endOf(e) < nowMs);
  return { ended: ended.length, withCap: ended.filter((e) => typeof e.cap === 'number').length };
}
export const kirokuReady = (c) => c.ended >= 6 && c.withCap >= 4;

export const inPrintWindow = (date) => date.slice(5) >= '11-01' && date.slice(5) <= '12-20';
export const printsMissing = (names, year) => [`nenrei-${year + 1}.pdf`, `gakureki-${year + 1}.pdf`].filter((n) => !names.includes(n));

// ---------- Issue の本文 ----------
const DONE = '`npm run check` が緑で、PR の CI（build-deploy）も緑';
const NO_COPY = '公式の文を写さない（自分の言葉で短く）';
const NO_GUESS = (who) => `数字・日付は、公式（${who}）で確かめたものだけを書く。推測で書かない`;
const UNSURE = '確かめられないものは直さず、Issue にコメントで残す。何も変えなかったときは、理由を1行コメントして Issue を閉じる';
const MERGE_YES = 'する（しょーくんの OK のあと司令塔がマージ）';
const MERGE_NO = 'しない（プレビューを見てもらう）';
const LIB = '計算のしくみ（src/lib/）まで変える必要があるときは、PR に理由を書き、マージしない';
const RAKUTEN = '楽天市場・楽天の各サービスの公式のページ';
const FURUSATO = '総務省・国税庁・財務省・市区町村';

export const MEMO = {
  'watch-point': {
    do: [
      '本文の「ふえた数字・なくなった数字」を手がかりに、楽天市場の公式のページ https://event.rakuten.co.jp/campaign/point-up/marathon/ ・ https://event.rakuten.co.jp/campaign/point-up/marathon/schedule/ ・ https://event.rakuten.co.jp/campaign/point-up/marathon/guide/ を開いて確かめる',
      '新しい回が公式に出ていれば src/data/point.mjs の POINT_EVENTS に足す。期間はページのとおり。上限・付与日（grant）・有効期限（expires）はページに書いてあるときだけ（なければ cap は null で、grant・expires は書かない）。checked は今日',
      '買いまわりのルール（1店舗の最低金額・倍率・上限・数えないもの）が変わっていれば、src/data/point.mjs と、合わなくなった src/pages/point.mjs の文を直す',
      '日付の表示が変わっただけなど、サイトに関係のない変化なら何も変えない',
    ],
    done: DONE,
    rules: [NO_GUESS(RAKUTEN), NO_COPY, '予想・公開前の日程・対象者限定の情報・くじは書かない', `変えてよいのは src/data/point.mjs・src/pages/point.mjs・tests/point.test.mjs だけ。${LIB}`],
    unsure: UNSURE,
    read: 'CLAUDE.md の「文章の決まり」・docs/point.md の「お買い物マラソン /point/ とコーナーの決まり」・docs/shikumi.md の「公式のページの見張り（watch.yml）」',
    merge: MERGE_YES,
  },
  'watch-spu': {
    do: [
      '本文に書かれた公式のページを開いて、src/data/spu.mjs の SPU_ITEMS の倍率（rate）・1か月の上限（cap）・条件の短いまとめ（cond）が合っているか確かめる',
      '変わっていれば直す（上限が確かめられないものは null）。楽天市場の SPU のページの更新履歴に新しい変更があれば、src/pages/spu.mjs の「SPUの最近の変更」の表に1行足す',
      'サービスがふえた・へったときは、全部そろったときの倍率のテスト（tests/spu.test.mjs）も公式の数に合わせる',
      '関係のない変化なら、そのページの出典（SPU_SOURCES と、同じ url の SPU_ITEMS）の checked を今日にするだけ',
    ],
    done: DONE,
    rules: [NO_GUESS(RAKUTEN), NO_COPY, `変えてよいのは src/data/spu.mjs・src/pages/spu.mjs・tests/spu.test.mjs だけ。${LIB}`],
    unsure: UNSURE,
    read: 'CLAUDE.md の「文章の決まり」・docs/point.md の「SPU /point/spu/」・docs/shikumi.md の「公式のページの見張り（watch.yml）」',
    merge: MERGE_YES,
  },
  'watch-furusato': {
    do: [
      '本文に書かれた出典のページを開いて、src/data/furusato.mjs の数字（控除・税率・基準）や、ページの手続き・期限の文（src/pages/furusato.mjs・furusato-tetsuzuki.mjs・furusato-seido.mjs）に関わる変更かを確かめる',
      '関わらない変更（文の書きかえ・お知らせが増えただけ）なら、その出典の checked を今日にするだけ',
      '関わる変更なら、確かめた数字と文を直し、テストの期待値も出典で確かめた数字に合わせる',
    ],
    done: DONE,
    rules: [NO_GUESS(FURUSATO), NO_COPY, `変えてよいのは src/data/furusato.mjs・src/pages/furusato.mjs・furusato-tetsuzuki.mjs・furusato-seido.mjs・tests/furusato.test.mjs・tests/furusato-tetsuzuki.test.mjs だけ。${LIB}`],
    unsure: UNSURE,
    read: 'CLAUDE.md の「文章の決まり」・docs/furusato.md の「コーナーのページ」・docs/shikumi.md の「公式のページの見張り（watch.yml）」',
    merge: MERGE_YES,
  },
  links: {
    do: [
      'いちばん新しいコメントか本文の報告を見る',
      '「開けない・移ったリンク」：GitHub から開けなかった（404・ドメインなし・トップへ飛ばされた）出典。WebFetch は古い写しで消えたページも開けてしまうので、開けたかどうかで判断しない。WebSearch で同じ発行元（同じ役所・同じ会社・同じメーカー）の新しいページを探し、中身がサイトの数字・文と合っているか確かめてから、そのリンクがある所（grep で探す。src/data/*.mjs・src/pages/*.mjs・src/lib/seisou.mjs など）の url と、変わっていれば name を差しかえる。checked のある出典は今日にする',
      '数字がちがっていたら、ほかの出典でも確かめたうえで直し、テストの期待値も合わせる。製品が売り切れて消えたメーカーのページは、同じメーカーの後継の製品の仕様のページに替え、表の数字もその製品に合わせる',
      'src/data/hyohakuzai.mjs の出典の名前を変えたら python3 scripts/make-prints.py で印刷用の PDF を作り直す（tests/prints.test.mjs が見張る）',
      '「確認日が古くなる」：出典を開いて、ページの内容がサイトの数字・文と合っていれば checked を今日にする。ちがえば公式で確かめて直す（SPU・Amazon・買いまわり・ふるさと納税）',
      '「断られた・つながらない」：消えたとは限らないので直さない',
      'PR の「出典の点検」の注記（check-runs の check の annotations）で、差しかえたリンクが GitHub から開けたか確かめる。まだ開けなければ、もう一度探す',
    ],
    done: DONE,
    rules: [NO_GUESS('役所・会社・メーカー'), NO_COPY, '変えてよいのは、リンクのある src/data/*.mjs・src/pages/*.mjs・src/lib/seisou.mjs と、それに合わせるテスト・src/data/prints.json・public/print/ の PDF（src/data/henreihin.mjs はのぞく）'],
    unsure: '確かめられないもの・同じ発行元に代わりのページが見つからないものは直さず、Issue を閉じずに、残ったものと理由をコメントする',
    read: 'CLAUDE.md の「ページの決まり」・docs/shikumi.md の「出典・外部リンクの点検（check-links.yml）」',
    merge: MERGE_YES,
  },
  checked: {
    do: [
      '下の出典を1つずつ開いて、ページの内容がサイトの数字・文と合っているか確かめる。合っていれば checked を今日にする',
      'ちがえば直す。SPU は src/data/spu.mjs の倍率・上限・条件（上限が確かめられないものは null）と src/pages/spu.mjs の文。ふるさと納税は src/data/furusato.mjs の数字と、ページの手続き・期限の文。テストの期待値も出典で確かめた数字に合わせる',
      '出典のページが無くなっていたら、同じ役所・同じ会社の同じ内容のページを探して url と name を直す',
    ],
    done: `${DONE}。期限（テストの決まり：ふるさと納税は確認日から90日、日本時間の11・12・1月は30日。SPU は90日）を過ぎると、テストと毎日の本番の公開が止まるので、期限までにマージする`,
    rules: [NO_GUESS(`${FURUSATO}・${RAKUTEN}`), NO_COPY, `変えてよいのは src/data/furusato.mjs・src/data/spu.mjs と、その出典を使うページ（src/pages/furusato*.mjs・src/pages/spu.mjs）・テストだけ。${LIB}`],
    unsure: UNSURE,
    read: 'CLAUDE.md の「文章の決まり」・docs/furusato.md の「コーナーのページ」・docs/point.md の「SPU /point/spu/」',
    merge: MERGE_YES,
  },
  kdreams: {
    do: [
      '楽天Kドリームスの SPU のページ https://keirin.kdreams.jp/special/spu/ を開いて、倍率・1か月の獲得上限ポイント・条件（対象の投票・月の金額・のぞくもの）を読み取る。上限が書いていなければ、楽天市場の SPU のページ https://event.rakuten.co.jp/campaign/point-up/everyday/point/ でも楽天Kドリームスの上限を探す',
      '上限が公式に書いてあったとき：src/data/spu.mjs の kdreams の cap をその数字に。倍率（rate）・条件（cond）がちがえば直す。url は上限を確かめたページ（Kドリームスのページなら https://keirin.kdreams.jp/special/spu/ を定数にして使う）、checked は今日。Kドリームスのページで確かめたときは、SPU_SOURCES に { name: \'楽天Kドリームス「SPU」\', url, checked: 今日, what: \'Kドリームスの条件と上限\' } を足す。tests/spu.test.mjs の「reachOf(\'kdreams\') が null」と「noCap が [\'kdreams\']」のところを新しい上限に合わせる（届く額は spuReach の計算どおり。noCap は空になる）',
      'どちらのページにも上限が書いていなかったとき：cap は null のまま、kdreams の url と checked だけ直す（Kドリームスのページで条件を確かめられたら、上と同じく SPU_SOURCES にも足す）。PR に「上限は公式に書いていなかった」と書く',
      'ページの文（src/pages/spu.mjs）に、合わなくなった所があれば直す',
    ],
    done: DONE,
    rules: [NO_GUESS('楽天Kドリームス・楽天市場'), NO_COPY, '変えてよいのは src/data/spu.mjs・src/pages/spu.mjs・tests/spu.test.mjs だけ。ほかも変えるときは PR に理由を書き、マージしない'],
    unsure: `${UNSURE}。開いたらまだメンテナンス中だったときも、何も変えずにコメントして閉じる`,
    read: 'CLAUDE.md の「文章の決まり」・docs/point.md の「SPU /point/spu/」',
    merge: MERGE_YES,
  },
  shohizei: {
    do: [
      'まず、国会で可決・成立した（参議院の本会議で可決された）ことを、国税庁・財務省の案内か、成立をはっきり伝える報道で確かめる。成立していなければ何も変えず、いまの状況を1行コメントして閉じる',
      '成立した法律の中身（税率・対象・始まる日・終わる日）を、国税庁・財務省の公式のページで確かめる（確かめられないものは書かない）',
      '消費税の計算 /shohizei/（src/pages/shohizei.mjs・src/client/ の消費税のスクリプト・src/lib/ の消費税の計算・tests/）を直す：税率のマスに「1％」を足す。マスの下の小さな字は、食品・2027年4月から のように、いつからかがわかる言葉。今日がまだ2027年4月1日より前なら、はじめにえらんでおくマスは10％のまま',
      'よくある質問の「2027年4月から食品の消費税は変わりますか？」を、成立した中身と出典（国税庁の特設サイト）に合わせて書き直す。1％のときの税込・税抜・消費税の計算例をテストに足す',
      '作業用ブランチ → PR を作り、PR の CI（build-deploy）が緑になるのを確かめる',
    ],
    done: `${DONE}。CLAUDE.md の「公開前の決まり」の点検（check-fold・check-edges・check-flow）も通る`,
    rules: [NO_GUESS('国税庁・財務省と、成立を伝える報道'), NO_COPY, '廃案・継続審議・修正（税率や始まる日の変更）になっていたら、直さずにコメントで知らせる'],
    unsure: UNSURE,
    read: 'CLAUDE.md の「公開前の決まり」「入力の流れは上から下へ」「文章の決まり」・docs/tools.md の「消費税 /shohizei/」',
    merge: `${MERGE_NO}。ツールの見た目と計算が変わるので、しょーくんがプレビューを見て決める`,
  },
  kiroku: {
    do: [
      'すでに同じ役わりのページ（開催の記録）があれば、作らずにコメントして閉じる',
      '調べもの用ブランチ survey/suggest の survey/suggest.json（git fetch origin survey/suggest。main には入れない）で「過去」「前回」「いつ」「上限」などの候補と点数を見て、ページの名前とタイトルを決める（「次回」「予想」「スケジュール」は使わない）',
      'ページを作る（例 /point/kiroku/）：表は src/data/point.mjs の POINT_EVENTS からビルドのときに自動で作る（終わった回だけ。新しい回が足されると、次のビルドで表に入る）。列は 回・期間・上限・付与日・有効期限。上限などが公式で確かめられなかった回は「—」。SPU の変更の記録は、src/pages/spu.mjs の「SPUの最近の変更」の表を、データ（src/data/spu.mjs）に移して両方のページで使う形にしてよい',
      '数字から言えることだけを短く書く（例：上限が7,000ポイントだった回の数）。「楽天グループとは関係のない個人のサイト」と書く。/point/ のページで使わない言葉（verify-dist.mjs が見張る）を使わない',
      'CLAUDE.md の「ツールを1つ足す手順」のうち、このページに合うもの（tools.mjs に足す・parent は /point/ のツール・トップには出さない・関連ツール・共有画像・テストで表の作り方を確かめる）をやる。計算のツールではないので、check-fold.py・check-flow.py は入力のないページの決まりに合わせる',
      'CLAUDE.md の「公開前の決まり」の点検をすべてやる。docs/files.md の表と docs/point.md に、新しいページの1行を足す',
    ],
    done: `${DONE}。PR にプレビューの URL のコメントが付く`,
    rules: ['数字・日付は、src/data/ にある公式で確かめたものだけを使う。推測で書かない', NO_COPY, '予想・公開前の日程・次の回の話・対象者限定の情報・くじは書かない。楽天のロゴ・赤い帯・公式に似た表を使わない'],
    unsure: '小さい迷いはサイトの決まりに合うほうをえらび、PR に書く。確かめられないものは「—」',
    read: 'CLAUDE.md の「サイト作りの方針」「ツールを1つ足す手順」「公開前の決まり」「デザインの決まり」「文章の決まり」「ページの決まり」・docs/point.md',
    merge: `${MERGE_NO}。新しいページなので、しょーくんがプレビューを見て決める`,
  },
  prints: {
    do: [
      'docs/files.md の `src/prints.mjs`・`scripts/make-prints.py` の行に従う',
      '`python3 scripts/make-prints.py` を動かす（今年と来年の PDF を作り、去年より前の PDF を消し、src/data/prints.json を直す）',
      '作った PDF は pdftoppm で画像にして、1ページにおさまり、年・和暦（来年の和暦）・表がくずれていないかを目で見る。src/prints.mjs のレイアウトは、行がはみ出すときだけ直してよい（直したら make-prints をもう一度）',
      '元号が変わる発表があったなど、来年の和暦が「令和」の続きでないかもしれないときは、PR に書く',
    ],
    done: `${DONE}。public/print/ に来年の nenrei・gakureki の PDF が入る`,
    rules: ['表の数字を手で書きかえない', 'ページは今年の PDF にリンクしていて、1月1日の毎日のビルドで来年の PDF に切りかわる。年内に来年の PDF が main に入っている必要がある'],
    unsure: '小さい迷いはサイトの決まりに合うほうをえらび、PR に書く',
    read: 'CLAUDE.md の「ファイル」・docs/files.md の `src/prints.mjs`・`scripts/make-prints.py` の行',
    merge: `${MERGE_NO}。しょーくんに知らせて、12月31日までにマージ`,
  },
};

export function nightBody(m, found, file = 'mihari.yml') {
  const line = (k, v) => `- ${k}：${Array.isArray(v) ? `\n${v.map((x) => `  - ${x}`).join('\n')}` : v}`;
  return [
    line('やること', m.do),
    line('できあがりの条件', m.done),
    line('決まったこと', m.rules),
    line('迷ったら', m.unsure),
    line('読むファイル', m.read),
    line('マージ', m.merge),
    '',
    '## 見張りが見つけたこと',
    '',
    String(found).trim(),
    '',
    footer(file),
    '',
  ].join('\n');
}

// 止まると困る workflow（name → Issue の題と、何が止まったかの1行）
export const WATCHED = {
  'Build and Deploy': { title: '本番の公開が止まっています（Build and Deploy）', what: '本番の公開（deploy.yml）が失敗しました。サイトの更新が止まっています。' },
  'Watch official pages': { title: '公式のページの見張りが止まっています（watch.yml）', what: '公式のページの見張り（watch.yml）が失敗しました。マラソン・SPU・ふるさと納税の変化に気づけません。' },
  出典の点検: { title: '出典の点検が止まっています（check-links.yml）', what: '出典の点検（check-links.yml）が失敗しました。消えた出典のリンクに気づけません。' },
  'Henreihin daily': { title: '返礼品の毎日の取り直しが止まっています（henreihin-daily.yml）', what: '返礼品の毎日の取り直し（henreihin-daily.yml）が失敗しました。毎日の本番の公開が動いていません。' },
};

export const clip = (s, n = 200) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

export function failureBody({ what, when, url, steps = [], notes = [] }) {
  return [
    what,
    '',
    `- いつ：${when}（日本時間）`,
    `- 実行：${url}`,
    `- 失敗したジョブとステップ：${steps.length ? steps.join('、') : 'わからない'}`,
    `- 失敗の注記：${notes.length ? '' : 'なし'}`,
    ...notes.slice(0, 3).map((n) => `  - ${clip(n)}`),
    '',
    footer(),
    '',
  ].join('\n');
}

// ---------- GitHub API（GITHUB_TOKEN だけ） ----------
const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY || 'juice0402/sakutto-keisan';
const DRY = process.env.DRY_RUN === 'true';
const RUN_URL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID || ''}`;
const LABELS = {
  mihari: { color: 'd93f0b', description: '見張りが見つけた。しょーくんに知らせるだけ' },
  night: { color: '5319e7', description: '夜のまとめ作業が直す' },
};

async function gh(path, { method = 'GET', body } = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN がない');
  const url = path.startsWith('/') ? `${API}${path}` : `${API}/repos/${REPO}/${path}`;
  const r = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': UA, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) throw new Error(`GitHub API ${method} ${path.split('?')[0]}：HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}
async function pages(path, max = 5) {
  const out = [];
  for (let p = 1; p <= max; p++) {
    const list = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${p}`);
    if (!list) break;
    out.push(...list);
    if (list.length < 100) break;
  }
  return out;
}

let openCache;
async function openIssues() {
  if (!openCache) openCache = DRY && !process.env.GITHUB_TOKEN ? [] : (await pages('issues?state=open')).filter((i) => !i.pull_request);
  return openCache;
}

async function ensureLabel(name) {
  if (await gh(`labels/${encodeURIComponent(name)}`)) return;
  await gh('labels', { method: 'POST', body: { name, ...LABELS[name] } }).catch((e) => console.log(`ラベル ${name} を作れなかった（${e.message}）`));
}

// その日（日本時間）にまだなら「まだ続いている」を1つだけ
async function commentOnce(number, text) {
  const since = new Date(Date.parse(`${jstDate(Date.now())}T00:00:00+09:00`)).toISOString();
  const today = await pages(`issues/${number}/comments?since=${since}`, 2);
  if (today.some((c) => c.user?.type === 'Bot' && c.body.startsWith('まだ続いている'))) return console.log(`#${number}：今日はもうコメントした`);
  await gh(`issues/${number}/comments`, { method: 'POST', body: { body: text } });
  console.log(`#${number} に「まだ続いている」とコメントした`);
}

// 同じ題の開いた Issue があればコメント、なければ作る
// once：閉じた同じ題の Issue があっても作らない（1回きりの作業）。night は、閉じた同じ題の Issue の PR（claude/night-番号）が開いていても作らない
async function raise({ title, body, label, match = (t) => t === title, once = false, still = `まだ続いている（${RUN_URL}）` }) {
  const open = (await openIssues()).find((i) => match(i.title));
  if (DRY) {
    console.log(`[dry_run] ${open ? `#${open.number} にコメントするはず：${still}` : `Issue を作るはず（ラベル ${label}）`}\n題：${title}\n${open ? '' : body}\n---`);
    return;
  }
  if (open) return commentOnce(open.number, still);
  if (once || label === 'night') {
    const same = (await pages('issues?state=all', 20)).filter((i) => !i.pull_request && match(i.title));
    if (once && same.length) return console.log(`閉じた同じ Issue がある（#${same[0].number}）ので作らない：${title}`);
    if (same.length) {
      const prs = await pages('pulls?state=open', 2);
      const pr = prs.find((p) => same.some((i) => p.head?.ref === `claude/night-${i.number}`));
      if (pr) return console.log(`PR #${pr.number} が開いているので作らない：${title}`);
    }
  }
  await ensureLabel(label);
  const made = await gh('issues', { method: 'POST', body: { title, body, labels: [label] } });
  console.log(`Issue #${made.number} を作った：${title}`);
}

// 同じ題の開いた mihari の Issue に「直った」とコメントして閉じる
async function resolve(title, url) {
  const open = (await openIssues()).filter((i) => i.title === title && i.labels.some((l) => l.name === 'mihari'));
  for (const i of open) {
    if (DRY) { console.log(`[dry_run] #${i.number} を閉じるはず：${title}`); continue; }
    await gh(`issues/${i.number}/comments`, { method: 'POST', body: { body: `直った（${url}）` } });
    await gh(`issues/${i.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
    console.log(`#${i.number} を閉じた：${title}`);
  }
}

// ---------- workflow_run ----------
async function onRun() {
  const name = process.env.WR_NAME;
  const conclusion = process.env.WR_CONCLUSION;
  const w = WATCHED[name];
  if (!w) return console.log(`見張りの対象ではない：${name}`);
  const url = process.env.WR_URL;
  if (conclusion === 'success') return resolve(w.title, url);
  if (!['failure', 'timed_out', 'startup_failure'].includes(conclusion)) return console.log(`${name}：${conclusion}（何もしない）`);
  const steps = [];
  const notes = [];
  try {
    const { jobs = [] } = (await gh(`actions/runs/${process.env.WR_ID}/jobs?filter=latest&per_page=100`)) || {};
    for (const j of jobs.filter((x) => ['failure', 'timed_out'].includes(x.conclusion))) {
      const bad = (j.steps || []).filter((s) => ['failure', 'timed_out'].includes(s.conclusion)).map((s) => s.name);
      steps.push(`${j.name} › ${bad.join('・') || '（ステップ不明）'}`);
      const runId = String(j.check_run_url || '').split('/').pop() || j.id;
      const ann = (await gh(`check-runs/${runId}/annotations?per_page=50`)) || [];
      notes.push(...ann.filter((a) => a.annotation_level === 'failure').map((a) => a.message));
    }
  } catch (e) {
    console.log(`ジョブと注記を読めなかった（${e.message}）`);
  }
  await raise({
    title: w.title,
    label: 'mihari',
    body: failureBody({ what: w.what, when: jaDateTime(process.env.WR_STARTED || new Date().toISOString()), url, steps, notes }),
    still: `まだ続いている（${url}）`,
  });
}

// ---------- 毎朝の点検 ----------
const KDREAMS = 'https://keirin.kdreams.jp/special/spu/';
const NTA = 'https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/zeiritsuhikisage.htm';
const STATE = new URL('.mihari/state.json', ROOT);
const data = (file) => import(new URL(`src/data/${file}`, ROOT).href);

// 外のページが7日続けて見られなかったときだけ mihari の Issue（はじめて見られなかった日をキャッシュに置く）
async function track(state, key, name, url, ok, today, why) {
  const u = (state.unreachable ||= {});
  const title = `見張りが外のページを7日見られません（${name}）`;
  if (ok) {
    if (u[key]) { delete u[key]; await resolve(title, RUN_URL); }
    return;
  }
  u[key] = { since: u[key]?.since || today, why };
  const days = daysBetween(u[key].since, today);
  console.log(`${name}：見られなかった（${why}）。${u[key].since} から${days}日`);
  if (days < 7) return;
  await raise({
    title,
    label: 'mihari',
    body: [`${name}のページを、見張りが ${u[key].since} から見られていません（${why}）。ページが移ったか、GitHub からの読み込みを断られているかもしれません。`, '', `- ページ：${url}`, `- 実行：${RUN_URL}`, '', footer(), ''].join('\n'),
  });
}

async function checkChecked(nowMs) {
  const f = await data('furusato.mjs');
  const s = await data('spu.mjs');
  const pick = (kind) => (x) => ({ kind, name: x.name, url: x.url, checked: x.checked });
  const sources = [
    ...[...f.FURUSATO_SOURCES, ...f.FURUSATO_TETSUZUKI_SOURCES, ...f.FURUSATO_SEIDO_SOURCES, ...f.FURUSATO_FUUFU_SOURCES].map(pick('furusato')),
    ...[...s.SPU_ITEMS, ...s.SPU_SOURCES].map(pick('spu')),
  ];
  const all = checkedAlerts(sources, nowMs, Infinity);
  if (all[0]) console.log(`確認日：いちばん近い期限は ${all[0].deadline}（残り${all[0].left}日・${all[0].kind}）`);
  const rows = all.filter((g) => g.left <= 10);
  if (!rows.length) return;
  const ja = { furusato: 'ふるさと納税', spu: 'SPU' };
  const head = '【夜】ふるさと納税／SPU の出典の確認日の確かめ直し';
  const found = [
    `テストの期限まで10日以内の出典が ${rows.length} か所あります（${jstDate(nowMs)} の見張り）。`,
    '',
    ...rows.map((g) => `- ${ja[g.kind]}：${g.names.join('・')}（${g.url}）確認日 ${g.checked} → 期限 ${jaDate(g.deadline)}（残り${g.left}日）`),
  ].join('\n');
  await raise({
    title: `${head}（${jaDate(rows[0].deadline)} まで）`,
    label: 'night',
    match: (t) => t.startsWith(head),
    body: nightBody(MEMO.checked, found),
    still: `まだ続いている（いちばん近い期限 ${jaDate(rows[0].deadline)}・残り${rows[0].left}日。${RUN_URL}）`,
  });
}

async function checkKdreams(state, nowMs, today) {
  if (today > '2026-11-22') return;
  const s = await data('spu.mjs');
  const k = s.SPU_ITEMS.find((x) => x.id === 'kdreams');
  if (!k || typeof k.cap === 'number') return console.log('Kドリームス：もう上限が入っている');
  if ([k, ...s.SPU_SOURCES].some((x) => /kdreams\.jp/.test(x.url))) return console.log('Kドリームス：もう Kドリームスのページで確かめてある');
  const page = await fetchPage(KDREAMS);
  const st = kdreamsState(page);
  console.log(`Kドリームス：${st}（HTTP ${page.status}${page.error ? `・${page.error}` : ''}）`);
  await track(state, 'kdreams', '楽天Kドリームス「SPU」', KDREAMS, st === 'open' || st === 'maintenance', today, page.error || `HTTP ${page.status}・${st}`);
  if (st !== 'open') return;
  await raise({
    title: '【夜】SPU の楽天Kドリームスの上限を公式に合わせる',
    label: 'night',
    once: true,
    body: nightBody(MEMO.kdreams, [
      `楽天Kドリームスの SPU のページ ${KDREAMS} が開けた（HTTP ${page.status}・メンテナンスの文なし・SPU の言葉あり。${today} の見張り）。`,
      `いまの src/data/spu.mjs の kdreams：rate ${k.rate}・cap null・url ${k.url}・checked ${k.checked}（2026-10-23 はメンテナンス中で上限を確かめられなかった）。`,
    ].join('\n')),
  });
}

async function checkShohizei(state, nowMs, today) {
  if (today > '2027-01-31' || weekdayOf(today) !== 2) return;
  const page = await fetchPage(NTA);
  const r = page.status >= 200 && page.status < 300 ? shohizeiStatus(page.text) : { status: 'error', why: page.error || `HTTP ${page.status}` };
  console.log(`消費税：${r.status}（${r.why}）`);
  await track(state, 'nta', '国税庁「消費税率引下げ特設サイト」', NTA, r.status !== 'error' && r.status !== 'unknown', today, r.why);
  const about = 'いまの法案：2027年4月1日から2年間、飲食料品（酒類と外食をのぞく）の消費税率を8％から1％にする（2026-10-09 閣議決定）。';
  if (r.status === 'enacted') {
    await raise({
      title: '【夜】消費税の計算に食品の1％を足す（法律の成立）',
      label: 'night',
      once: true,
      body: nightBody(MEMO.shohizei, `国税庁の特設サイト ${NTA} に、${r.why}（${today} の見張り）。\n${about}`),
    });
  } else if (r.status === 'changed') {
    await raise({
      title: '消費税の引き下げの特設サイトの文が変わりました',
      label: 'mihari',
      once: true,
      body: [`国税庁の特設サイトで、${r.why}（${today}）。成立とははっきり書いていないので、直す作業は作っていません。チャットで「消費税の法案がどうなったか確かめて」と頼んでください。`, '', `- ページ：${NTA}`, `- ${about}`, `- 実行：${RUN_URL}`, '', footer(), ''].join('\n'),
    });
  }
}

async function checkKiroku(nowMs, today) {
  if (today > '2027-12-31' || today.slice(8) !== '15') return;
  const p = await data('point.mjs');
  const c = kirokuCount(p.POINT_EVENTS, nowMs);
  console.log(`お買い物マラソンの記録：終わった回 ${c.ended}・上限がわかっている回 ${c.withCap}`);
  if (!kirokuReady(c)) return;
  const tools = readFileSync(new URL('src/tools.mjs', ROOT), 'utf8');
  if (readdirSync(new URL('src/pages/', ROOT)).some((f) => /kiroku/.test(f)) || /kiroku/.test(tools)) return console.log('お買い物マラソンの記録：もうページがある');
  await raise({
    title: '【夜】お買い物マラソン・スーパーSALE の開催の記録のページを作る',
    label: 'night',
    once: true,
    body: nightBody(MEMO.kiroku, `src/data/point.mjs の POINT_EVENTS に、終わった回が ${c.ended}（うち上限が数字の回 ${c.withCap}）たまった（${today} の見張り。決まり：終わった回6以上・上限がわかっている回4以上）。2026-10-23 の討論で「開催と変更の記録は、データがたまってから」と決めていたもの。`),
  });
}

async function checkPrints(nowMs, today) {
  if (!inPrintWindow(today)) return;
  const y = Number(today.slice(0, 4));
  const missing = printsMissing(readdirSync(new URL('public/print/', ROOT)), y);
  if (!missing.length) return console.log(`早見表：${y + 1}年の PDF はもうある`);
  const prs = DRY && !process.env.GITHUB_TOKEN ? [] : await pages('pulls?state=open', 2);
  const pr = prs.find((x) => x.head?.ref === `claude/print-${y + 1}` || (/早見表|print/i.test(`${x.title} ${x.head?.ref}`) && `${x.title} ${x.head?.ref}`.includes(String(y + 1))));
  if (pr) return console.log(`早見表：PR #${pr.number} が開いている`);
  await raise({
    title: `【夜】早見表の PDF に${y + 1}年を足す`,
    label: 'night',
    body: nightBody(MEMO.prints, `main の public/print/ に ${missing.join('・')} がない（${today} の見張り）。1月1日のビルドでページが${y + 1}年の PDF に切りかわるので、12月31日までに main に入れる。`),
  });
}

async function daily() {
  const nowMs = process.env.TODAY ? Date.parse(`${process.env.TODAY}T05:47:00+09:00`) : Date.now();
  const today = jstDate(nowMs);
  console.log(`見張り：${today}（${'日月火水木金土'[weekdayOf(today)]}）${DRY ? '・dry_run' : ''}`);
  let state = {};
  try { state = JSON.parse(readFileSync(STATE, 'utf8')); } catch { /* はじめて */ }
  let failed = 0;
  const steps = [
    ['確認日', () => checkChecked(nowMs)],
    ['Kドリームス', () => checkKdreams(state, nowMs, today)],
    ['消費税', () => checkShohizei(state, nowMs, today)],
    ['お買い物マラソンの記録', () => checkKiroku(nowMs, today)],
    ['早見表', () => checkPrints(nowMs, today)],
  ];
  for (const [name, fn] of steps) {
    try {
      await fn();
    } catch (e) {
      failed++;
      console.log(`::warning title=見張り（${name}）::${e.message}`);
    }
  }
  if (!DRY && !process.env.TODAY) {
    mkdirSync(new URL('.mihari/', ROOT), { recursive: true });
    writeFileSync(STATE, JSON.stringify(state));
  }
  if (failed) process.exitCode = 1;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'run') return onRun();
  if (cmd === 'daily') return daily();
  if (cmd === 'memo' && MEMO[args[0]] && args[1] && existsSync(args[1])) {
    const file = args[0] === 'links' ? 'check-links.yml' : 'watch.yml';
    process.stdout.write(nightBody(MEMO[args[0]], readFileSync(args[1], 'utf8'), file));
    return;
  }
  console.error('使い方：node scripts/mihari.mjs run | daily | memo <watch-point|watch-spu|watch-furusato|links> <report.md>');
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`見張り：${e.message}`);
    process.exitCode = 1;
  });
}
