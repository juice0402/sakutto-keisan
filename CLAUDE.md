# サクッと計算 — Claude 向けの決まり

よく使う計算ツールを1つにまとめた静的サイト（https://sakutto-keisan.com）。運営はしょーくん。
しょーくんはコードを書かず、ターミナルも使わず、スマホで確認する。開発・運用は Claude が担当する。

## しくみ
- **依存パッケージなし**の Node だけのビルド（`scripts/build.mjs`）。npm install は不要。クラウド環境では npm レジストリに届かないことがあるので、パッケージを足さない
- コマンド：`npm run check`（テスト → ビルド → 全ページ点検）。PR前に必ず緑にする
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
| `src/styles/site.css` | デザイン（色は `:root` の名前で管理。ダークモード対応） |
| `public/` | そのままコピー（`_headers`・アイコン） |
| `tests/*.test.mjs` | `node --test` のテスト |
| `scripts/verify-dist.mjs` | ビルド後の全ページ点検（title・description・canonical・h1・リンク切れ・外部読み込みなし・入力欄の inputmode とラベル・スクリプトの文法） |

### ブラウザ用スクリプトの決まり（小さなバンドラーの都合）
- import は1行で `import { a, b } from './x.mjs';` の形だけ
- まとめると1つのスコープになるので、`src/lib`・`src/client` のファイル間で**同じ名前の関数・変数を作らない**（重なると点検の文法チェックで落ちる）

## ツールを1つ足す手順
1. `src/lib/<slug>.mjs` に計算（DOM なし）と `tests/<slug>.test.mjs`（ページに載せる計算例は必ずテストに入れる）
2. `src/pages/<slug>.mjs`（割引計算 `waribiki.mjs` をお手本に）：h1・リード・計算カード・使い方・計算式・計算例・よくある質問・関連ツール
3. `src/client/<slug>.js`（入力したそばから結果を出す。結果のコピー・クリア）
4. `src/tools.mjs` を `published: true`・`updated` を今日に。`related` を見直す（ほかのツールの `related` にも足す）
5. `npm run check` → PR → プレビューを Playwright のスマホ幅（390px）で確認

## ページの決まり
- URL はローマ字の短い名前 `/<slug>/`。一度公開したら変えない
- title は「<検索される言葉>｜<ひとこと>｜サクッと計算」。description は30〜160文字
- 入力欄：`type="text" inputmode="decimal"`、ラベル必須、文字16px以上。全角・カンマ・単位つきでも読める（`parseNum`）
- 計算はブラウザの中だけ。**入力した数字を送らない・保存しない**。外部のスクリプト・画像・フォントを読み込まない（広告を入れるときは、この決まりと `verify-dist.mjs`・プライバシーポリシーを合わせて見直す）
- 文章はです・ます調のふつうの日本語。確かめられない数字・言い切りを書かない
- 毎年変わる数字（社会保険料・税金）は `src/data/rates/<年度>.json` に出典URLと適用日を書いてまとめる（作るとき）。FXの計算は「目安。会社ごとにルールが違う」と明記し、日本の個人のレバレッジ上限25倍を前提にする
