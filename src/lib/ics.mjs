// カレンダーのファイル（.ics・RFC 5545）を作る部品。DOM なし。/point/calendar.ics で使う（ほかの .ics も使い回せる形）
// 改行は CRLF・1行75オクテットで折り返し（続きの行は空白1つから）・文字の値の \ ; , 改行はエスケープ

// 文字の値のエスケープ（\ → \\、; → \;、, → \,、改行 → \n）
export const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// 1行を75オクテットまでで折り返す（UTF-8 の文字の途中では切らない。続きの行の頭の空白も75に数える）
export function icsFold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const c = ch.codePointAt(0);
    const n = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; // UTF-8 のバイト数
    if (bytes + n > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

// 日本時間の「2026-11-04T20:00」→ UTC の「20261104T110000Z」
export const icsUtc = (jst) => new Date(`${jst}:00+09:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// 「2026-11-05」→「20261105」
export const icsDate = (d) => d.replace(/-/g, '');

// カレンダー全体。head は頭の行（[名前, 値]）、events は予定ごとの行（[名前, 値] の並び。値はエスケープ済みのもの）
export function icsCalendar({ head, events }) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', ...head.map(([k, v]) => `${k}:${v}`)];
  for (const ev of events) lines.push('BEGIN:VEVENT', ...ev.map(([k, v]) => `${k}:${v}`), 'END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
