// xlsx（zip の中の XML）を、パッケージを足さずに Node の zlib だけで読む（scripts/fetch-touyu.mjs で使う）
// 読むのは シートの名前・セルの値（文字と数字）だけ。書式・数式・結合は見ない
import { inflateRawSync } from 'node:zlib';

// zip の中のファイルを { 名前: Buffer } にする（中央ディレクトリから。圧縮なし(0)と deflate(8)だけ）
export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip の終わりの印がありません');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip の目次が読めません');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 0) files[name] = raw;
    else if (method === 8) files[name] = inflateRawSync(raw);
  }
  return files;
}

const unesc = (s) =>
  s.replace(/&(lt|gt|quot|apos|amp|#x[0-9a-fA-F]+|#\d+);/g, (m, e) =>
    e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'quot' ? '"' : e === 'apos' ? "'" : e === 'amp' ? '&' : e[1] === 'x' ? String.fromCodePoint(parseInt(e.slice(2), 16)) : String.fromCodePoint(Number(e.slice(1))),
  );
// <si> や <is> の中の <t> をつなぐ（ふりがな <rPh> の中の字は入れない）
const textOf = (xml) => unesc((xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').match(/<t\b[^>]*>[\s\S]*?<\/t>/g) || []).map((t) => t.replace(/^<t\b[^>]*>|<\/t>$/g, '')).join(''));
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];

// "AB12" → { col: 27, row: 12 }（列は1から）
export function cellRef(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return { col, row: Number(m[2]) };
}

// ブックを読む：[{ name, rows }]。rows は行番号→（列番号→値）の Map。値は文字か数字
export function readXlsx(buf) {
  const files = unzip(buf);
  const str = (n) => (files[n] ? files[n].toString('utf8') : '');
  const shared = (str('xl/sharedStrings.xml').match(/<si\b[\s\S]*?<\/si>/g) || []).map(textOf);
  const rels = {};
  for (const r of str('xl/_rels/workbook.xml.rels').match(/<Relationship\b[^>]*>/g) || []) {
    const t = attr(r, 'Target');
    rels[attr(r, 'Id')] = t.startsWith('/') ? t.slice(1) : `xl/${t}`;
  }
  const sheets = [];
  for (const s of str('xl/workbook.xml').match(/<sheet\b[^>]*>/g) || []) {
    const xml = str(rels[attr(s, 'r:id')] || '');
    const rows = new Map();
    for (const c of xml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const open = c.match(/^<c\b[^>]*>/)[0];
      const at = cellRef(attr(open, 'r') || '');
      if (!at) continue;
      const t = attr(open, 't');
      const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let val;
      if (t === 's') val = v === undefined ? undefined : shared[Number(v)];
      else if (t === 'inlineStr') val = textOf(c);
      else if (t === 'str' || t === 'e') val = v === undefined ? undefined : unesc(v);
      else if (t === 'b') val = v;
      else val = v === undefined || v === '' ? undefined : Number(v);
      if (val === undefined || val === '') continue;
      if (!rows.has(at.row)) rows.set(at.row, new Map());
      rows.get(at.row).set(at.col, val);
    }
    sheets.push({ name: unesc(attr(s, 'name') || ''), rows });
  }
  return sheets;
}

// Excel の日付の数（1900年からの通し番号）→ 'YYYY-MM-DD'
export function excelDate(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return d.toISOString().slice(0, 10);
}

// テスト用：小さな xlsx を作る（圧縮なしの zip）。sheets は [{ name, cells: { A1: 値 } }]
export function makeXlsx(sheets) {
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const strs = [];
  const files = {
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/workbook.xml': `<?xml version="1.0"?><workbook><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships>${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
  };
  sheets.forEach((s, i) => {
    const cells = Object.entries(s.cells)
      .map(([ref, v]) => (typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${strs.push(v) - 1}</v></c>`))
      .join('');
    files[`xl/worksheets/sheet${i + 1}.xml`] = `<?xml version="1.0"?><worksheet><sheetData><row>${cells}</row></sheetData></worksheet>`;
  });
  files['xl/sharedStrings.xml'] = `<?xml version="1.0"?><sst>${strs.map((s) => `<si><t>${x(s)}</t></si>`).join('')}</sst>`;
  const locals = [];
  const central = [];
  let off = 0;
  for (const [name, body] of Object.entries(files)) {
    const nb = Buffer.from(name);
    const data = Buffer.from(body);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nb.length, 26);
    locals.push(h, nb, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nb.length, 28);
    c.writeUInt32LE(off, 42);
    central.push(c, nb);
    off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(central);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(Object.keys(files).length, 8);
  e.writeUInt16LE(Object.keys(files).length, 10);
  e.writeUInt32LE(cd.length, 12);
  e.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, e]);
}
