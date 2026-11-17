# 地図（どこに何があるか）

コードを直すときは、この地図 → 検索（`grep -n`）→ その範囲だけ読む（Read の offset・limit）→ Edit で変わる所だけ直す（claude/code-rules.md）。ファイルごとのくわしい中身は files.md、ツールごとは tools.md。行の目安が大きくずれたら、ここを直す。

## フォルダ
| 場所 | 役目 |
|---|---|
| `src/site.mjs` | サイト名・URL・カテゴリとテーマ・`SITE` |
| `src/tools.mjs` | ツールの一覧（トップ・関連ツール・sitemap のもと） |
| `src/layout.mjs`・`src/parts.mjs` | ページの外側（head・ヘッダー・フッター・構造化データ）と共通部品 |
| `src/zukai.mjs` | 図解の式 `stair`・帯の図 `band`・折れ線 `lineChart` |
| `src/pages/<slug>.mjs` | ページ（1ツール1ファイル。`index.mjs` はトップ、`info.mjs` は固定ページ、`*-uses.mjs` は使いみち別） |
| `src/lib/<slug>.mjs` | 計算（DOM なし。テストとブラウザで共通） |
| `src/client/<slug>.js` | ブラウザの入口（1ツール1ファイル）。`*.mjs` は共通部品（`ui.mjs` 入力、`notes.js` 付箋、`choimemo.mjs` ちょいメモ、`share-img.mjs` 画像で送る） |
| `src/data/*.mjs` | 出典つきの数字（確認日つき） |
| `src/yomimono/<slug>.mjs` | 読みもの1本1ファイル（`_hinagata.mjs` ひな形・`_shelf.mjs` 棚） |
| `src/styles/site.css` | デザイン（テーマは `[data-theme]`） |
| `public/` | そのままコピー（アイコン・`img/` 写真・`og/` 共有画像・`print/` 早見表のPDF） |
| `scripts/` | ビルド・点検・取得・見張り（下の「ビルド・テスト・公開」） |
| `tests/*.test.mjs` | `node --test`。`fixtures/` は固定データ |
| `.github/workflows/` | deploy・mihari・mihari-google・watch・check-links・henreihin-daily・henreihin-check・merge-ok |
| `docs/` | くわしい説明（この地図・files・tools・design・shikumi・furusato・point・kondate・sodateru・yomimono-neta） |

## 300行より大きいファイル（見出しと行の目安）
- `src/styles/site.css`（約1,650行）：共通の部品は1〜450行（ヘッダー119・計算カード145・付箋188〜240・結果の下のボタン255〜300・商品ごとの入力305）、ツールごとの絵は450行から（割り勘453・電気代489・日付541・BMI 602・希釈634・FX 706〜766・残業代785・ふるさと納税842〜914・ポイント949〜1010・清掃1012）。`/* 名前` で検索する
- `src/tools.mjs`（約880行）：`TOOLS` の配列が16〜878行。`slug:` で検索する
- `src/client/share-img.mjs`（約780行）：画像の部品 `imgPaper`・`imgBigNum` など〜130行、絵の形 `imgReceipt`128・`imgTag`186・`imgGrid`250・`imgCal`287・`imgEto`324・`imgBar`361 から下
- `scripts/mihari.mjs`（約750行）：日付21・確認日32（`passesChecked`）・外のページ76・灯油の値段 163・夜のメモ `MEMO` 188〜310・毎朝の点検 `checkTouyu` 667
- `src/pages/furusato.mjs`（約660行）・`fx.mjs`・`gyoji.mjs`・`furusato-tetsuzuki.mjs`・`henreihin.mjs`・`waribiki.mjs` ほか300行台のページ：上に定数（`FAQS`・`ROWS`・`ZUKAI`・`BAND`）、下に default 関数の HTML
- `src/client/recipe.js`（約450行。`update()` 103 が中心）・`genba.js`（約330行。`gbLoad`・`gbSave`・`gbDraw*` 20〜）
- `scripts/make-images.py`（約1,580行）：絵の部品（`paper`・`price_tag` など）が上、ツールごとの絵 `VISUALS` 1383
- `scripts/check-flow.py`（約400行）：`CASES` 23〜、`check()` 353
- `scripts/verify-dist.mjs`（約310行）：1行の長さ `ONE_LINE` 22・本文の字数 `OWN_MIN` 242・似た文 `SAME_GROUPS` 287

## データの場所
- 税・ふるさと納税：`src/data/furusato.mjs`。返礼品の設定：`henreihin.mjs`
- 楽天のポイント：`point.mjs`（マラソン）・`spu.mjs`・`amazon.mjs`
- FX のスワップ：`fx-swap.mjs`。電気代・灯油：`denki.mjs`・`touyu.mjs`。家族の行事：`gyoji.mjs`
- 清掃：`seisou-tanka.mjs`・`senzai.mjs`・`hyohakuzai.mjs`。塩分：`enbun.mjs`。献立：`kondate.mjs`

## ビルド・テスト・公開
- `npm run check`＝`npm test`（`node --test`）→ `npm run build`（`scripts/build.mjs` が `dist/` を作る）→ `npm run verify`（`scripts/verify-dist.mjs`）
- 画面の点検（Python・Playwright）：`scripts/check-fold.py`・`check-edges.py`・`check-flow.py`・`check-pc.py`
- 公開は `.github/workflows/deploy.yml`（PR → プレビュー、main → 本番・`scripts/indexnow.mjs`）。返礼品は `scripts/fetch-henreihin.mjs`（Actions だけ）。灯油の値段は `scripts/fetch-touyu.mjs`（xlsx の読み取りは `scripts/xlsx.mjs`）→ `src/touyu-now.mjs`

## 自動で作るファイル（読まない・手で直さない）
- `dist/`（ビルド）・`.henreihin/`（楽天から取ったもの・コミットしない）・`.touyu/`（灯油の値段・コミットしない）・`.watch/`・`watch-report.md`・`.indexnow-urls.txt`
- `public/og/*.png`・アイコン（`scripts/make-images.py` で作る）
- `public/print/*.pdf` と `src/data/prints.json`（`scripts/make-prints.py` で作る）
