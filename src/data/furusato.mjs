// ふるさと納税の上限の計算に使う、年ごとの税の数字（寄付した年で分ける）
// 2026年の寄付は、令和8年分の所得税と令和9年度の住民税で計算する。数字はどれも下の出典で確かめた（確認日は FURUSATO_SOURCES）
// 1月1日に次の年の分を足す（2027年の寄付から特例控除額に193万円の上限。src/lib/furusato.mjs で入れる）
// 帯の表は [その金額以下, 値] の並び。最後は Infinity

export const FURUSATO_YEARS = {
  2026: {
    year: 2026,
    incomeTaxYear: '令和8年分',
    residentTaxYear: '令和9年度',
    // 給与所得控除：最低保障額69万円に、令和8年分・令和9年度分は5万円を足して74万円。ほかの帯は変わらない
    kyuyoMin: 740000,
    kyuyoBands: [
      [3600000, 0.3, 80000],
      [6600000, 0.2, 440000],
      [8500000, 0.1, 1100000],
      [Infinity, 0, 1950000],
    ],
    round4000: false, // 令和9年度の住民税の表（柏市）は4,000円きざみにしていない
    socialRate: 0.15, // 社会保険料は年収の15%と仮定（大手の早見表と同じ置き方）
    // 所得税の基礎控除（令和8年分。合計所得金額で決まる）
    basicIncomeTax: [
      [4890000, 1040000],
      [6550000, 670000],
      [23500000, 620000],
      [24000000, 480000],
      [24500000, 320000],
      [25000000, 160000],
      [Infinity, 0],
    ],
    // 住民税の基礎控除（変わらない）
    basicResident: [
      [24000000, 430000],
      [24500000, 290000],
      [25000000, 150000],
      [Infinity, 0],
    ],
    // 配偶者控除（配偶者の合計所得62万円以下・70歳未満。本人の合計所得で決まる）
    spouseIncomeTax: [[9000000, 380000], [9500000, 260000], [10000000, 130000], [Infinity, 0]],
    spouseResident: [[9000000, 330000], [9500000, 220000], [10000000, 110000], [Infinity, 0]],
    // 扶養控除（高校生＝16〜18歳の一般、大学生＝19〜22歳の特定）
    koukou: { incomeTax: 380000, resident: 330000 },
    daigaku: { incomeTax: 630000, resident: 450000 },
    // 調整控除の人的控除の差（基礎控除は合計所得2,500万円以下で5万円、配偶者は本人の合計所得で、扶養は一般5万・特定18万）
    diffBasic: [[25000000, 50000], [Infinity, 0]],
    diffSpouse: [[9000000, 50000], [9500000, 40000], [10000000, 20000], [Infinity, 0]],
    diffKoukou: 50000,
    diffDaigaku: 180000,
    // 特例控除の割合を決める人的控除差調整額には、所得税の基礎控除から48万円を引いた額（0円より下は0円）も足す
    basicIncomeTaxBase: 480000,
    // 住民税の所得割がかからない：総所得金額等が 35万円×人数＋10万円（扶養する人がいれば＋32万円）以下
    hikazei: { per: 350000, plus: 100000, family: 320000 },
  },
};

// 出典（ページの下に出す。checked は Claude が本文を開いて確かめた日。90日、11〜1月は30日たったらテストで止まる）
export const FURUSATO_SOURCES = [
  { name: '総務省「ふるさと納税の仕組み（税金の控除について）」', url: 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/furusato/mechanism/deduction.html', checked: '2026-10-21', what: '控除の計算式' },
  { name: '国税庁「給与所得者（従業員）の方へ（令和8年分）」', url: 'https://www.nta.go.jp/users/gensen/nencho/index/kyuyosyotokusya.htm', checked: '2026-10-22', what: '令和8年分の基礎控除' },
  { name: '財務省「令和8年度税制改正の大綱」', url: 'https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2026/08taikou_01.htm', checked: '2026-10-22', what: '給与所得控除の最低保障額' },
  { name: '渋谷区「令和9年度住民税の税制改正のお知らせ」', url: 'https://www.city.shibuya.tokyo.jp/kurashi/juminzei/zesei/zeisei_kaisei09.html', checked: '2026-10-22', what: '住民税の給与所得控除・基礎控除' },
  { name: '各務原市「税額控除」', url: 'https://www.city.kakamigahara.lg.jp/life/zeikin/1001574/1001580.html', checked: '2026-10-22', what: '調整控除と人的控除差調整額' },
  { name: '練馬区「寄附金税額控除」', url: 'https://www.city.nerima.tokyo.jp/kurashi/zei/jyuminzei/zeigakukojo/kifukinzeigakukojo.html', checked: '2026-10-22', what: '特例控除の割合' },
  { name: '柏市「個人住民税がかからないかた」', url: 'https://www.city.kashiwa.lg.jp/shiminzei/kojinshiminzei/r8hikazei.html', checked: '2026-10-22', what: '所得割がかからない基準' },
];
