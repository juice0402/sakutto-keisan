# 晩ごはんシミュレーター（/kondate/）

1週間（月〜日）の晩ごはんを、曜日ごとの決まりで組む道具。2026-11-10 にしょーくんと決めた。作るのは育てる山（docs/sodateru.md）の「晩ごはんシミュレーター①②」。経緯はプロジェクトの `claude/sakutto-kondate-plan.md`。

## 決まったこと（11/10 しょーくん）
- 名前「晩ごはんシミュレーター」・URL /kondate/・生活のカテゴリ（方眼ノート）
- 1日に出すのは主菜1品。料理名と主な食材だけで、作り方・分量は出さない。料理は約200品
- 曜日ごとの決まり：おまかせ・肉・魚・麺・丼・カレー・鍋・作らない（曜日ごとに残る）
- 1週間は月曜はじまり。今週の過ぎた日は作り直さない。来週の分は「来週の手帳へ」でページをめくって作る
- 料理を押すとその日だけ入れかえ、曜日を押すととめる（赤ペンの丸）。同じ料理は1週間に1回まで
- 冷蔵庫は「あるかないか」だけ。丸をつけた食材を使う料理が先に出る。苦手にした食材を使う料理は出ない
- 買うもの：その週の料理の食材のうち、冷蔵庫に丸のないもの（今週は今日から先の日だけ）。「メモする」でちょいメモへ
- 保存はこの端末の localStorage（`sakutto-kondate`）だけ。送らない。プライバシーポリシーに1文、ホーム画面に置く案内を1行
- 楽しさ：「1週間をつくる」で料理名が1日ずつ書きこまれていく・「これまでの献立」がたまっていく
- 買う理由（アフィリエイトなど）は今回は入れない。使われ方を見てから決める
- 見た目は案B「ウィークリー手帳」（下の見本）。案A「献立表（7行のリスト）」はえらばなかった
- そのあと：使われ方を見てから、App Store のアプリ（ios-kobo のしくみ）を考える

## 料理のデータ（`src/data/kondate.mjs`）
- 料理 `{ id, name, kind, ings }`。id は一度出したら変えない・消さない（端末に残した献立が id で持つため）
- kind：肉・魚・麺・丼・カレー・鍋・ほか。「ほか」（卵・豆腐・野菜が主役）は決まりが「おまかせ」の日だけ出る
- ings：主な食材2〜4つ。食材の言葉は `KONDATE_ING` 1つにそろえる（冷蔵庫・苦手の一覧と同じ言葉）。米・調味料・油・粉・ルウ・チューブの薬味・にんにく・しょうがは入れない
- 食材は `KONDATE_ING`（グループ「肉・魚」「野菜」「ほか」）に72。はじめの一覧に、料理に要る12（ハム・さんま・いわし・かれい・かじき・まぐろ・たこ・あさり・ほたて・しらす・明太子・水菜）を足した。全部で80まで、どの食材も2品以上で使う（テストが見る）
- 料理は202品（2026-11-12・#152）：肉55・魚35・麺31・丼26・カレー15・鍋20・ほか20。迷ったものは、麻婆豆腐・コロッケ・お好み焼き・チャプチェはほか、カレー鍋はカレー、鍋焼きうどんは麺、ポトフは肉にした
- 組み方は `src/lib/kondate.mjs`：週の月曜 `kondateMonday`・作り直してよい最初の日 `kondateFrom`（今週は今日の曜日、来週は0）・1週間 `kondateMakeWeek`・1日の入れかえ `kondateSwap`・買うもの `kondateShopping`・端末のデータ `kondateParse`／`kondateStringify`。決まりの名前は `KONDATE_RULES`（おまかせ・肉・魚・麺・丼・カレー・鍋・作らない）で、routine にもこの言葉で入る。候補がない日の理由は「苦手が多くて合う料理がありません」か「ほかの日と重ならない料理がありません」。ページの本文の例は `KONDATE_EXAMPLE`・`kondateExampleWeek()`（決まった乱数 `kondateRand`）

## 見た目（案B・ウィークリー手帳）
11/10 に本物のページ（/recipe/ の上）に重ねて作った見本の CSS と HTML。スマホは2列×4マス、1080px 以上は4列×2マスでまん中にとじ目の二重線。8マスめが「買うもの」。クラス名（km-・kb-）は見本の名前なので、サイトの決まりに合わせて変えてよい（形と色はこのとおり）。

```css
mark { background: linear-gradient(transparent 55%, var(--marker) 55%); color: inherit; }
/* 曜日の決まり＝付箋（下に透明の select を重ねる） */
.km-rt { position: relative; display: flex; align-items: center; justify-content: center; background: var(--note); color: var(--text); font-size: 13px; font-weight: 700; line-height: 1.15; text-align: center; border-radius: 1px 1px 2px 2px; transform: rotate(-1deg); }
.km-rt.r-niku { background: var(--note3); }
.km-rt.r-sakana { background: var(--note2); }
.km-rt.r-omakase { background: transparent; outline: 1.5px dashed var(--border); outline-offset: -1.5px; transform: none; }
.km-rt.r-off { background: transparent; color: var(--muted); outline: 1.5px solid var(--rule); outline-offset: -1.5px; transform: none; }
.km-rt select { position: absolute; inset: 0; width: 100%; opacity: 0; font-size: 16px; }
.km-hint { margin: 8px 0 0; font-size: 13px; color: var(--muted); line-height: 1.5; }
.km-memo { font: inherit; font-size: 14px; font-weight: 700; color: var(--text); background: none; border: 0; padding: 10px 0 6px; text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 4px; cursor: pointer; }
.km-h { display: flex; align-items: baseline; gap: 8px; margin: 0 0 4px; font-size: 16px; font-weight: 800; line-height: 1.4; }
.km-h small { font-size: 13px; font-weight: 600; color: var(--muted); }
/* 冷蔵庫・苦手・これまでの献立 */
.km-sec { margin-top: 24px; }
.km-sub { margin: 0 0 4px; font-size: 13px; color: var(--muted); }
.km-group { display: flex; flex-wrap: wrap; align-items: center; gap: 0 2px; padding: 2px 0; border-top: 1px dashed var(--border); }
.km-gl { width: 3.6em; font-size: 12px; font-weight: 700; color: var(--muted); }
.km-ing { position: relative; font: inherit; font-size: 16px; font-weight: 600; color: var(--text); background: none; border: 0; padding: 8px; min-height: 44px; cursor: pointer; }
.km-ing[aria-pressed="true"] { color: var(--red); }
.km-ing[aria-pressed="true"]::after { content: ""; position: absolute; inset: 5px -1px; border: 2.5px solid var(--red); border-radius: 50% 44% 52% 47% / 56% 48% 52% 44%; transform: rotate(-4deg); pointer-events: none; }
.km-ng .km-ing[aria-pressed="true"] { color: var(--muted); text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 2px; }
.km-ng .km-ing[aria-pressed="true"]::after { display: none; }
.km-ng summary { cursor: pointer; font-weight: 800; font-size: 16px; padding: 6px 0; list-style: none; }
.km-ng summary small { font-size: 13px; color: var(--muted); font-weight: 600; margin-left: 8px; }
.km-past p { margin: 0; padding: 6px 0; border-top: 1px dashed var(--border); font-size: 14px; line-height: 1.6; }
.km-past p span { display: inline-block; width: 4.2em; color: var(--muted); font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
/* 手帳 */
.kb-week { position: relative; display: grid; grid-template-columns: 1fr 1fr; margin-top: 12px; background: var(--surface); border: 1.5px solid var(--text); border-radius: var(--radius); }
.kb-week::before { /* マスキングテープ（.calc::before と同じ） */ content: ""; position: absolute; top: -9px; left: 50%; width: 84px; height: 17px; margin-left: -42px; background: repeating-linear-gradient(45deg, rgb(226 202 150 / .85) 0 6px, rgb(238 220 178 / .85) 6px 12px); transform: rotate(-2.5deg); z-index: 1; }
.kb-cell { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 96px; padding: 4px 8px 6px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.kb-cell:nth-child(-n+2) { padding-top: 10px; } /* テープが曜日にかからない */
.kb-cell:nth-child(2n) { border-right: 0; }
.kb-cell:nth-last-child(-n+2) { border-bottom: 0; }
.kb-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.kb-dow { font: inherit; background: none; border: 0; color: var(--text); display: flex; align-items: baseline; gap: 5px; min-height: 38px; padding: 0 6px; margin-left: -6px; line-height: 1; cursor: pointer; }
.kb-dow b { position: relative; font-size: 18px; font-weight: 800; }
.kb-dow small { font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.kb-dow[aria-pressed="true"] small { color: var(--red); }
.kb-dow[aria-pressed="true"] b::after { /* とめた日：曜日の字に赤ペンの丸 */ content: ""; position: absolute; inset: -7px -8px -6px; border: 2.5px solid var(--red); border-radius: 50% 44% 52% 47% / 56% 48% 52% 44%; transform: rotate(-4deg); }
.is-today .kb-dow b { background: linear-gradient(transparent 58%, var(--marker) 58%); }
.is-sat b.d { color: #2f62a8; }
.is-sun b.d { color: var(--red); }
.kb-cell .km-rt { width: 60px; height: 28px; font-size: 12.5px; }
.kb-dish { font: inherit; text-align: left; background: none; border: 0; color: var(--text); display: flex; flex-direction: column; flex: 1; min-width: 0; padding: 0; cursor: pointer; }
.kb-dish b { font-size: 16px; font-weight: 800; line-height: 1.3; }
.kb-dish small { margin-top: 2px; font-size: 11.5px; line-height: 1.4; color: var(--muted); }
.kb-dish.is-off { /* 作らない日：鉛筆のななめ線 */ background: linear-gradient(to top right, transparent calc(50% - .8px), var(--border) 50%, transparent calc(50% + .8px)); margin: 2px 0 0; }
.kb-dish.is-off b { font-weight: 600; color: var(--muted); font-size: 14px; }
.kb-buy { background: var(--sheet); }
.kb-buy .km-h { font-size: 14px; margin: 6px 0 2px; }
.kb-buy p { margin: 0; font-size: 12.5px; line-height: 1.5; font-weight: 600; }
.kb-buy .km-memo { padding: 6px 0 0; font-size: 13px; align-self: flex-start; }
.nw { white-space: nowrap; }
@media screen and (min-width: 1080px) {
  .kb-full { grid-column: 1 / -1; }
  .kb-week { grid-template-columns: repeat(4, 1fr); }
  .kb-cell { min-height: 118px; padding: 6px 12px 8px; }
  .kb-cell:nth-child(-n+4) { padding-top: 12px; }
  .kb-cell:nth-child(2n) { border-right: 1px solid var(--border); }
  .kb-cell:nth-child(4n) { border-right: 0; }
  .kb-cell:nth-child(4n+2) { border-right: 3px double var(--text); } /* とじ目 */
  .kb-cell:nth-last-child(-n+2) { border-bottom: 1px solid var(--border); }
  .kb-cell:nth-last-child(-n+4) { border-bottom: 0; }
  .kb-dish b { font-size: 17px; }
  .kb-dish small { font-size: 12.5px; }
  .kb-foot { display: flex; align-items: center; gap: 20px; margin: 0 0 26px; }
  .kb-foot .wide-btn { width: 430px; flex: none; }
}
```

```html
<!-- 1マス（とめた日は .kb-dow に aria-pressed="true"。今日は .kb-cell に is-today、土は is-sat、日は is-sun） -->
<div class="kb-cell is-today">
  <div class="kb-top">
    <button class="kb-dow" aria-pressed="false"><b class="d">火</b><small>11/10</small></button>
    <label class="km-rt r-omakase">おまかせ<select aria-label="火曜の決まり">…8つの option…</select></label>
  </div>
  <button class="kb-dish"><b>豚肉の生姜焼き</b><small>豚こま・<mark>玉ねぎ</mark></small></button>
</div>
<!-- 作らない日 -->
<div class="kb-cell is-sat">…<button class="kb-dish is-off"><b>作らない</b></button></div>
<!-- 8マスめ -->
<div class="kb-cell kb-buy">
  <h2 class="km-h">買うもの<small>7つ</small></h2>
  <p><span class="nw">豚こま</span>・<wbr><span class="nw">さば</span>・<wbr>…</p>
  <button class="km-memo">メモする</button>
</div>
<!-- 並び：.kb-full（h1・リード・週の見出し・.kb-week・.kb-foot〔ボタンと案内〕）→ .pc-left（冷蔵庫・苦手・これまでの献立）→ .pc-right（本文） -->
```

## ページ（`src/pages/kondate.mjs`・`src/client/kondate.js`。#166）
- 手帳（h1〜ボタンの段）は `page({ top })` で `<main>` のいちばん上に置き、パソコン（1080px〜）は左右の段にまたがる（`.kb-full`）。左の段（`#calc`＝`.km-side`）は冷蔵庫・苦手・これまでの献立・ちょいメモ、右の段は本文
- 料理が選べなかった理由は残さない（開き直すと空のマスになる）。決まりを変えたとき、その週にまだ料理がなければ決まりを覚えるだけ
- 苦手を足しても、もう入っている料理は入れかえない（次に「1週間をつくる」か料理を押したときから外れる）
- これまでの献立は、今週より前で料理が1つでもある週。料理のない日は「作らない」と書く
- 「メモする」は8マスめの下線の字（`#cm-add`）。ちょいメモの一覧は左の段
