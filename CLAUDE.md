# サクッと計算 — Claude 向けの決まり

よく使う計算ツールを1つにまとめた静的サイト（https://sakutto-keisan.com）。運営はしょーくん。
しょーくんはコードを書かず、ターミナルも使わず、スマホで確認する。開発・運用は Claude が担当する。

## しくみ
- **依存パッケージなし**の Node だけのビルド（`scripts/build.mjs`）。npm install は不要。クラウド環境では npm レジストリに届かないことがあるので、パッケージを足さない
- コマンド：`npm run check`（テスト → ビルド → 全ページ点検）。PR前に必ず緑にする
- 軽さ：CSS は各ページの `<style>` に埋め込み（読み込みはHTMLとスクリプトの2回だけ）、スクリプトとHTMLはビルドでコメント・字下げを取る。使わなくなったCSS・関数はその場で消す
- 公開：GitHub Actions（`.github/workflows/deploy.yml`）が Cloudflare Pages へ **Direct Upload**。Cloudflare 側のビルドは使わない（あそびトーク・FANZA・ヤセ活と共有の「月500回」のビルド枠を使わないため）
  - PR → プレビュー（PRに自動でURLのコメント）／ main → 本番
  - Secrets：`CLOUDFLARE_API_TOKEN`（Pages の編集だけ）・`CLOUDFLARE_ACCOUNT_ID`
- 流れ：ブランチ `claude/...` → PR → CI が緑・プレビューで確認 → **しょーくんに知らせてから Merge**

## ファイル
| 場所 | 中身 |
|---|---|
| `src/site.mjs` | サイト名・URL・カテゴリ |
| `src/tools.mjs` | ツールの一覧（トップ・関連ツール・sitemap はここから作る。`published: false` は「これから増えるツール」に名前だけ） |
| `src/layout.mjs` | ページの外側（head・ヘッダー・フッター・構造化データ）と本文の部品 |
| `src/parts.mjs` | ツールページの共通部品（関連ツール・WebApplication の構造化データ） |
| `src/pages/*.mjs` | 1ファイル＝1ページ（`info.mjs` は固定ページをまとめて）。default 関数が `{ path, html, sitemap, updated }` を返す |
| `src/lib/*.mjs` | 計算のロジック（DOM を触らない。テストとブラウザの両方で使う） |
| `src/client/*.js` | ブラウザ用の入口（1ツール1ファイル）。`*.mjs` は共通部品 |
| `src/styles/site.css` | デザイン（色はテーマごとに `[data-theme]` で管理） |
| `public/` | そのままコピー（`_headers`・アイコン） |
| `tests/*.test.mjs` | `node --test` のテスト |
| `scripts/verify-dist.mjs` | ビルド後の全ページ点検（title・description・canonical・h1・タグの閉じ忘れ・id の重複・リンク切れ・共有画像・外部読み込みなし・入力欄の inputmode とラベル・ズーム防止・スクリプトの文法） |
| `scripts/make-images.py` | SNSの共有画像（OGP）とホーム画面用アイコンを作る（Pillow と日本語フォントが要るので Claude の環境で動かしてコミット） |

### ブラウザ用スクリプトの決まり（小さなバンドラーの都合）
- import は1行で `import { a, b } from './x.mjs';` の形だけ
- まとめると1つのスコープになるので、`src/lib`・`src/client` のファイル間で**同じ名前の関数・変数を作らない**（重なると点検の文法チェックで落ちる）

## ツールを1つ足す手順
1. `src/lib/<slug>.mjs` に計算（DOM なし）と `tests/<slug>.test.mjs`（ページに載せる計算例は必ずテストに入れる）
2. `src/pages/<slug>.mjs`（割引計算 `waribiki.mjs` をお手本に）：h1・リード・計算カード・使い方・計算式・計算例・よくある質問・関連ツール
3. `src/client/<slug>.js`（入力したそばから結果を出す。クリア。共通部品は `src/client/ui.mjs`）
4. `src/tools.mjs` を `published: true`・`updated` を今日に。`related` を見直す（ほかのツールの `related` にも足す）
5. `python3 scripts/make-images.py` でSNSの共有画像（`public/og/<slug>.png`）を作ってコミット。ツールらしい絵は `VISUALS` に足す（割引＝値札）
6. `npm run check` → PR → プレビューを Playwright のスマホ幅（390px）で確認

## デザインの決まり（しょーくんの方針・10/16）
- **見た目はターゲットに合わせてカテゴリごとのテーマ**、**部品と操作はどのページも共通**（簡単・わかりやすい・統一感）
  - 生活（主婦・学生）`seikatsu`：明るく温かいクリーム色・丸み多め
  - お仕事（会社員）`shigoto`：明るく落ち着いた青
  - FX（トレーダー）`fx`：ダーク
  - トップ・固定ページ `home`。端末のダークモードには連動しない。テーマは `src/site.mjs` の CATEGORIES → `<body data-theme>`
- 計算カードはシンプルに、**押しやすく大きく**：よく使う値は大きなタイル（割引は「30%」と「3割引き」を両方書く・半額・最後のマスは自分で入力）。おまけの機能（さらに割引・2つくらべる・何％オフ？など）は結果の下の大きな3つのボタン（もう一度押すと元にもどる）。小さな切り替えスイッチや文字だけのリンクは使わない。端数の選択などは必要なときだけ出す
- くらべるツールは、商品ごとに `.item`（A・B・C の丸）＋`.pair`（値段と量を横並び）。単位は入力欄の右の `.unit-select`（iPhone では大きな選択画面）。結果は小さな値札（`.cmp`）＋棒グラフ（`.bars`）
- 入力欄・タイル・ボタンは**同じ高さ・同じ数字の大きさ**（`site.css` の `--ctl-h` 64px・`--num` 24px・`--cap`・`--label`）。長押しで文字が選ばれない（`user-select: none`）
- 単位を誤解させない：見出しは単位のない言葉（「値引きをえらぶ」）、自分で入れる欄には単位を書く（「その他（％）」）。結果に「30％オフ＝3割引き」のように両方を出す
- **結果は数字＋ビジュアル**でひと目でわかるように（割引＝値札。今後：実質単価＝2つの商品をくらべて「こっちがおトク」、希釈＝ボトルに原液と水の量、レシピ＝人数分のお皿、FX維持率＝メーター、追証＝足りない分のバー、スワップ＝日ごとに増えるグラフ、有給・社保＝明細書ふう）。ビジュアルは HTML/CSS/インラインSVG で作り、外部の画像を読まない

## ページの決まり
- URL はローマ字の短い名前 `/<slug>/`。一度公開したら変えない
- title は「<検索される言葉>｜<ひとこと>｜サクッと計算」。description は30〜160文字
- 入力欄：`type="text" inputmode="decimal"`、ラベル必須。**数字だけ入る**ようにする（`ui.mjs` の `numericOnly`。全角の数字は半角に、ほかの文字は入れたそばに消える）
- **ズームさせない**（しょーくんの方針・10/16）：入力欄・選択欄の文字は16px以上（iPhoneの自動ズーム防止）、`html` に `touch-action: manipulation`（ダブルタップのズーム防止）。指2本のズームは止めない（viewport に `user-scalable`・`maximum-scale` を書かない）。`verify-dist.mjs` が点検する
- 計算はブラウザの中だけ。**入力した数字を送らない・保存しない**。外部のスクリプト・画像・フォントを読み込まない（広告を入れるときは、この決まりと `verify-dist.mjs`・プライバシーポリシーを合わせて見直す）
- 文章はです・ます調のふつうの日本語。確かめられない数字・言い切りを書かない
- 毎年変わる数字（社会保険料・税金）は `src/data/rates/<年度>.json` に出典URLと適用日を書いてまとめる（作るとき）。FXの計算は「目安。会社ごとにルールが違う」と明記し、日本の個人のレバレッジ上限25倍を前提にする
