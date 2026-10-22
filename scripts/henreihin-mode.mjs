// 返礼品のページをどう作るかを決めて、GitHub Actions の出力に書く（.github/workflows/deploy.yml から）
//   api     … HENREIHIN_LIVE が true で、楽天のキーがあるとき（本番・PRのプレビュー）
//   fixture … まだ本番でないときの PR のプレビュー（作り話の見本の商品で、見た目を確かめる）
//   off     … それ以外（本番にはまだ出さない）
import { appendFileSync } from 'node:fs';
import { HENREIHIN_LIVE } from '../src/data/henreihin.mjs';
import { rakutenKeys } from './rakuten.mjs';

const event = process.env.GITHUB_EVENT_NAME || '';
const mode = HENREIHIN_LIVE && rakutenKeys() ? 'api' : event === 'pull_request' ? 'fixture' : 'off';
console.log(`返礼品のページ：${mode}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\nlive=${HENREIHIN_LIVE ? 1 : 0}\n`);
