// Cloudflare Pages に残っている古い公開（デプロイ）を消す（推し手帳の scripts/cleanup-deployments.mjs と同じ）
// 返礼品のページは楽天の情報を毎日取り直すので、古いデプロイやPRのプレビューに、そのときの楽天の情報が残らないように、
// いまの本番以外で KEEP_DAYS 日より古いものを消す（10/22 統合の設計「古いデプロイは数日で消す」）
// 使い方：node scripts/cleanup-deployments.mjs（GitHub Actions の deploy.yml から。キーは Secrets）

const env = process.env;
const account = (env.CLOUDFLARE_ACCOUNT_ID ?? '').trim();
const token = (env.CLOUDFLARE_API_TOKEN ?? '').trim();
const project = (env.PROJECT ?? 'sakutto-keisan').trim();
const KEEP_DAYS = Number(env.KEEP_DAYS ?? 3);
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`;
const headers = { Authorization: `Bearer ${token}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (level, msg) => {
  console.log(msg);
  if (env.GITHUB_ACTIONS) console.log(`::${level} title=古い公開を消す::${msg}`);
};

const info = await fetch(base, { headers }).then((r) => r.json()).catch(() => null);
const keep = info?.result?.canonical_deployment?.id;
if (!info?.success || !keep) {
  note('warning', `プロジェクトの情報が取れませんでした（${(info?.errors ?? []).map((e) => e.message).join(' / ')}）`);
  process.exit(0);
}

const all = [];
for (let page = 1; page <= 40; page++) {
  const j = await fetch(`${base}/deployments?page=${page}&per_page=25`, { headers }).then((r) => r.json()).catch(() => null);
  const list = j?.result ?? [];
  all.push(...list);
  if (list.length < 25) break;
}

const limit = Date.now() - KEEP_DAYS * 86400000;
const old = all.filter((d) => d.id !== keep && Date.parse(d.created_on) < limit);
let done = 0;
let failed = 0;
for (const d of old) {
  const r = await fetch(`${base}/deployments/${d.id}?force=true`, { method: 'DELETE', headers }).then((x) => x.json()).catch(() => null);
  if (r?.success) done++;
  else failed++;
  await sleep(250);
}
note(failed ? 'warning' : 'notice', `デプロイ ${all.length}件のうち、${KEEP_DAYS}日より古い ${old.length}件 → 消した ${done}件${failed ? `・消せなかった ${failed}件` : ''}（いまの本番は残す）`);
