// 読みものの棚（#131）：このフォルダの `_` で始まらない .mjs を1本ずつ読み、公開日の新しい順に並べる
// 1本＝1ファイル（ひな形は _hinagata.mjs）。export default に中身、export const NUMS に本文の数字（tests/yomimono-<slug>.test.mjs で確かめる）
// 一覧・各ページ・RSS は src/pages/yomimono.mjs、計算のページの「この計算の読みもの」とトップの「読みもの」は src/parts.mjs
import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CATEGORIES } from '../site.mjs';
import { toolBySlug } from '../tools.mjs';

/** フォルダの読みものを読む（file はファイル名。slug と同じかをテストが見る） */
export async function loadYomimono(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort();
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(`${dir}/${f}`));
    out.push({ ...mod.default, file: f });
  }
  return out;
}

/** 公開日の新しい順（同じ日は更新日の新しい順、そのあと slug の順） */
export const sortNew = (list) =>
  [...list].sort((a, b) =>
    a.published !== b.published ? (a.published < b.published ? 1 : -1) : a.updated !== b.updated ? (a.updated < b.updated ? 1 : -1) : a.slug < b.slug ? -1 : 1,
  );

let shelf = sortNew(await loadYomimono(dirname(fileURLToPath(import.meta.url))));

/** いま棚にある読みもの（新しい順） */
export const yomimono = () => shelf;
/** テストで見本の読みものに入れかえる（本番のビルドでは使わない） */
export const setYomimono = (list) => {
  shelf = sortNew(list);
};

// 書いた読みものの点検（tests/yomimono.test.mjs）。まちがいの文の並びを返す
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// 全角1・半角0.55で数える（scripts/verify-dist.mjs と同じ）
export const textWidth = (t) => [...t].reduce((w, c) => w + (/[\x20-\x7e]/.test(c) ? 0.55 : 1), 0);
export function checkYomimono(y) {
  const err = [];
  const need = (k, ok) => {
    if (!ok) err.push(`${y.slug || y.file}: ${k} がない・形がちがう`);
  };
  need('slug', typeof y.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(y.slug));
  need('title', typeof y.title === 'string' && y.title.length > 0);
  need('lead（1行・全角21字まで）', typeof y.lead === 'string' && y.lead.length > 0 && textWidth(y.lead) <= 21);
  need('category', CATEGORIES.some((c) => c.id === y.category));
  need('tools', Array.isArray(y.tools) && y.tools.length > 0);
  for (const s of y.tools || []) if (!toolBySlug(s)?.published) err.push(`${y.slug}: tools の ${s} が公開中の計算でない`);
  need('published', DATE.test(y.published || ''));
  need('updated（published より前でない）', DATE.test(y.updated || '') && y.updated >= (y.published || ''));
  const w = textWidth(y.description || '');
  if (w < 80 || w > 120) err.push(`${y.slug}: description が全角80〜120字でない（${w.toFixed(1)}）`);
  if (!/\d/.test(y.description || '')) err.push(`${y.slug}: description に数字がない`);
  need('body', typeof y.body === 'string' && y.body.includes('<section class="prose"'));
  need('faqs（0〜3問）', Array.isArray(y.faqs) && y.faqs.length <= 3 && y.faqs.every((f) => f.q && f.a));
  need('sources', Array.isArray(y.sources) && y.sources.length > 0);
  for (const s of y.sources || []) {
    if (!s.name || !s.what || !/^https:\/\//.test(s.url || '') || !DATE.test(s.checked || '')) err.push(`${y.slug}: 出典に name・url・checked・what がそろっていない: ${s.name || s.url}`);
  }
  return err;
}
