# ファイルごとの中身

CLAUDE.md の「ファイル」の短い一覧のくわしい版。ファイル名で検索して、その行だけ読む。ファイルを足したり役わりを変えたりしたら、ここの行を直す。

| 場所 | 中身 |
|---|---|
| `src/site.mjs` | サイト名・URL・カテゴリ |
| `src/tools.mjs` | ツールの一覧（トップ・関連ツール・sitemap はここから作る。`published: false` は「これから増えるツール」に名前だけ） |
| `src/layout.mjs` | ページの外側（head・ヘッダー・フッター・構造化データ）と本文の部品 |
| `src/parts.mjs` | ツールページの共通部品（関連ツール・WebApplication の構造化データ） |
| `src/pages/*.mjs` | 1ファイル＝1ページ（`info.mjs` は固定ページ（このサイトについて・プライバシーポリシー・免責事項・404。`SITE.contact` があるときだけお問い合わせ /contact/）、`kishaku-uses.mjs` は希釈の使いみち別のページ、`waribiki.mjs` は割引計算と割引率の計算、`tanka.mjs` は実質単価の比較とまとめ買いの単価比較、`fx.mjs` はFXの3つ、`zangyo.mjs` は残業代の2つ、`warikan.mjs` は割り勘の計算と傾斜割り勘の計算、`nenrei.mjs` は年齢の計算と入学・卒業年の計算、`furusato.mjs` はふるさと納税の上限の2つ、`furusato-tetsuzuki.mjs` はふるさと納税の手続きの3つ（ワンストップ特例・締め切り・寄付メモ）、`furusato-seido.mjs` はふるさと納税の制度の変更点、`henreihin.mjs` はふるさと納税の返礼品の5ページ（入口と4カテゴリ）、`point.mjs` はお買い物マラソンのポイント計算、`spu.mjs` は SPU のポイント計算、`shikumi.mjs` は楽天のポイントのしくみ、`hikaku.mjs` は楽天とAmazonのポイント比較、`denki-uses.mjs` は家電別の電気代の5ページをまとめて、`gyoji.mjs` は家族の行事の5ページ）。default 関数が `{ path, html, sitemap, updated }`（またはその配列）を返す |
| `src/mix.mjs` | 希釈の計算カードの部品（希釈率の計算と、使いみち別の「めんつゆ・次亜塩素酸ナトリウム・液体肥料」で共通）。動きは `src/client/kishaku.js` 1つで、ページごとのちがい（マス・原液の呼び名・ボトルのラベル・キャップの目安）は `#calc` の `data-*` で渡す |
| `src/fields.mjs` | 名前を欄の中に書いた入力欄 `boxField`（FX・利益率・清掃・残業代で共通） |
| `src/denki.mjs` | 電気代の計算カードの部品（電気代の計算と家電別の電気代で共通。マス・家電の名前・はじめの案内は `#calc` の `data-*`）。動きは `src/client/denki.js` 1つ |
| `src/fx.mjs` | FX の計算カードの部品（証拠金維持率・ロスカット・スワップで共通。いちばん上の1段・通貨の量のマス・名前を欄の中に書いた入力欄）。ページは `src/pages/fx.mjs` に3つまとめて、動きは `src/client/fx-iji.js`・`fx-losscut.js`・`fx-swap.js` |
| `src/lib/*.mjs` | 計算のロジック（DOM を触らない。テストとブラウザの両方で使う） |
| `src/data/denki.mjs` | 電気代の単価のはじめの値（全国家庭電気製品公正取引協議会の目安単価）と、家電のマスの消費電力の目安、家電別のページの強さごとの消費電力（`DENKI_USES`。どれも出典URLつき）。ページの表と出典のリンクはここから作る |
| `src/data/seisou-tanka.mjs` | 清掃の見積もりの目安：国土交通省の建築保全業務労務単価（清掃員・10地区・年度）と、島根県の清掃業務委託料算定要領の経費の率。毎年2月ごろ出る次の年度の単価に直す（年度の終わりから90日でテストが止まる） |
| `src/lib/genba.mjs`・`src/pages/genba.mjs`・`src/client/genba.js` | 現場手帳 `/genba/`（#106）：場所ごとの時間・時間割・見積もりの目安・トイレの消毒液の計算と、場所の1行の HTML（ページとブラウザで共通）。現場は localStorage `sakutto-genba`。くわしくは docs/tools.md の「現場手帳」 |
| `src/data/touyu.mjs` | 灯油代の計算の暖房のマス（メーカーの燃料消費量 L/h の強・弱、出典の仕様のページ）と、灯油の値段のはじめの値（資源エネルギー庁の石油製品価格調査の18Lの店頭価格と調査の日） |
| `src/data/enbun.mjs` | 塩分濃度の計算の用途のマス（浅漬け・パスタ・砂抜き・梅干しの濃度と出典）と、塩のスプーンの重さ（食塩 小さじ1＝6g・大さじ1＝18g） |
| `src/data/furusato.mjs` | ふるさと納税の上限の計算に使う、寄付した年ごとの税の数字（給与所得控除・基礎控除・配偶者と扶養の控除・調整控除の人的控除の差・所得割がかからない基準）と出典・確認日（`FURUSATO_SOURCES`。手続きのページの出典は `FURUSATO_TETSUZUKI_SOURCES`、制度の変更点は `FURUSATO_SEIDO_SOURCES`）。1月1日に次の年を足す |
| `src/data/henreihin.mjs` | 返礼品のページの設定：`HENREIHIN_LIVE`（本番に出すか）、ビルドのときの `HENREIHIN_MODE`（off・fixture・api）、カテゴリと楽天で探す言葉・外す言葉・ジャンルID、一覧の数、寄付額のマス |
| `src/lib/henreihin.mjs` | 返礼品の名前から量を読む（`readAmount`：5kg×3袋・定期便・ロール・箱。読めないものは null で一覧に出さない）、1万円あたりの量、発送の時期の言葉、ならべ方、はじめの1件（`firstPick`） |
| `scripts/rakuten.mjs`・`fetch-henreihin.mjs`・`check-henreihin.mjs`・`henreihin-mode.mjs`・`cleanup-deployments.mjs` | 楽天の商品検索の呼び方、ビルドの前に取って `.henreihin/data.json` に置く、キーが入った日に取れるか確かめる、ビルドのモードを決める、古い公開を消す（上の「しくみ」の返礼品のページ） |
| `src/data/point.mjs` | お買い物マラソン・スーパーSALE の回ごとの期間と上限（楽天市場の公式のページで確かめたものだけ。公式URLと確認日つき。上限が公式で確かめられないあいだは null。付与日と有効期限は `grant`・`expires`）と、上限のマス・1店舗の最低金額・最大の店舗数。新しい回が公式に出たら足す |
| `src/data/spu.mjs` | SPU のサービスごとの倍率・1か月の上限・条件の短いまとめ（公式で確かめたものだけ。URLと確認日つき。上限が確かめられないものは null）と出典（`SPU_SOURCES`。見張りのページ）。確認日から90日でテストが止まる。計算は `src/lib/spu.mjs`。5と0のつく日の倍率と上限（`POINT_DAY`）もここ |
| `src/data/amazon.mjs` | Amazon Mastercard の還元率（プライム会員2%・会員でない人1.5%）と出典（About Amazon・三井住友カード）。見張りは SPU と同じ。確認日から90日でテストが止まる |
| `src/data/fx-swap.mjs` | スワップの目安に使う各国の政策金利（出典URL・その金利になった日）と参考のレート（欧州中央銀行の参照レートから出した円の通貨ペア）。毎月、予約タスクが確かめて、変わっていればPRを作る。ページの表と出典のリンクはここから作る |
| `src/client/*.js` | ブラウザ用の入口（1ツール1ファイル）。`*.mjs` は共通部品 |
| `src/client/choimemo.mjs`・`share-img.mjs` | ちょいメモ（10/28 #69。結果の下の「メモする」「画像で送る」の段と付箋。HTML は `parts.mjs` の `memoHtml`、トップは `home-memo.js`。30枚まで・ページに4枚・トップに6枚。保存できない端末では段ごと出さない）と、画像で送る（canvas でツールの結果の絵を描く。Canva の写真は使わない）。ツールのスクリプトは `choiMemo(ファイル名)` が返す関数に `{ q, a, img }` か null を渡す。「画像で送る」はよく使う計算の8つ＋希釈率（同じスクリプトのまとめ買い・使いみち別・傾斜割り勘も）と、ふるさと納税のワンストップ特例・締め切り、楽天のポイントの5つ（10/29 #80）、割引率・率ごとの割引・レシピ・洗剤・塩分濃度（10/29 #81。カードや書類の絵は `imgCard`、中の絵は `figStamps` などを `fig.draw` で渡し、使う絵だけがページに入る。年収・給料・体重・口座のお金が絵に出るものには付けない）、電気代と家電別の5つ・灯油代・偏差値・第何曜日・和暦・学歴（10/29 #82。メーター・ポリタンク・テストの山は `figMeter`・`figCans`・`figMount`。BMI は体重が出るので「メモする」だけ）、家族の行事の5つ・有給休暇・利益率・ローン・掛け率・清掃の2つ・スワップ（10/29 #83。現場手帳も作業計画書の紙で10/31 #106。FX の画像は紙に黒いインクと金のペン＝`imgColors`。残業代の2つ・源泉徴収・証拠金維持率・ロスカット・ロットは給料や口座のお金が出るので「メモする」だけ）。ほかの公開しているツールは「メモする」だけ（10/29 #71。`memoHtml(tool, false)` と `memoOnly()`。返礼品と寄付メモには入れない） |
| `src/styles/site.css` | デザイン（色はテーマごとに `[data-theme]` で管理） |
| `public/` | そのままコピー（`_headers`・アイコン） |
| `tests/*.test.mjs` | `node --test` のテスト |
| `scripts/verify-dist.mjs` | ビルド後の全ページ点検（title・description・canonical・h1・タグの閉じ忘れ・id の重複・リンク切れ・共有画像・外部読み込みなし・入力欄の inputmode とラベル・ズーム防止・スクリプトの文法） |
| `scripts/make-images.py` | SNSの共有画像（OGP）とホーム画面用アイコンを作る（Pillow と日本語フォントが要るので Claude の環境で動かしてコミット）。トップ・固定ページの `og/default.jpg` は、サイトの決めの1枚（Canva の切り紙の絵 `scripts/art/ogp-kirigami.jpg`。10/26 しょーくんが3案からえらんだ）に字をのせる。ツールのページは答えの絵のまま |
| `src/prints.mjs`・`scripts/make-prints.py` | 印刷用の早見表（A4・1枚のPDF。年齢・和暦／学歴／消毒液／割引／薄め方）。右下のすみにサイト名とそのページのURLのQRコード（make-prints.py が segno で作る線の絵。QRが表や字とかさなると止まる）。見た目は「手帳のおまけのページ」（10/26 しょーくんが3案からえらんだ）。表はサイトの計算とデータから作る。数字や文を変えたら `python3 scripts/make-prints.py` で作り直してコミット（`tests/prints.test.mjs` が `src/data/prints.json` の指紋で作り直し忘れを見張る）。年の入るPDFは今年と来年を置き、ページは今年のPDFにリンク（1月1日のビルドで切りかわる）。毎年11月1日の予約タスクが次の年を足す |
