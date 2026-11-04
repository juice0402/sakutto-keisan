# 読みもののネタの山と書き方

予約タスク「読みもの書き（4サイト）」が、木曜と日曜にここから1本書いて公開する（しくみはプロジェクトの `claude/sodatsu-spec.md`。2026-11-04 しょーくんと決定）。このファイルと CLAUDE.md だけで1本書けるようにしてある。ネタの山は 11/4 にしょーくんが OK した。

## 書き方

### 置く場所と作り方
- 読みものの棚（docs/sodateru.md の「読みものの棚をつくる」）ができてから書く。main に `src/pages/yomimono.mjs` がなければ、書かずに飛ばす（報告ファイルに「- 読みもの：止めた（読みものの棚がまだない）」）
- 1本＝1ファイル `src/yomimono/<slug>.mjs`。ひな形 `src/yomimono/_hinagata.mjs` をコピーして書く（`_` で始まるファイルはビルドが読まない）。slug はローマ字の短い名前（例 `touyu-nannichi`）で、URL は `/yomimono/<slug>/`。一度公開したら変えない
- ファイルの中身（棚の形。棚ができたときに変わっていたら、棚のほうに合わせる）
  - `slug`・`title`（h1 と title の頭。問いか短い言い切りの文）・`lead`（1行。全角22字まで）
  - `category`：src/site.mjs の CATEGORIES の id（seikatsu・gyoji・shigoto・furusato・point・fx）。手帳の見た目と、見張る言葉が決まる
  - `tools`：つなぐ計算の slug（src/tools.mjs の published）。1つめが「自分の数字で確かめる」の行き先で、共有画像もその計算のものになる
  - `published`・`updated`：日付（日本時間の YYYY-MM-DD）
  - `description`：全角80〜120字・数字入り・ほかのページと同じにしない
  - `body`：h1 とリードのあとに入る HTML。節は `section(id, 見出し, 中身)`（src/layout.mjs）で作り、図は `src/zukai.mjs` の部品で描く
  - `faqs`：0〜3問（検索に出ていそうな問いだけ。答えは1〜2文）
  - `sources`：`{ name, url, checked, what }` の並び。確かめた日は `checked`
- 本文に出す数字は src/lib の計算か src/data のデータから作る（手で打たない）。本文に出す数字は `export const NUMS = { … }` にまとめ、`tests/yomimono-<slug>.test.mjs` で、自分で確かめた値と比べる
- 一覧（/yomimono/）・トップの「読みもの」・計算のページの「この計算の読みもの」・RSS・サイトマップには、ファイルを足せばビルドで自動で入る。src/tools.mjs はさわらない（つなぐ計算の `updated` も変えない）
- コマンド：`npm run check`（テスト → ビルド → 全ページ点検）。見た目は `python3 -m http.server 8766 --directory dist`（Bash の run_in_background で起動）で開き、Playwright でスマホ（390px）とパソコン（1280px）を撮って確かめる
- ブランチは `claude/yomi-<slug>`、PR の題は「読みもの：<題>」

### 中身
- だれのどんな問いに答えるかは、ネタの行のとおり。答え（数字入り）を最初の1〜2文で書き、そのすぐ下に図を置く（1行で済む答えは上に書いてよい。その下に、AIの答えでは済まないものを置く）
- 長さ：自分の文（表・見出し・図をのぞいた .prose の文字）1,200字以上（verify-dist が数える）。目安は 1,500〜2,500字。水増しはしない（同じことを言いかえない・前置きやまとめの段落を書かない）
- 節（h2）の例：なぜそうなるか（式と、その式になる理由）／計算の例（2〜3。数字と答えつき）／まちがえやすいところ／早見表（データか src/lib の計算から作る）／運営者の現場の話（ネタの行にあるときだけ）。「使い方」の節は作らない
- 出典と確認日：数字・決まりは、メーカー・役所・公式のページで確かめたものだけ書く。出典の節に、名前・URL・確かめた日。確かめられない数字は書かない。公式の文を写さず、自分の言葉で短く
- 運営者の話：ネタの行と、下の「運営者から聞いた話」にある話だけを使う。足さない・ふくらませない（作り話は書かない）。「運営者の勤め先では」のように、だれの話かわかる形で書く。運営者の仕事は「ビルや病院の清掃と、職場の安全衛生の仕事」（このサイトについての文と同じ）。FX は「運営者もFXの取引をしています」より先は書かない（取引の経験をもとにした話は書かない）
- 最後につなぐもの：棚の「自分の数字で確かめる」の節が、tools の1つめの計算へつなぐ。本文の中でも、その計算の名前を出してリンクする。印刷の早見表がある計算（割引・希釈・年齢・学歴）は、その PDF にも1行でつなぐ。清掃・消毒の読みものは、合えば安全衛生の便利帳へ1文（例：「清掃作業監督者や病院清掃受託責任者の再講習の時期は、安全衛生の便利帳で調べられます。」→ https://anzen-benricho.com/shikaku/koushin/ ）
- 文章：CLAUDE.md の「文章の決まり」のとおり（です・ます／使わない言葉／太字なし／かっこは1文に1つ／キャッチコピーなし／3つ並べなし）。題は「〜を徹底解説」「完全ガイド」「〜とは？わかりやすく」のような形にしない
- 楽天のポイントの読みもの（category が point）は、/point/ と同じ言葉の決まり（お得・最安・必ず得・倍確定・予想・次回は など。verify-dist が見張る）と docs/point.md の決まり（公式で確かめたものだけ・楽天とは関係のない個人のサイトと書く）。ふるさと納税（furusato）は /furusato/ と同じ言葉の決まりと docs/furusato.md の決まり
- 神社・お寺・地域・会社でちがうものは、ちがうと書いて言い切らない。医療・法律の判断を言い切らない（「◯◯に確かめてください」と書く）

### 絵
- 図解だけ（`src/zukai.mjs` の stair・band・zBox・zCal など）。図の中の数字と字は HTML の文字、SVG は role="img" と aria-label、figcaption に1行の文
- Canva は使わない（11/4 しょーくん。夜や予約タスクが待ち時間で止まらないように）。写真・外の画像・絵文字も使わない

### 公開
- 書いていない軽いモデルが点検する（文章の決まり・数字が出典やテストと合うか・作り話がないか・使わない言葉）。直してから PR → CI（check と build-deploy）が緑 → squash マージ
- main への push で deploy.yml が動いて本番に出る（workflow_dispatch は要らない）。deploy が成功したかを確かめる
- 同じ PR の中で、ネタの行を「- [x] 題（PR #◯・日付）」にする
- 報告ファイル（プロジェクトの claude/reports/sakutto.md）に「- 読みもの『題』：公開（PR #◯）」

### 開けるページ
- ネタの行の URL と、WebSearch の結果の URL だけを開く（自分で作った URL は開かない）
- 行の URL がそのまま開けない（許可の一覧にないと言われた）ときは、WebSearch でそのページを出して、結果のリンクから開く（11/3 の夜 #116・#118 はこの形で開けた）
- それでも開けないネタは飛ばして、その行を山のいちばん下へ動かし、次のネタを書く

### ネタの選び方（山の [ ] が5本を切ったら、同じ PR で10本足す）
- 選んでよいもの：このサイトの計算（src/tools.mjs の published）につながり、図や表や計算の例で答えるとわかりやすい問い。季節の問い（冬の暖房・夏のめんつゆ・年度がわりの有給や入学・年末のふるさと納税）。検索で使われていそうな問いの形（「◯◯は何日もつ」「◯◯は何対何」）
- 選ばないもの
  - 1行の答えで済むもの（検索画面のAIの答えで終わる）
  - しくみ・メリット デメリット・やり方の一般論（ふるさと納税は 10/23 の討論で「書かない」と決めた）
  - おすすめ・ランキング・還元率・コスパ・会社や商品の順位
  - 楽天の次の回・予想・スケジュール・くじ・裏ワザ。ふるさと納税の返礼品のすすめ・節税のうたい文句
  - 金額・年収・自治体ごとに同じ形で量産するもの
  - 運営者の経験が要るのに、下の「運営者から聞いた話」にないもの
  - 医療・法律の判断を言い切るもの
- 重ねないもの：もうある読みもの（src/yomimono/）と山の題、計算のページのよくある質問でもう答えているもの。答えが同じになる題は1つにまとめる
- 足すときは、下の行の形で書く。資料の URL は、WebSearch で出して開けたものだけ（作った URL は書かない）
- 足したネタは、サクッと計算のチャットでしょーくんが見る（合わなければ直す）

### 運営者から聞いた話（2026-10-31 しょーくんから。このまま使う・足さない）
1. トイレは男女で実際にかかる時間がちがう。雨の日は決まった回数より多く掃除しなければならない。衛生消耗品の補充は、よく使われるフロアほど回数や呼び出しが多い（どちらが長いかは聞いていないので書かない）
2. 勤め先では、薄めるときにゴーグルをつけるのが決まり。まぎらわしいボトルに入れない。薄めてから24時間以内に使い切る（運営者は「濃度が規定値を下回ると聞いた」。理由として書くのは、広島市のページの「薄めた液は時間がたつと効果がなくなるので作り置きしない」の範囲）
3. 人数や時間割は、スタッフどうしの相性や、一人ひとりの仕事の速さに応じて調整することが多い（性別・年齢は誤解されやすいので書かない。しょーくん 10/31）

## ネタの山
行の形：題 — だれの何に答えるか／使う資料（URL・サイトのデータ）／つなぐ計算。上から順に書く。

- [ ] 灯油18リットルは何日もつ？ストーブの大きさと1日の時間で — 「灯油18リットル 何日もつ」で調べる人に、ファンヒーターの大きさ（木造・コンクリートの畳数）と1時間に使う灯油の量、1日に使う時間から日数を出して答える。18Lを1日ずつに分ける帯の図。大きさ×1日の時間の早見表／src/data/touyu.mjs（灯油の値段は、育てる山の「灯油の値段を毎週自動で」のあとはそのデータ）・https://www.dainichi-net.co.jp/products/fanheater/lineup/l2025/ ・https://www.dainichi-net.co.jp/products/fanheater/lineup/s2025/ ・https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html ／/touyu-dai/
- [ ] 電気毛布・こたつ・ホットカーペット、1か月の電気代をくらべる — 体のまわりを温める3つを、同じ使い方（1日の時間×30日）で並べる。数字は家電のページと同じメーカーの消費電力と目安単価（31円/kWh）だけ。セラミックヒーター・オイルヒーターとの差も表に／src/data/denki.mjs・https://panasonic.jp/danbo/products/DB-U12T/spec.html ・https://panasonic.jp/danbo/products/DC-3NK/spec.html ・https://book.yamazen.co.jp/product/detail/I00008272 ／/denki-moufu/・/kotatsu/・/hot-carpet/
- [ ] トイレ掃除の時間は男女でちがう：現場で数えていること — 清掃の作業時間を見積もる人（清掃・ビルメンの仕事）に。運営者から聞いた話1と、トイレの日常清掃の歩掛り（0.254人＝1人1時間約49㎡）の計算で、雨の日に回数がふえたときの時間の足し方を例にする／src/lib/seisou.mjs・https://www.city.sapporo.jp/kanzai/keiyaku/ippan-syuyaku/r2-zenki/documents/nyusatusetumei_bekki4-seiso.pdf ／/seisou-jikan/・/genba/
- [ ] 消毒液を薄めるとき、勤め先で決まっていること — 次亜塩素酸ナトリウムを薄める人（清掃・介護・家庭）に。運営者から聞いた話2と、0.02％・0.1％の薄め方の数字（/hyohakuzai/ のデータ）。24時間の理由は広島市のページの範囲で書く／src/data/hyohakuzai.mjs・https://www.city.hiroshima.lg.jp/site/infectious-disease-joho/332.html （更新 2026-01-30）・https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/syoudoku_00001.html ／/hyohakuzai/
- [ ] 清掃の人数と時間割は、一人ひとりの速さで組む — 現場の段取りを組む人に。運営者から聞いた話3と、現場手帳の時間割の考え方（1人1時間の面積・人数の切り上げ・1分未満の切り上げ）。数字の例は清掃の作業時間の計算で出す／src/lib/seisou.mjs・src/pages/genba.mjs ／/genba/・/seisou-jikan/
- [ ] 「5倍希釈」は1対4？1対5？取りちがえやすい薄め方 — 「5倍希釈とは 何対何」で調べる人に。全体を原液の5倍にする（原液1：水4）と、水を5倍にする（1：5）の取りちがえを帯の図で。めんつゆ・漂白剤・液体肥料の表示の読み方は、各メーカーのページの範囲で／src/lib/kishaku.mjs・https://www.kikkoman.co.jp/homecook/tsushin/0085/ ・https://www.yamaki.co.jp/faq/02.html ・https://www.hyponex.co.jp/products/products-637/ ・https://www.kao.com/jp/qa/detail/18916/ ／/kishaku/
- [ ] 2割引のあとさらに3割引は、5割引ではない — 割引が重なった値札で迷う人に。0.8×0.7＝0.56 で44％引きになることを帯の図で。10〜50％×10〜50％の重ね割引の早見表と、「◯％オフ」と「◯割引」の読みかえ／src/lib の割引の計算（外の出典なし）／/waribiki/・/waribiki-ritsu/
- [ ] 「7掛け」「6掛け」：定価と仕入れ値の関係 — 小売やハンドメイドの販売で掛け率を使う人に。定価×掛け率＝仕入れ値、残りが粗利の割合になることを図で。掛け率ごとの早見表／src/pages/kakeritsu.mjs・https://biz.moneyforward.com/accounting/basic/78527/ ／/kakeritsu/・/rieki-ritsu/
- [ ] 利益率・原価率・値入率、どれで考える？ — 売値に対する利益と、原価への上乗せを取りちがえる人に。30％の利益がほしいとき原価に何％乗せるか（÷0.7）を帯の図で／src/lib の利益率の計算・言葉の意味は WebSearch で公的機関か業界団体のページを1つ確かめる／/rieki-ritsu/・/kakeritsu/
- [ ] 大容量はほんとうに安い？1gあたりでくらべる — 内容量のちがう品をくらべる人に。1gあたり・1枚あたり・1回あたりの出し方と、使い切れない分を入れたときのくらべ方を例で／src/lib の単価の計算（外の出典なし）／/tanka/・/matomegai/
- [ ] みそ汁・浅漬け・塩水、塩分◯％は塩何グラム — 料理で塩分の％から塩の量を出す人に。％を「塩÷（塩＋水）」で出すか「塩÷水」で出すかのちがいを帯の図で。よく使う濃さの早見表／src/data/enbun.mjs・https://www.eiyo.ac.jp/yokushiru/2133/ ・https://www.hakatanoshio.co.jp/salt/cooking/ ・https://www.kikkoman.co.jp/homecook/basic/seafood/shellfish.html ／/enbun-noudo/
- [ ] 洗濯洗剤の量は、水の量で決まる？洗濯物の重さ？ — 洗剤の表示（水の量◯Lに◯g・◯ml）と、洗濯機の表示（洗濯物の重さと水の量）のつなぎ方を例で／src/data/senzai.mjs・https://www.kao.com/jp/qa/detail/28064/ ・https://www.lion.co.jp/ja/products/291 ・https://ariel.jp/ja-jp/shop/category/mirai/ariel-mirai-blue ／/sentaku-senzai/
- [ ] 「◯日後」は今日を数える？期間の数え方 — 「何日後」「何日前」を数える人に。今日を1日めにする数え方と、次の日から数える数え方（法律の期間は次の日から）のちがいをカレンダーの図で／src/lib の日数の計算・WebSearch で e-Gov 法令検索の「民法」第140条・第141条／/nissu/
- [ ] 早生まれは入学・卒業の年が1年ずれる — 「学校卒業」「卒業年次」で調べる人に。4月1日生まれが早生まれに入るわけ（年齢は誕生日の前の日に1つ上がる）と、学年のはじまり（4月1日）を図で／src/pages/nenrei.mjs の出典（https://eco.mtk.nao.ac.jp/koyomi/wiki/CDD7C1C72F1C7AFA4C8A4CFA1A92FC7AFCEF0.html ・https://www.japaneselawtranslation.go.jp/ja/laws/view/4744/tb ）／/gakureki/
- [ ] 昭和64年と平成元年：和暦が変わった年 — 「今は平成何年」のように和暦で迷う人に。昭和64年は1月7日まで、平成31年は4月30日まで。1年に2つの元号がある年の数え方を図で／src/pages/wareki.mjs の出典（https://eco.mtk.nao.ac.jp/koyomi/wiki/CEF2BBCB2FB8B5B9E6.html ）／/wareki/
- [ ] 数え年と満年齢：七五三・厄年・長寿祝いの年 — 行事の年を調べる家族に。生まれた年を1歳とする数え年と、満年齢のちがいの図。行事ごとにどちらで数えることが多いかは出典の範囲で、神社・お寺・地域でちがうと書く／src/data/gyoji.mjs・https://crd.ndl.go.jp/reference/entry/index.php?id=1000227161&page=ref_view ・https://ikutajinja.or.jp/info/yakuyoke ・https://jodo.or.jp/faq/ ／/shichigosan/・/yakudoshi/・/choju/
- [ ] 残業代の割増：時間外と深夜が重なるとき — 夜の残業の割増を確かめたい人に。時間外25％と深夜25％が重なると50％、月60時間をこえた時間外は50％、休日は35％。時給を割増ごとに分ける帯の図／https://www.check-roudou.mhlw.go.jp/qa/roudousya/chingin/q3.html ・https://www.mhlw.go.jp/topics/2008/12/dl/tp1216-1l-02.pdf ／/zangyo-dai/・/zangyo-gekkyu/
- [ ] 有給休暇は何日？パート・アルバイトの日数 — 週の日数が少ない人に、比例付与の日数を週の日数×勤めた年数の表で。6か月で何日からはじまるかを図で／src/lib の有給の計算・WebSearch で厚生労働省の年次有給休暇のページ（比例付与の表）／/yukyu-fuyo/
- [ ] 証拠金維持率とロスカット：何円動いたら止まるか — FX でロスカットの位置を知りたい人に。維持率の式と、ドル円1万通貨で何円動くと維持率が何％になるかを図で。数字は「目安」、ロスカットの水準は会社ごとにちがうので会社のページで、と書く（会社をくらべない・もうかる話を書かない）／src/lib の FX の計算・https://www.fsa.go.jp/news/21/syouken/20090731-6.html ／/fx-iji-ritsu/・/fx-losscut/
- [ ] 楽天とAmazonのポイント：同じ買い物でくらべる — 「amazon 楽天 ポイント」で調べる人に。月3万円・5万円の買い物で、ポイントがどこで分かれるか（税抜か税込か・上限・期間限定）を図で。キャンペーンは入れない（/point/amazon/ と同じ決まり）。/point/amazon/ の計算のくり返しにしない／src/data/amazon.mjs・https://www.aboutamazon.jp/news/guide/how-to-earn-and-use-amazon-points ・https://www.smbc-card.com/nyukai/affiliate/amazon/index.jsp ・src/data/spu.mjs（https://event.rakuten.co.jp/campaign/point-up/everyday/point/ ）／/point/amazon/・/point/shikumi/
