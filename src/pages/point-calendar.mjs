// /point/calendar.ics：楽天の予定のカレンダー（#190。11/4 しょーくん「お買い物マラソンの期間と5と0のつく日を、スマホのカレンダーに入れられるように」）
// 中身は src/data/point.mjs の POINT_EVENTS（公式で確かめた回だけ。終わって90日をこえた回は入れない）と、src/data/spu.mjs の POINT_DAY（毎月5・10・15・20・25・30日のくり返し）
// UID と DTSTAMP はデータから作るので、データが変わらなければ中身はビルドのたびに同じ。通知（VALARM）は入れない（使う人のカレンダーの設定にまかせる）
// リンクは /point/ と /point/shikumi/ の CAL_LINKS。Content-Type は public/_headers
import { SITE } from '../site.mjs';
import { POINT_EVENTS } from '../data/point.mjs';
import { POINT_DAY } from '../data/spu.mjs';
import { icsCalendar, icsEscape, icsUtc, icsDate } from '../lib/ics.mjs';
import { fmt } from '../lib/number.mjs';

export const CAL_PATH = '/point/calendar.ics';
const HOST = new URL(SITE.url).host;
const WEBCAL = `webcal://${HOST}${CAL_PATH}`;
// /point/ と /point/shikumi/ の本文の1行
export const CAL_LINKS = `<p>お買い物マラソンの期間と5と0のつく日を、<a href="${WEBCAL}">iPhone のカレンダーに入れる</a>か<a href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(WEBCAL)}">Google カレンダーに入れる</a>と、新しい回も入ります。</p>`;

const KEEP_DAYS = 90; // 終わってからこの日数までの回は残す
const DAY_START = '2026-11-05'; // 5と0のつく日のくり返しの始まり（決めた日。ビルドのたびに変えない）
const stamp = (checked) => `${icsDate(checked)}T000000Z`;
const stampOf = (iso) => iso.replace(/[-:]/g, '').slice(0, 13);

function eventLines(e) {
  const lines = [`楽天市場の${e.name}の期間です。買いまわりの特典は、期間中のエントリーが要ります。`];
  if (e.cap) lines.push(`買いまわりの上限 ${fmt(e.cap)}ポイント`);
  lines.push(`計算：${SITE.url}/point/`, `公式：${e.url}`);
  return [
    ['UID', `point-${stampOf(e.start)}@${HOST}`],
    ['DTSTAMP', stamp(e.checked)],
    ['DTSTART', icsUtc(e.start)],
    ['DTEND', icsUtc(e.end)],
    ['SUMMARY', icsEscape(`${e.name}（楽天市場）`)],
    ['DESCRIPTION', icsEscape(lines.join('\n'))],
    ['URL', `${SITE.url}/point/`],
    ['TRANSP', 'TRANSPARENT'],
  ];
}

function dayLines(d) {
  const next = new Date(`${DAY_START}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const text = [
    `その日ごとにエントリーして楽天カードで払うと、楽天市場のポイントが＋${d.rate}倍になります。上限は1か月${fmt(d.cap)}ポイントです。`,
    `しくみ：${SITE.url}/point/shikumi/`,
    `公式：${d.url}`,
  ].join('\n');
  return [
    ['UID', `point-day-5-0@${HOST}`],
    ['DTSTAMP', stamp(d.checked)],
    ['DTSTART;VALUE=DATE', icsDate(DAY_START)],
    ['DTEND;VALUE=DATE', icsDate(next.toISOString().slice(0, 10))],
    ['RRULE', 'FREQ=MONTHLY;BYMONTHDAY=5,10,15,20,25,30'],
    ['SUMMARY', icsEscape('5と0のつく日（楽天カード）')],
    ['DESCRIPTION', icsEscape(text)],
    ['URL', `${SITE.url}/point/shikumi/`],
    ['TRANSP', 'TRANSPARENT'],
  ];
}

// nowMs の時点で入れる回（終わって90日をこえた回は外す）
export const calendarEvents = (events, nowMs) => events.filter((e) => Date.parse(`${e.end}:00+09:00`) + KEEP_DAYS * 86400000 >= nowMs);

export function pointIcs(events = POINT_EVENTS, day = POINT_DAY, nowMs = Date.now()) {
  return icsCalendar({
    head: [
      ['PRODID', `-//${HOST}//point calendar//JA`],
      ['CALSCALE', 'GREGORIAN'],
      ['METHOD', 'PUBLISH'],
      ['X-WR-CALNAME', icsEscape('サクッと計算 楽天のポイントの予定')],
      ['X-WR-CALDESC', icsEscape('楽天市場の公式のページで確かめた期間です。個人のサイトで、楽天グループとは関係ありません。')],
      ['X-WR-TIMEZONE', 'Asia/Tokyo'],
      ['REFRESH-INTERVAL;VALUE=DURATION', 'P1D'],
      ['X-PUBLISHED-TTL', 'P1D'],
    ],
    events: [...calendarEvents(events, nowMs).map(eventLines), dayLines(day)],
  });
}

export default function render() {
  return { path: CAL_PATH, raw: pointIcs() };
}
