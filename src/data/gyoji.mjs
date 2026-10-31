// 家族の行事のページ（七五三・厄年・長寿祝い・お食い初め・四十九日）の数字と出典
// 数字は出典のページで確かめたものだけ（10/27）。神社・お寺・地域でちがう所は、ちがうと書いて言い切らない

// 七五三：明治神宮「満年齢で男子が五歳（地方によって三歳も）、女子が三歳、七歳」。住吉大社・八坂神社は数え年でも満年齢でもよい
export const SHICHIGOSAN = [
  { age: 3, rite: '髪置', boy: 'local', girl: true },
  { age: 5, rite: '袴着', boy: true, girl: false },
  { age: 7, rite: '帯解', boy: false, girl: true },
];
export const SHICHIGOSAN_SOURCES = [
  { name: '明治神宮 Q&A（七五三）', url: 'https://meijijingu.or.jp/faq/?amp=&ca=4&id=4' },
  { name: '八坂神社 七五三詣', url: 'https://www.yasaka-jinja.or.jp/sanpai/rites-of-life/shichigosan/' },
  { name: '住吉大社 七五三詣', url: 'https://sumiyoshitaisha.net/worship/753.html' },
  { name: '神田明神 七五三', url: 'https://www.kandamyoujin.or.jp/event/detail/?id=16&m=11' },
];

// 厄年（数え年）：明治神宮・日枝神社は男25・42・61、女19・33・37。大厄は男42・女33。前の年が前厄、次の年が後厄
// 女性の61は、生田神社・成田山新勝寺などにある（成田山は女37がない）。神社・お寺でちがうので「一部」と出す
export const YAKU = {
  male: [{ age: 25 }, { age: 42, big: true }, { age: 61 }],
  female: [{ age: 19 }, { age: 33, big: true }, { age: 37 }, { age: 61, some: true }],
};
export const YAKU_SOURCES = [
  { name: '明治神宮 Q&A（厄年）', url: 'https://meijijingu.or.jp/faq/?amp=&ca=4&id=4' },
  { name: '日枝神社 よくある質問', url: 'https://www.hiejinja.net/faq/' },
  { name: '生田神社 厄除', url: 'https://ikutajinja.or.jp/info/yakuyoke' },
  { name: '成田山新勝寺 厄除', url: 'https://www.naritasan.or.jp/pray/yakuyoke/' },
  { name: '太宰府天満宮 節分厄除祭', url: 'https://www.dazaifutenmangu.or.jp/omatsuri/setsubun-yakuyoke' },
];

// 長寿祝い：還暦は満60歳（数え61歳）。ほかは数え年で祝うと書く資料が多い（国立国会図書館 レファレンス協同データベース）。満年齢で祝うことも多い（高島屋）
// kazoe：数え年の年齢。満年齢で祝うときは1つ下（還暦だけ、満60歳がもとの年齢）
export const CHOJU = [
  { name: '還暦', yomi: 'かんれき', kazoe: 61 },
  { name: '緑寿', yomi: 'ろくじゅ', kazoe: 66, some: true },
  { name: '古希', yomi: 'こき', kazoe: 70 },
  { name: '喜寿', yomi: 'きじゅ', kazoe: 77 },
  { name: '傘寿', yomi: 'さんじゅ', kazoe: 80 },
  { name: '米寿', yomi: 'べいじゅ', kazoe: 88 },
  { name: '卒寿', yomi: 'そつじゅ', kazoe: 90 },
  { name: '白寿', yomi: 'はくじゅ', kazoe: 99 },
  { name: '百寿', yomi: 'ひゃくじゅ', kazoe: 100 },
  { name: '茶寿', yomi: 'ちゃじゅ', kazoe: 108 },
  { name: '皇寿', yomi: 'こうじゅ', kazoe: 111 },
];
// 長寿祝いの色：高島屋「長寿祝いのしきたり」（2026-10-31 に確認）。還暦は赤い品物を贈る習慣、ほかは日本百貨店協会が提案するイメージカラー。百寿・茶寿・皇寿は書いていない
export const CHOJU_COLORS = { 還暦: '赤', 緑寿: '緑', 古希: '藍色', 喜寿: '黄色', 傘寿: 'オレンジ', 米寿: 'ベージュ', 卒寿: '紫', 白寿: '白' };
export const CHOJU_SOURCES = [
  { name: '国立国会図書館 レファレンス協同データベース（還暦・古稀など）', url: 'https://crd.ndl.go.jp/reference/entry/index.php?id=1000227161&page=ref_view' },
  { name: '国立国会図書館 レファレンス協同データベース（緑寿・茶寿・皇寿など）', url: 'https://crd.ndl.go.jp/reference/entry/index.php?page=ref_view&id=1000258244' },
  { name: '高島屋 長寿祝いのしきたり', url: 'https://www.takashimaya.co.jp/shopping/gift/story/gaju/FA19012/' },
];

// お食い初め：生後100日ごろ（農林水産省・水戸市）。日枝神社・大阪小児科医会は100日目か120日目
// 生まれた日を1日目に数えると100日目は99日後、0日目に数えると100日後（どちらの数え方もある）
export const OKUIZOME_SOURCES = [
  { name: '農林水産省 子どもが生まれたら（7つの人生儀礼）', url: 'https://www.maff.go.jp/j/keikaku/syokubunka/oishiiwashoku/article/94/' },
  { name: '水戸市 こどもが生まれてから20歳までの伝統行事', url: 'https://www.city.mito.lg.jp/page/119683.html' },
  { name: '日枝神社 よくある質問', url: 'https://www.hiejinja.net/faq/' },
  { name: '大阪小児科医会 食べ初め', url: 'https://www.osk-pa.or.jp/child-care/cc5/02-neonatal/20060901263.html' },
];

// 四十九日：亡くなった日を1日目に数えて7日目が初七日、49日目が四十九日（天台宗・浄土真宗本願寺派）
// 前の日から数える地域もある（浄土宗の中陰表の「逮夜日」）。年忌は、一周忌が満1年、三回忌が満2年、七回忌が満6年（天台宗・浄土宗）
export const CHUIN = ['初七日', '二七日', '三七日', '四七日', '五七日', '六七日', '四十九日'];
export const NENKI = [
  { name: '一周忌', years: 1 },
  { name: '三回忌', years: 2 },
  { name: '七回忌', years: 6 },
  { name: '十三回忌', years: 12 },
  { name: '十七回忌', years: 16 },
  { name: '二十三回忌', years: 22 },
  { name: '二十七回忌', years: 26 },
  { name: '三十三回忌', years: 32 },
];
export const SHIJUKU_SOURCES = [
  { name: '天台宗 年回の数え方', url: 'https://www.tendai.or.jp/houwashuu/kiji.php?nid=50' },
  { name: '浄土真宗本願寺派 よくあるご質問', url: 'https://www.hongwanji.or.jp/faq/list.html' },
  { name: '浄土宗 中陰表・年回表', url: 'https://jodo.or.jp/tool/' },
  { name: '浄土宗 よくあるご質問', url: 'https://jodo.or.jp/faq/' },
];
