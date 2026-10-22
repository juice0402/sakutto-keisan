// ふるさと納税の手続き：ワンストップ特例と、今年の締め切り（ブラウザとテストの両方で使う。DOM は触らない）
// 決まりの出典は src/data/furusato.mjs の FURUSATO_TETSUZUKI_SOURCES
//   ワンストップ特例：確定申告をしない給与所得者などで、寄付先が5つまで。申請は寄付ごと、同じ年の同じ自治体は1つと数える。
//   申請書は寄付した翌年の1月10日までに届くように出す（1月10日が土日でも同じ）。確定申告をしたり6つ以上に申請したりすると、その年の申請はぜんぶ使えない
//   年内の寄付は12月31日までに入金（クレジットカードは決済）したもの。確定申告は翌年2月16日〜3月15日（3月15日が土日なら次の月曜）
import { dayNum, weekdayOf } from './hizuke.mjs';

export const ONESTOP_MAX = 5; // ワンストップ特例が使える寄付先の数
export const ONESTOP_CITIES_MAX = 30; // −／＋で入れられる自治体の数

/** 確定申告の終わりの日（3月15日。土日なら次の月曜） */
export function kakuteiEnd(y) {
  const d = { y, m: 3, d: 15 };
  const w = weekdayOf(d);
  return { y, m: 3, d: w === '土' ? 17 : w === '日' ? 16 : 15 };
}

/**
 * 今日から見た、ふるさと納税の締め切り（年内の寄付・ワンストップ特例の申請・確定申告）
 * 1月1日〜10日は前の年の寄付の申請、3月15日までは前の年の寄付の確定申告がまだ間に合う
 * @param {{y:number,m:number,d:number}} today
 * @returns {{ key:string, forYear:number, date:{y,m,d}, from?:{y,m,d}, days:number, open:boolean }[]}
 */
export function furusatoDeadlines(today) {
  const t = dayNum(today);
  const y = today.y;
  const nenmatsu = { y, m: 12, d: 31 };
  const osYear = t <= dayNum({ y, m: 1, d: 10 }) ? y - 1 : y; // ワンストップ特例の申請が間に合う寄付の年
  const kkYear = t <= dayNum(kakuteiEnd(y)) ? y - 1 : y; // 確定申告が間に合う寄付の年
  const kkFrom = { y: kkYear + 1, m: 2, d: 16 };
  const kkEnd = kakuteiEnd(kkYear + 1);
  return [
    { key: 'kifu', forYear: y, date: nenmatsu, days: dayNum(nenmatsu) - t, open: true },
    { key: 'onestop', forYear: osYear, date: { y: osYear + 1, m: 1, d: 10 }, days: dayNum({ y: osYear + 1, m: 1, d: 10 }) - t, open: true },
    { key: 'kakutei', forYear: kkYear, date: kkEnd, from: kkFrom, days: dayNum(kkEnd) - t, open: t >= dayNum(kkFrom) },
  ];
}

/**
 * ワンストップ特例の申請：寄付した自治体の数・確定申告をするか・マイナンバーカードがあるかから、出すものと使えるか
 * @param {{ cities:number|null, kakutei:boolean, card:boolean }} p
 */
export function onestopPlan({ cities, kakutei, card }) {
  if (cities === null || cities === undefined) return { ok: false, empty: true };
  if (!Number.isFinite(cities) || cities < 1 || !Number.isInteger(cities)) return { ok: false, error: '自治体の数は1以上の整数で入れてください。', field: 'cities' };
  if (cities > ONESTOP_CITIES_MAX) return { ok: false, error: `自治体の数は${ONESTOP_CITIES_MAX}までにしてください。`, field: 'cities' };
  const over = cities > ONESTOP_MAX;
  const usable = !kakutei && !over;
  return {
    ok: true,
    cities,
    usable,
    reason: kakutei ? 'kakutei' : over ? 'over' : '',
    envelopes: usable ? cities : 0, // 寄付先ごとに1通（同じ自治体に2回寄付したら、申請書は2枚）
    copies: card ? ['マイナンバーカードの表と裏のコピー'] : ['通知カードか、番号の入った住民票の写し', '運転免許証などのコピー'],
  };
}
