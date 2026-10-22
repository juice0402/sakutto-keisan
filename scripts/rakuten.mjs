// 楽天市場 商品検索API（2026-07-01版）の呼び方（返礼品のページ用。推し手帳の scripts/lib/rakuten*.mjs と同じやり方）
// 新方式：applicationId＋accessKey＋Referer（楽天のアプリの「許可されたWebサイト」と同じ）。1.1秒以上あけて呼ぶ
// 楽天から取ったデータは、リポジトリ・ログ・成果物に残さない（楽天ウェブサービスの規約 第10条9号）。ログには件数だけ
import { RAKUTEN_SITE } from '../src/data/henreihin.mjs';

export const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
const HEADERS = { Referer: `${RAKUTEN_SITE}/`, Origin: RAKUTEN_SITE };
const ELEMENTS = ['itemName', 'itemCode', 'itemPrice', 'affiliateUrl', 'mediumImageUrls', 'shopName', 'shopCode', 'availability', 'genreId', 'reviewCount', 'reviewAverage'];
const WAIT_MS = 1100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

export function rakutenKeys(env = process.env) {
  const k = {
    appId: String(env.RAKUTEN_APPLICATION_ID ?? '').trim(),
    accessKey: String(env.RAKUTEN_ACCESS_KEY ?? '').trim(),
    affiliateId: String(env.RAKUTEN_AFFILIATE_ID ?? '').trim(),
  };
  return k.appId && k.accessKey && k.affiliateId ? k : null;
}

/** GitHub Actions の注意書き（中身は件数などだけ。商品の情報は出さない） */
export function note(level, title, msg) {
  console.log(`${title}：${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=${title}::${msg}`);
}

const firstImage = (it) => {
  const list = it.mediumImageUrls;
  if (!Array.isArray(list) || !list.length) return '';
  const v = list[0];
  return typeof v === 'string' ? v : v?.imageUrl ?? '';
};

/** 1ページ（30件）を探す。sort は -reviewCount（レビューが多い順）。買えるものだけ・画像があるものだけ */
export async function searchPage(keys, { keyword, page = 1, ngKeyword = '', genreId = null, sort = '-reviewCount' }) {
  const params = new URLSearchParams({
    applicationId: keys.appId,
    accessKey: keys.accessKey,
    affiliateId: keys.affiliateId,
    keyword,
    hits: '30',
    page: String(page),
    sort,
    imageFlag: '1',
    availability: '1',
    formatVersion: '2',
    elements: [...ELEMENTS, 'count', 'pageCount'].join(','),
  });
  if (ngKeyword) params.set('NGKeyword', ngKeyword);
  if (genreId) params.set('genreId', String(genreId));
  const url = `${ENDPOINT}?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const wait = lastCall + WAIT_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await sleep(5000 * attempt);
      continue;
    }
    if (res.status === 404) return { items: [], pageCount: 0 };
    // エラーの本文にはキーが入っていることがあるので、ログには番号だけ
    if (!res.ok) throw new Error(`楽天APIエラー HTTP ${res.status}`);
    const json = JSON.parse(text);
    const raw = json?.Items ?? json?.items ?? [];
    const items = raw.map((r) => {
      const it = r.Item ?? r.item ?? r;
      return {
        code: String(it.itemCode ?? ''),
        name: String(it.itemName ?? ''),
        price: Number(it.itemPrice ?? 0),
        url: String(it.affiliateUrl ?? ''),
        img: firstImage(it),
        shop: String(it.shopName ?? ''),
        shopCode: String(it.shopCode ?? ''),
        genre: String(it.genreId ?? ''),
        reviews: Number(it.reviewCount ?? 0),
        rating: Number(it.reviewAverage ?? 0),
      };
    });
    return { items, pageCount: Number(json.pageCount ?? 0), count: Number(json.count ?? 0) };
  }
  throw new Error('楽天APIが混んでいて取れませんでした');
}
