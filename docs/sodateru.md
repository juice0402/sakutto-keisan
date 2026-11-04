# 育てる山（夜の作業が上から1つずつ取る）
しょーくんが OK したものだけ。順番は上から。

夜のまとめ作業は、サクッと計算に進められる night の issue がなく、開いている夜の PR が2つより少ない夜に、いちばん上の「### [ ] 」を1つ issue（題「【夜・山】題」、ラベル night と sodateru）にして、その夜に進める。PR の中で見出しを「### [x] 題（#issue番号）」に変える。しくみはプロジェクトの `claude/sodatsu-spec.md`。中身は 2026-11-04 にしょーくんが OK した（「読みものの棚」と「灯油の値段」は、1晩でおわる大きさに2つずつに分けた）。

毎日の作り直しについて：本番を毎日作り直しているのは henreihin-daily.yml（毎日 6:07。HENREIHIN_LIVE が true のときだけ deploy.yml を動かす。11/4 は true）。灯油の値段と「◯月の計算」は、この毎日の作り直しで新しくなる。HENREIHIN_LIVE を false にするときは、毎日の作り直しを別に足す（docs/shikumi.md に1行書いておく）。

## 山

### [ ] 読みものの棚をつくる（/yomimono/）
- やること：読みものを置く場所を作る（読みものの1本めは、棚がマージされたあと、予約タスク「読みもの書き」が docs/yomimono-neta.md のいちばん上から書く）
  - ひな形 `src/yomimono/_hinagata.mjs`（`_` で始まるファイルはビルドが読まない）。ファイルの中身は docs/yomimono-neta.md の「置く場所と作り方」の欄（slug・title・lead・category・tools・published・updated・description・body・faqs・sources と `NUMS`）
  - `src/pages/yomimono.mjs`：`src/yomimono/` の `_` で始まらないファイルを読み、一覧 `/yomimono/` と各ページ `/yomimono/<slug>/` を返す（published の新しい順）。0本のときは何も出さない（一覧・トップの節・RSS・サイトマップも出さない）
  - 各ページ：パンくず（ホーム › 読みもの › 題）・h1・リード1行・body・「自分の数字で確かめる」の節（tools の計算へのリンク。toolListHtml の行の形）・出典の節（src-list の形：名前のリンク・何を・確かめた日）・よくある質問（あるときだけ）・同じカテゴリのほかの読みもの3本と「読みもの一覧へ」のリンク。構造化データは Article（headline・datePublished・dateModified・author と publisher はサイト名）・BreadcrumbList・FAQPage（あるときだけ）。共有画像は tools の1つめの共有画像
  - 見た目：category の手帳（themeOf と同じ）。部品は今の本文の部品（.prose・図解・表・src-list）だけで作り、新しい見た目は足さない。パソコンは今の見開き（#calc のないページ＝左に目次）のまま
  - 一覧 `/yomimono/`：新しい順に、題と1行（toolListHtml と同じ行の形）。カテゴリの見出しで分けるのは10本をこえてから
  - 入口：計算のページは、src/parts.mjs の relatedHtml の前に「この計算の読みもの」の節（その計算を tools に入れている読みもの、新しい順に3本まで。ないときは出さない）。トップは「最近更新した計算」の上に「読みもの」の節（新しい3本と一覧へのリンク）
  - RSS：`/yomimono/feed.xml`（RSS 2.0。新しい20本の題・URL・1行・公開日）。読みもののページとトップの head に `<link rel="alternate" type="application/rss+xml">`
  - HTML 以外のファイル：ページの返り値に `{ path: '/yomimono/feed.xml', raw: '…' }` の形を足し、scripts/build.mjs は raw があればそのまま書く（サイトマップには入れない）。カレンダーの .ics もこの形を使う
  - サイトマップ：一覧と各読みもの（lastmod は updated）
  - 点検：scripts/verify-dist.mjs に、`/yomimono/<slug>/` の自分の文 1,200字以上（足りなければ止める）を足す。数えるのは body の .prose の節だけで、棚が出す「自分の数字で確かめる」「出典」「ほかの読みもの」の節はのぞく（節の id で分ける）。category が point の読みものは /point/ と同じ言葉、furusato は /furusato/ と同じ言葉を見張る（パスではなくカテゴリで見る。ページに data 属性を付けるなど）
  - テスト `tests/yomimono.test.mjs`：要る欄がそろう・slug とファイル名が同じ・slug が重ならない・tools が published・sources に url と checked・description が全角80〜120字。src/pages/yomimono.mjs は、読みものの並びを受けとって HTML と RSS を作る関数を export し、テストは tests/ の中に置いた見本の読みもの（本番には出ない）をそれに渡して、ページ・一覧・RSS・計算のページの節を確かめる
  - docs/files.md と CLAUDE.md の「ファイル」に1行ずつ（src/yomimono/・src/pages/yomimono.mjs・docs/yomimono-neta.md）。docs/yomimono-neta.md の「書き方」と作ったものがちがえば、書き方のほうを作ったものに合わせて直す（予約タスクはそのファイルだけを見て書くため）
- できあがりの条件：`npm run check` が緑。本番のファイルの中に読みものが0本なので、dist に /yomimono/ は出ず、ほかのページの見た目は変わらない（全ページのスマホのピクセル比較。前と後の両方に `.prose{content-visibility:visible!important}` を足して full_page で撮る。足さないと遅れて描く所で毎回ちがいが出る）。テストの見本で、一覧・各ページ・/touyu-dai/ の「この計算の読みもの」・トップの「読みもの」・feed.xml（xmllint などで正しい XML）が作れることを確かめ、見本で作ったページのスクショ（スマホ 390px・パソコン 1280px）を PR に
- 決まったこと（11/4 しょーくん）：場所は /yomimono/、名前は「読みもの」。見た目はテーマの計算と同じ手帳（生活＝方眼ノート・お仕事＝紺・FX＝黒）。絵は図解だけで Canva は使わない。入口は、関係する計算のページの下・トップの新しい3本・RSS。棚ができるまで、予約タスク「読みもの書き」はサクッと計算の番を飛ばす（docs/yomimono-neta.md に書いてある）
- 迷ったら：一覧のページは自分の文の字数の点検の外でよい（計算のページではないので）。説明の文は1行。トップの「読みもの」の節は、パソコンの見開きで右の段に入る位置にする
- 読むファイル：docs/yomimono-neta.md・CLAUDE.md（ページの決まり・文章の決まり・デザインの決まり）・src/layout.mjs（page・section・spread）・src/parts.mjs・src/zukai.mjs・src/pages/index.mjs・scripts/build.mjs・scripts/verify-dist.mjs
- マージ：する

### [ ] 灯油の値段を毎週自動で取る（取り方と計算のはじめの値）
- やること：資源エネルギー庁「石油製品価格調査」の給油所の週ごとの時系列（Excel）を公開のたびに取り、灯油代の計算（/touyu-dai/）のはじめの値と、その下の1行（「◯月◯日調査・全国の店頭・18L」）を最新の週にする。グラフと表は次の項目
  - 取り方：`scripts/fetch-touyu.mjs` を作り、deploy.yml でビルドの前に動かす（`scripts/fetch-henreihin.mjs` と同じ形）。https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html を取り、`xlsx/<6けたの数字>s5.xlsx`（給油所の週の時系列。1990年8月27日から）のリンクを探して取る。ファイル名は毎週変わるので、URL を決め打ちしない
  - 11/4 にチャットで確かめたこと：最新は 2026-10-28 公表で、ファイルは `pl007/xlsx/261028s5.xlsx`（時系列）・`pl007/xlsx/261028.xlsx`（詳細版）・`pl007/docx/261028.docx`（概要版）。6けたは公表日（YYMMDD）。毎週月曜調査・水曜公表。結果のページに18Lの値段の数字は直接は書いていない
  - 読み方：パッケージを足さず、Node の zlib で xlsx（zip の中の XML）を読む。Excel の形はこの作業環境からは開けない（10/21）ので、まず PR の CI の中で取って、シートの名前と、灯油の店頭（現金）・全国の行と列の見出しを log に出し、それを見て読む所を決める
  - 形が思っていたのとちがうとき：店頭（現金）がなく「店頭」だけなら店頭。18L の列がなく 1L あたりだけなら ×18 にして、ページの1行に「1Lあたりの値段の18倍」と書く。全国がなく地域だけなら止める。灯油がどのシートにもない・読めないときは、取る所までを PR にして、止める（night-stopped。「しょーくんに決めてほしいこと」は「詳細版の Excel を使うか」）
  - 取ったものは `.touyu/price.json`（週ごとの調査日と18Lの値段）。コミットしない・成果物に上げない（`.touyu/` を .gitignore に）。ログには件数と最新の週だけ
  - 取れなかったとき：ビルドは止めず、src/data/touyu.mjs の TOUYU_PRICE（今の値）を使い、ページは前の調査日のまま。log に1行
  - テスト：xlsx を読む関数を、テストの中で作った小さな xlsx で確かめる。取れなかったときに今の値になること
  - docs/tools.md の灯油代の行と docs/shikumi.md に、取り方・取れなかったとき・HENREIHIN_LIVE との関係を1行ずつ。src/data/touyu.mjs の頭の注記も直す
- できあがりの条件：`npm run check` が緑。PR の CI の log に「灯油：◯月◯日調査 ◯円（◯週）」が出て、プレビューの /touyu-dai/ のはじめの値とその下の1行が最新の週になる。ネットにつながらない手元のビルドも通り、今の値が出る
- 決まったこと（11/4 しょーくん）：全国平均の18L（店頭）を毎週自動で取り、灯油代のページのはじめの値を新しくする（今は 10/13 調査の値のまま）
- 迷ったら：地域ごとの値段は入れない（全国だけ）。店頭と配達があれば店頭。「高い・安い」の言い切りや見通しは書かない
- 読むファイル：src/data/touyu.mjs・src/pages/touyu-dai.mjs・scripts/fetch-henreihin.mjs・.github/workflows/deploy.yml・.github/workflows/henreihin-daily.yml
- マージ：する

### [ ] 灯油の値段の記録をページに（グラフと表）
- やること：灯油代のページ（/touyu-dai/）の本文に「灯油の値段の記録」の節を足し、値段が古くなったら見張りが知らせるようにする
  - 節の中身：この冬（10月から）と前の冬の、週ごとの値段の折れ線（ビルドで描く SVG。数字は HTML の文字・role="img"・aria-label）と、直近12週の表（調査日・18L・前の週からの差）。出典の1行は「資源エネルギー庁『石油製品価格調査』をもとに作成」（政府標準利用規約の出典の書き方）
  - 見張り：scripts/mihari.mjs の毎朝の点検に「本番の灯油の値段の調査日が14日より古い（10月〜3月だけ）」を足し、古ければ mihari の issue（プロジェクトの claude/mihari-spec.md の形）
  - テスト：記録の表の作り方・前の週との差・冬の切り分け（10月から翌年3月まで）
- できあがりの条件：`npm run check` が緑。プレビューの /touyu-dai/ に記録のグラフと表が出る（スクショ：スマホ 390px・パソコン 1280px）。取れなかったときは、この節を出さない
- 決まったこと（11/4 しょーくん）：この冬の値段の記録をグラフにする
- 迷ったら：グラフは2つの冬（線2本）まで。前の冬のデータがなければ、この冬だけ。「高い・安い」の言い切りや見通しは書かない（数字と前の週からの差だけ）
- 読むファイル：src/pages/touyu-dai.mjs・src/zukai.mjs・scripts/mihari.mjs・プロジェクトの claude/mihari-spec.md
- 順番：「灯油の値段を毎週自動で取る」のあと
- マージ：する

### [ ] トップに「◯月の計算」（月ごとに入れかわる）
- やること：トップの「よく使う計算」のすぐ下に、月ごとに入れかわる「◯月の計算」の節を足す
  - 月ごとの表は `src/data/kisetsu.mjs`（下の表のとおり）。ビルドした日の日本時間の月で出す（src/pages/index.mjs の pickSeason と同じ月の出し方）。毎日の作り直しで、月の変わり目は1日の朝に入れかわる
  - 形：カテゴリの目次と同じ行（toolListHtml）。絵のマスにはしない（10/27「トップは『よく使う計算』だけ絵のマス」。季節の計算の多くには絵がない）。見出しは「11月の計算」のように月の数字。説明の文は書かない
  - その月の「よく使う計算」に出ているもの（pick と、その月の pickSeason）と、published でないものは出さない
  - 下のページ（parent のある計算：こたつ・電気毛布・ホットカーペット・入学・卒業年・めんつゆ・液体肥料など）も、この節にだけは出してよい（11/4 しょーくん OK の「冬は電気毛布・こたつ」が下のページのため。CLAUDE.md の「トップの目次には出さない」の例外）
  - パソコンの見開きでは、右の段のいちばん上に入る（「よく使う計算」のあと）
  - テスト：12か月ぶんの slug が tools.mjs にあって published・その月の pick と pickSeason にない・同じ月で重ならない。月をかえて作ると見出しと中身が変わる
  - CLAUDE.md の「ページの決まり」のトップの行に、この節のことを1行
- 表（11/4 しょーくん OK の考え方「冬は灯油・電気毛布・こたつ、12月はふるさと納税の締め切りなど」でチャットが作った。変えるときはこの表と src/data/kisetsu.mjs を直す）

| 月 | 出す計算（上から） |
| --- | --- |
| 1月 | 灯油代 touyu-dai・こたつ kotatsu・電気毛布 denki-moufu・厄年 yakudoshi |
| 2月 | 灯油代 touyu-dai・こたつ kotatsu・電気毛布 denki-moufu・ホットカーペット hot-carpet |
| 3月 | 入学・卒業年 gakureki・灯油代 touyu-dai・こたつ kotatsu・有給休暇の付与日数 yukyu-fuyo |
| 4月 | 入学・卒業年 gakureki・有給休暇の付与日数 yukyu-fuyo・残業代 zangyo-dai・和暦 wareki |
| 5月 | 有給休暇の付与日数 yukyu-fuyo・電気代 denki-dai・残業代 zangyo-dai・レシピの人数換算 recipe |
| 6月 | 電気代 denki-dai・めんつゆ mentsuyu・残業代 zangyo-dai・塩分濃度 enbun-noudo |
| 7月 | めんつゆ mentsuyu・電気代 denki-dai・塩分濃度 enbun-noudo・レシピの人数換算 recipe |
| 8月 | めんつゆ mentsuyu・電気代 denki-dai・レシピの人数換算 recipe・液体肥料 ekihi |
| 9月 | 長寿祝い choju・電気代 denki-dai・めんつゆ mentsuyu・液体肥料 ekihi |
| 10月 | 灯油代 touyu-dai・七五三 shichigosan・電気毛布 denki-moufu・こたつ kotatsu |
| 11月 | 七五三 shichigosan・灯油代 touyu-dai・電気毛布 denki-moufu・こたつ kotatsu |
| 12月 | ふるさと納税はいつまで furusato-shimekiri・灯油代 touyu-dai・こたつ kotatsu・電気毛布 denki-moufu |

（ふるさと納税の上限の目安 furusato は、11・12月は pickSeason で「よく使う計算」に出るので、この表には入れない）

- できあがりの条件：`npm run check` が緑。トップに「11月の計算」（七五三・灯油代・電気毛布・こたつ）が出る。テストで12月が「ふるさと納税はいつまで・灯油代・こたつ・電気毛布」になる。トップのスクショ（スマホ 390px・パソコン 1280px）を PR に。トップ以外のページは変わらない
- 決まったこと（11/4 しょーくん）：トップに季節の計算を出し、月ごとに自動で入れかわる
- 迷ったら：トップのほかの節の順番は変えない
- 読むファイル：src/pages/index.mjs・src/parts.mjs・src/tools.mjs・src/layout.mjs（spread）
- マージ：する

### [ ] 楽天の予定をカレンダーで登録できる（/point/calendar.ics）
- やること：カレンダーのファイル `/point/calendar.ics` を作り、/point/ と /point/shikumi/ に「カレンダーに入れる」のリンクを足す
  - 中身1：お買い物マラソンの回（src/data/point.mjs の POINT_EVENTS。公式で確かめた回だけが入っているデータ。終わってから90日より前の回は入れない）。題「お買い物マラソン（楽天市場）」（POINT_EVENTS の name が別ならその名前に「（楽天市場）」）。start・end は日本時間の「2026-11-04T20:00」の形（時刻の後ろに時差は書いていない）なので、+09:00 として UTC の Z で書く。DTEND は end の時刻そのまま（01:59 は 01:59）。説明は自分の言葉の短い文（上限が数字の回は「買いまわりの上限 ◯ポイント」と、エントリーが要ること）と、/point/ の URL と公式の URL。UID は回の start から作る（ビルドのたびに変わらないように）
  - 中身2：5と0のつく日（src/data/spu.mjs の POINT_DAY）。終日の予定を1つ、`RRULE:FREQ=MONTHLY;BYMONTHDAY=5,10,15,20,25,30` でくり返す。DTSTART は決まった日（2026-11-05）にする（中身と UID がビルドのたびに変わらないように）。題「5と0のつく日（楽天カード）」。説明は POINT_DAY の数字から（その日ごとのエントリーと楽天カードで払うこと・＋1倍・上限）
  - 頭：X-WR-CALNAME「サクッと計算 楽天のポイントの予定」・X-WR-TIMEZONE Asia/Tokyo・REFRESH-INTERVAL;VALUE=DURATION:P1D・X-PUBLISHED-TTL:P1D。改行は CRLF・75オクテットで折り返し・カンマとセミコロンと改行のエスケープ（RFC 5545）
  - リンク：/point/ と /point/shikumi/ の本文に1行ずつ「iPhone のカレンダーに入れる」（webcal://sakutto-keisan.com/point/calendar.ics）と「Google カレンダーに入れる」（https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fsakutto-keisan.com%2Fpoint%2Fcalendar.ics）。説明は1行まで
  - ファイルの書き方：「読みものの棚をつくる」で足した、ページの返り値の `{ path, raw }` の形を使う。Content-Type が text/calendar; charset=utf-8 になるように、もうある public/_headers に /point/calendar.ics の行を足す
  - テスト：ics の形（CRLF・折り返し・エスケープ・UID が回ごとに変わらない）・終わって90日をこえた回が入らない・5と0のつく日のくり返し
  - docs/point.md に1行
- できあがりの条件：`npm run check` が緑。dist/point/calendar.ics を ics の読みこみ（Python の icalendar など）で読めることを確かめる。/point/ と /point/shikumi/ にリンクの行が出る
- 決まったこと（11/4 しょーくん）：お買い物マラソンの期間（公式に出た回だけ）と5と0のつく日を、スマホのカレンダーに入れられるようにする
- 迷ったら：スーパーSALE などほかの名前の回も POINT_EVENTS に入っていれば、同じ形で入れる。「次回」「予想」は使わない（/point/ の言葉の決まり）
- 読むファイル：src/data/point.mjs・src/data/spu.mjs（POINT_DAY）・src/pages/point.mjs・src/pages/shikumi.mjs・public/_headers・docs/point.md
- 順番：「読みものの棚をつくる」のあと（HTML 以外のファイルを書く形を同じにするため）
- マージ：する

### [ ] お買い物マラソンの開催の記録（/point/kiroku/）
- やること：お買い物マラソンの終わった回を並べる記録のページを作る。中身は、見張りが用意していた夜のメモ（scripts/mihari.mjs の `MEMO.kiroku`）のとおり。そのうち大事な所：
  - 表は src/data/point.mjs の POINT_EVENTS からビルドのときに自動で作る（終わった回だけ。回が足されると、終わったあとのビルドで入る）。列は 回・期間・上限・付与日・有効期限。公式で確かめられなかった所は「—」
  - 名前とタイトルは、調べもの用ブランチ survey/suggest の survey/suggest.json（`git fetch origin survey/suggest`。11/4 にブランチがあるのを確かめた。main には入れない）で「過去」「前回」「いつ」「上限」などの候補と点数を見て決める（「次回」「予想」「スケジュール」は使わない）。ファイルが見つからなければ「お買い物マラソンの開催の記録」にする
  - 数字から言えることだけを短く書く（例：上限が7,000ポイントだった回の数）。「楽天グループとは関係のない個人のサイト」と書く。/point/ の言葉の決まりを守る
  - CLAUDE.md の「ツールを1つ足す手順」のうち、このページに合うもの（tools.mjs に足す・parent は point のツール・トップには出さない・関連ツール・共有画像・テストで表の作り方を確かめる）。入力のないページなので、check-fold.py・check-flow.py の CASES には足さない。slug に kiroku を入れる（mihari.mjs の checkKiroku が「もうページがある」と見て止まるため）
  - SPU の変更の記録（src/pages/spu.mjs の「SPUの最近の変更」の表）を、データ（src/data/spu.mjs）に移して両方のページで使う形にしてよい
  - /point/ と /point/shikumi/ から1行のリンク。docs/files.md の表と docs/point.md に1行ずつ
- できあがりの条件：`npm run check` が緑。/point/kiroku/ に終わった回が出る（11/4 の main では 10/4・10/14・10/24 の3回。11/4 からの回は終わったあとのビルドで入る）。テストで、終わった日のあとのビルドで回が1つふえる
- 決まったこと（11/4 しょーくん）：前は「終わった回が6回たまってから」としていたが、待たずに今ある回から作る。回が足されるたびに自動で伸びる
- 迷ったら：見張りの決まり（mihari.mjs の kirokuReady：終わった回6以上・上限が数字の回4以上）にとどかないあいだは noindex にしてサイトマップから外し、とどいたビルドで自動で外れるようにする（site-principles の「広告の審査」：中身のうすいページは育つまで noindex）。kirokuCount と kirokuReady は src/lib/ に移して、ページと mihari.mjs の両方から使ってよい。noindex のあいだも、表の見方・上限の種類（5,000・7,000・10,000）・期間の長さ・付与と期限の関係・データの確かめ方を書き、自分の文 900字を目安にする（水増しはしない）
- 読むファイル：scripts/mihari.mjs（MEMO.kiroku・kirokuCount・kirokuReady・checkKiroku）・src/data/point.mjs・src/pages/point.mjs・src/pages/spu.mjs・docs/point.md・CLAUDE.md（ツールを1つ足す手順・公開前の決まり・文章の決まり・ページの決まり）
- マージ：する
