// ふるさと納税の返礼品：商品名から量を読んで、1万円あたりの量を出す（ビルドとテストで使う。DOM は触らない）
// 決まり（claude/furusato-spec.md）：量は商品名に書かれた数字だけで出す。読めないもの・いくつも量があって迷うもの・幅のあるもの（1.5〜2kg）は並べない
//   数字をまちがえるくらいなら出さない。定期便は回数をかけた合計にして「定期便」の印。殻つき・姿の魚介は印をつける

/** 全角・半角や書き方をそろえる（ｋｇ・キロ→kg、グラム→g、×・x・＊→×） */
export function hrNormalize(name) {
  return String(name || '')
    .normalize('NFKC')
    .replace(/キロ(グラム)?/g, 'kg')
    .replace(/グラム/g, 'g')
    .replace(/[kK][gG]/g, 'kg')
    .replace(/(\d)\s*[xX＊*]\s*(\d)/g, '$1×$2')
    .replace(/\s+/g, ' ');
}

// 単位ごとの読み方。value は「その単位でいくつ」（「24ロールor64ロール」のように英字が続いても読む）
const UNITS = {
  kg: { re: /(\d+(?:\.\d+)?)\s*(kg|g)(?![a-np-zA-Z])/g, value: (n, u) => (u === 'kg' ? n : n / 1000) },
  ロール: { re: /(\d+(?:\.\d+)?)\s*(ロール|R(?![a-zA-Z]))/g, value: (n) => n },
  箱: { re: /(\d+(?:\.\d+)?)\s*(箱|BOX|ボックス)/g, value: (n) => n },
};
// 量のすぐあとの「×2袋」「×12パック」（入り・パック・組や「(ダブル)」をはさんでもよい）
const TIMES = /^\s*(?:\([^()]{0,10}\))?\s*(?:入り?|パック|組|セット|袋|個|本|缶|p|P)?\s*×\s*(\d+)(?!\s*(?:回|ヶ月|か月|カ月|ケ月|\d))\s*(?:袋|個|パック|p|P|本|箱|セット|入|缶|組|ケース|袋入り|トレー)?/;
const TOTAL = /(?:合計|総量|総重量|計)\s*(?:約)?\s*(\d+(?:\.\d+)?)\s*(kg|g|ロール|R|箱)/;
// 幅のある量（1.5〜2kg）と、下だけ書いた量（600g〜）
const RANGE = /\d\s*(?:kg|g|ロール|R|箱|個|本|枚|尾|パック|P)?\s*[〜~～\-－]\s*(?:約)?\d|\d\s*(?:kg|g|ロール|R|箱)\s*[〜~～]/;
const TEIKI = /定期便/;
const TEIKI_N = /(?:全\s*(\d+)\s*回)|(?:(\d+)\s*(?:回|ヶ月|か月|カ月|ケ月)\s*(?:定期便|お届け|コース))|(?:定期便[^0-9]{0,8}(\d+)\s*(?:回|ヶ月|か月|カ月|ケ月))/;
// 量や回数をえらぶ返礼品（楽天の寄付額がどの量の額かわからないので並べない）
const CHOICE = [
  /(?:選べ|えらべ|選択|お選び|選ぶ)[^。]{0,8}?(?:容量|内容量|量|個数|ロール数|数量|本数|枚数|組数|パック数|箱数|回数|重量|サイズ|規格|お届け回数|配送回数|発送回数)/,
  /(?:容量|内容量|個数|ロール数|数量|本数|枚数|組数|パック数|箱数|回数|重量|お届け回数|配送回数|発送回数)\s*(?:が|を|も|・|＆|&)?[^。]{0,8}?(?:選べ|えらべ|選択)/,
  /(?:単品|1回)[^。]{0,12}定期便|定期便[^。]{0,6}(?:も|より)\s*(?:選べ|えらべ|選択)/,
  /\d\s*(?:kg|g|ロール|R|箱)?\s*(?:or|OR|または|もしくは)\s*(?:約)?\s*\d/,
  /\d\s*(?:kg|g|ロール|R|箱)?\s*[・、\/／|｜]\s*(?:約)?\s*\d+(?:\.\d+)?\s*(?:kg|g|ロール|R|箱)?\s*(?:[・、\/／|｜]\s*\d|\s*(?:kg|g|ロール|R|箱))/,
  /(?:最大|最小)\s*(?:約)?\s*\d|\d\s*(?:kg|g|ロール|R|箱|枚|個|本|尾|パック|P)\s*(?:以上|以下)/,
];
// トイレットペーパーとティッシュのセット（寄付額が両方の分なので並べない）
const MIXED = /(?=.*トイレット)(?=.*ティッシュ|.*ティシュ)/;
// 長巻き（2倍巻き・3倍長持ち）は、ふつうの長さのロールの数にする
const BAI = /(\d+(?:\.\d+)?)\s*倍\s*(?:巻|長持ち|長巻|ロング)/g;
// 1つの中身の説明（「1箱220組」「1ロール100m」「1袋あたり」）は量に数えない
const PER_ONE = /^\s*(?:\d+\s*(?:組|枚|m|メートル)|あたり|当たり|入り?\s*\d)/;

const near = (a, b) => Math.abs(a - b) <= Math.max(a, b) * 0.005;

/**
 * 商品名から量を読む
 * @param {string} name 商品名
 * @param {'kg'|'ロール'|'箱'} unit 読む単位
 * @returns {{ total:number, unit:string, basis:string, teiki:number, shell:boolean } | null}
 */
export function readAmount(name, unit) {
  const s = hrNormalize(name);
  const U = UNITS[unit];
  if (!U) return null;
  const noDate = s.replace(/\d+月|\d+日|\d+年|\d+時|\d+営業日/g, ' ');
  if (CHOICE.some((re) => re.test(noDate))) return null;
  if (RANGE.test(noDate)) return null;
  if (unit !== 'kg' && MIXED.test(s)) return null;
  // 定期便：回数が読めなければ並べない。回数がいくつも書いてあれば（3回 6回 12回）えらぶ返礼品
  let teiki = 1;
  const counts = new Set([...noDate.matchAll(/(\d+)\s*(?:回|ヶ月|か月|カ月|ケ月)(?!目)/g)].map((m) => m[1]));
  if (counts.size > 1) return null;
  if (TEIKI.test(s) || /全\s*\d+\s*回/.test(s)) {
    const m = TEIKI_N.exec(s);
    if (!m) return null;
    teiki = Number(m[1] || m[2] || m[3]);
    if (!(teiki >= 2 && teiki <= 24)) return null;
  }
  // 「合計◯kg」があればそれ（1回分の合計。定期便ならあとで回数をかける）
  const tot = TOTAL.exec(s);
  let once = null;
  let basis = '';
  const soutou = unit === 'ロール' ? [...s.matchAll(/(\d+(?:\.\d+)?)\s*(?:ロール|R)\s*(?:分\s*)?相当/g)] : [];
  if (soutou.length) {
    // 「96ロール相当」：ふつうの長さで何ロールか（いくつもあればえらぶ返礼品）
    const vals = new Set(soutou.map((m) => Number(m[1])));
    if (vals.size > 1) return null;
    once = [...vals][0];
    basis = `${once}ロール相当`;
  } else if (tot && unitOf(tot[2]) === unit) {
    once = U.value(Number(tot[1]), tot[2]);
    basis = `${tot[0].replace(/^(合計|総量|総重量|計)\s*/, '計')}`;
  } else {
    const found = [];
    for (const m of s.matchAll(U.re)) {
      let v = U.value(Number(m[1]), m[2]);
      let text = m[0];
      const rest = s.slice(m.index + m[0].length);
      if (PER_ONE.test(rest) && Number(m[1]) === 1) continue;
      const t = TIMES.exec(rest);
      if (t) {
        v *= Number(t[1]);
        text += t[0].trim();
      }
      const before = s.slice(0, m.index);
      const paren = (before.match(/\(/g) || []).length > (before.match(/\)/g) || []).length;
      if (v > 0) found.push({ v, text: text.replace(/\s+/g, ''), times: Boolean(t), paren });
    }
    if (!found.length) return null;
    // 量がいくつも出てきたら、どれも同じ量で、片方がもう片方の内わけ（「10kg（5kg×2袋）」）のときだけ読める
    // 「もも2kg・むね2kg」のように別の物が同じ量のときは、合計がわからないので並べない
    const vals = found.map((f) => f.v);
    if (found.length > 1 && (!vals.every((v) => near(v, vals[0])) || !found.some((f) => f.times || f.paren))) return null;
    once = vals[0];
    basis = found.reduce((a, b) => (b.text.includes('×') && !a.text.includes('×') ? b : a)).text;
    if (unit === 'ロール') {
      const bai = new Set([...s.matchAll(BAI)].map((m) => Number(m[1])));
      if (bai.size > 1) return null;
      const b = [...bai][0];
      if (b > 1) {
        once *= b;
        basis += `・${b}倍巻き`;
      }
    }
  }
  if (!(once > 0)) return null;
  const total = round(once * teiki);
  return {
    total,
    unit,
    basis: teiki > 1 ? `${basis}・定期便${teiki}回` : basis,
    teiki,
    shell: /殻付|殻つき|姿/.test(s),
  };
}

const unitOf = (u) => (u === 'kg' || u === 'g' ? 'kg' : u === 'R' || u === 'ロール' ? 'ロール' : u);
const round = (x) => Math.round(x * 1000) / 1000;

/** 1万円あたりの量 */
export const perMan = (total, price) => (price > 0 ? (total / price) * 10000 : 0);

/** 届く時期が商品名に書いてあるか（書いてあれば、その言葉） */
export function whenOf(name) {
  const s = hrNormalize(name);
  const m =
    /\d{1,2}月(?:上旬|中旬|下旬)?(?:以降|から|より|頃|ごろ)?(?:順次)?(?:発送|お届け|配送|出荷)/.exec(s) ||
    /\d{1,3}日以内(?:に)?(?:発送|お届け|配送|出荷)/.exec(s) ||
    /年内(?:発送|配送|お届け|出荷)/.exec(s);
  return m ? m[0] : '';
}

/**
 * 楽天から取った商品を、ページに出す形にする（量が読めないもの・ふるさと納税の店でないものは外す）
 * @param {Array<{code,name,price,url,img,shop,shopCode,reviews,rating}>} items
 * @param {'kg'|'ロール'|'箱'} unit
 */
export function hrPrepare(items, unit) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (!it || seen.has(it.code)) continue;
    if (!/^f\d{6}-/.test(String(it.shopCode || ''))) continue; // 楽天ふるさと納税の自治体の店（f＋自治体コード）
    if (!(it.price > 0)) continue;
    const a = readAmount(it.name, unit);
    if (!a) continue;
    seen.add(it.code);
    out.push({ ...it, ...a, per: perMan(a.total, it.price), when: whenOf(it.name) });
  }
  return out.sort((x, y) => y.per - x.per || x.price - y.price);
}

/**
 * はじめての1件：寄付額2万円まで・定期便でない・レビュー10件以上のうち、届く時期が商品名にあるものを先に、1万円あたりの量が多いもの
 * @param {Array} list hrPrepare のあと
 */
export function firstPick(list) {
  const ok = list.filter((x) => x.price <= 20000 && x.teiki === 1 && x.reviews >= 10);
  if (!ok.length) return null;
  const withWhen = ok.filter((x) => x.when);
  return (withWhen.length ? withWhen : ok)[0];
}
