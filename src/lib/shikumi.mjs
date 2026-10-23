// 楽天のポイントのしくみ（はじめての人向け）：今月の楽天市場の買い物を「いつもの1倍・SPU・キャンペーン」の3段に分ける目安。DOM は触らない
// いつもの1倍 ＝ 税抜の1%。SPU ＝ 楽天カード（通常分は税込・特典分は税抜で上限1,000）と楽天モバイル（＋4倍・上限2,000）。src/lib/spu.mjs と同じ計算
// キャンペーン ＝ 5と0のつく日（楽天カードで払うと＋1倍・1か月の上限1,000）と、お買い物マラソンの買いまわり（5店舗で＋4倍を回の上限まで。src/lib/point.mjs と同じ計算）
// 実際は注文ごと・日ごとに計算するので少しずれる（ページに「目安」と書く）
import { spuPoints } from './spu.mjs';
import { marathonPoints } from './point.mjs';

export const SHIKUMI_SHOPS = 5; // お買い物マラソンの店舗の数（しくみを見せるための例）

/**
 * @param {{ total:number|null, card:boolean, mobile:boolean, day:boolean, marathon:boolean }} p
 * @param {{ items:object[], base:number, dayRate:number, dayCap:number, cap:number, minYen:number, maxShops:number }} cfg
 */
export function shikumiPoints({ total, card = false, mobile = false, day = false, marathon = false }, cfg) {
  const useDay = day && card; // 5と0のつく日は楽天カードで払った分だけ
  const rate = cfg.base + (card ? 2 : 0) + (mobile ? 4 : 0) + (useDay ? cfg.dayRate : 0) + (marathon ? SHIKUMI_SHOPS - 1 : 0);
  const spu = spuPoints({ total, picked: [card && 'card', mobile && 'mobile'].filter(Boolean) }, cfg.items, cfg.base);
  if (!spu.ok) return { ...spu, rate };
  const dayRaw = useDay ? Math.floor((spu.net * cfg.dayRate) / 100) : 0;
  const dayPts = Math.min(dayRaw, cfg.dayCap);
  let mPts = 0;
  let mCapped = false;
  let mShort = false;
  if (marathon) {
    const m = marathonPoints({ total, shops: SHIKUMI_SHOPS, cap: cfg.cap, minYen: cfg.minYen, maxShops: cfg.maxShops });
    if (m.ok) {
      mPts = m.bonus;
      mCapped = m.capped;
    } else mShort = true; // 5店舗で1店舗1,000円にとどかない
  }
  const spuPts = spu.points - spu.base;
  const camp = dayPts + mPts;
  return {
    ok: true,
    total,
    net: spu.net,
    rate,
    base: spu.base,
    spu: spuPts,
    day: dayPts,
    marathon: mPts,
    camp,
    points: spu.base + spuPts + camp,
    capped: spu.lost > 0 || dayRaw > dayPts || mCapped, // どこかの上限で止まった
    mShort,
    dayNoCard: day && !card,
  };
}
