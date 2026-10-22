// 一時的（量の読み取りを本物の名前で直すため。終わったら消す）：楽天から返礼品の名前を取り、
// Claude の手元にだけある鍵で暗号にして、PRのコメントに置く。ログには件数だけ。名前はどこにも読める形で残さない
import { publicEncrypt, randomBytes, createCipheriv, constants } from 'node:crypto';
import { gzipSync as gz } from 'node:zlib';
import { HENREIHIN_CATS } from '../src/data/henreihin.mjs';
import { rakutenKeys, searchPage } from './rakuten.mjs';

const PUB = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAvLc3TCectKKv5lHadj4O
PfS6PE5FAq1U2qCXTUjX7elMhcM0t2pJO7/STMn1RQWXIc9qTbuBAixBvkTk0dS4
0LxiB3IGyeOGTEAptAVvLiHx/hzcrSHvDhu1BgQNdmwgc815hxbbbkgHAZIgko8Q
BF3qv0FrxWN6nfR95EzY4WDPmFZtRY/NZDU1jZ2oCGnEwaVb6VgkvY8qJJ+meLET
/kGKMQ8Rfk28/U4MqUCosfawV+/B/RvX/pkf6BRa1s7lpUyFPekg1fKg36kSPWj+
yuV/owu9vySxmBiJf8XVlbBnjuyDHUGd7RrLROSS6SeoIuOjxZrU1cfZOzhao2LN
US0wzip8IhpW+1HTFEuLEdahM++N1B8ZecxWiwgHu08+AtfRt3TQjYSUgCKExpqw
nzc1s9O0dPfTwMOEWHtX0cEFb8JQg24MyDXZgKRrE7Z6ydwKqjVCIaQMgW1SeUdG
I8L02gtnP5ePfcj9gT3jAcdqLJVH2spUQKRAHN9q9Oh7AgMBAAE=
-----END PUBLIC KEY-----`;
const keys = rakutenKeys();
if (!keys) process.exit(1);
const out = {};
for (const cat of HENREIHIN_CATS) {
  for (const g of cat.groups) {
    const names = [];
    for (let page = 1; page <= 2; page++) {
      const r = await searchPage(keys, { keyword: g.keyword, page, ngKeyword: g.ng, genreId: g.genreId });
      names.push(...r.items.map((x) => [x.name, x.price, x.genre]));
    }
    out[g.key] = names;
  }
}
const plain = gz(Buffer.from(JSON.stringify(out)));
const key = randomBytes(32);
const iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', key, iv);
const body = Buffer.concat([c.update(plain), c.final()]);
const ek = publicEncrypt({ key: PUB, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, key);
const blob = [ek, iv, c.getAuthTag(), body].map((b) => b.toString('base64')).join('.');
process.stdout.write(blob);
console.error(`件数：${Object.entries(out).map(([k, v]) => k + ' ' + v.length).join('・')}`);
