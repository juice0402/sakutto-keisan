// SPU（楽天市場のポイントアップのしくみ）の倍率と月の上限。楽天の公式のページで確かめたものだけ（10/23 しょーくん「SPU はしくみが複雑なので、最新情報としてすぐにページを」）
// rate は楽天市場の買い物にふえる倍率、cap は1か月の上限（ポイント）。上限が公式で確かめられないものは null（計算は上限なしにして、ページで「公式で確かめる」）
// parts の taxIn：楽天カードの通常分だけは税込（送料・ラッピング料こみ）の額にかかる。ほかは税抜
// cond はページの表に出す条件の短いまとめ（公式の文を写さず、自分の言葉で）。url はその数字を確かめたページ、checked は確かめた日
// 公式のページが変わると見張り（scripts/watch-pages.mjs spu。毎日）が Issue を立てる。確認日から90日たつとテストで止まる（tests/spu.test.mjs）

export const SPU_PAGE = 'https://event.rakuten.co.jp/campaign/point-up/everyday/point/';
const BANK = 'https://www.rakuten-bank.co.jp/campaign/spu/';
const SEC = 'https://www.rakuten-sec.co.jp/web/campaign/spu/';
const CARRIER = 'https://network.mobile.rakuten.co.jp/campaign/spu/payment/';
const TURBO = 'https://network.mobile.rakuten.co.jp/internet/turbo/campaign/spu/';
const FAMIMA = 'https://pointcard.rakuten.co.jp/campaign/spu/familymart/';
const DENKI = 'https://energy.rakuten.co.jp/info/20240301_spu.html';
const RAKUMA = 'https://rakuma.rakuten.co.jp/info/campaign/spu/';
const PASHA = 'https://pasha.rakuten.co.jp/special/campaign/spu/';

/** 楽天会員の通常の1倍（上限なし。いつも入る） */
export const SPU_BASE = 1;

export const SPU_ITEMS = [
  { id: 'card', label: '楽天カード', name: '楽天カード', rate: 2, parts: [{ rate: 1, cap: null, taxIn: true }, { rate: 1, cap: 1000 }], cond: '楽天カードで支払う。通常分の＋1は上限なし、特典分の＋1は上限1,000（プレミアムカードは5,000）', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'mobile', label: 'モバイル', name: '楽天モバイル', rate: 4, cap: 2000, cond: '対象のプランを契約して、エントリーする', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'carrier', label: 'キャリア決済', name: '楽天モバイルキャリア決済', rate: 2, cap: 1000, cond: 'Androidで月2,000円以上。エントリーする', url: CARRIER, checked: '2026-10-23' },
  { id: 'hikari', label: 'ひかり', name: 'Rakuten Turbo・楽天ひかり', rate: 2, cap: 1000, cond: '契約して、エントリーする', url: TURBO, checked: '2026-10-23' },
  { id: 'bank', label: '楽天銀行', name: '楽天銀行', rate: 0.5, cap: 1000, cond: 'カードの引き落としで＋0.3、給与や年金の受け取りで＋0.2', url: BANK, checked: '2026-10-23' },
  { id: 'toushin', label: '投資信託', name: '楽天証券（投資信託）', rate: 0.5, cap: 2000, cond: 'ポイントを1以上使って、月3万円以上', url: SEC, checked: '2026-10-23' },
  { id: 'beikabu', label: '米国株', name: '楽天証券（米国株式）', rate: 0.5, cap: 2000, cond: '円で払い、ポイントを1以上使って、月3万円以上', url: SEC, checked: '2026-10-23' },
  { id: 'wallet', label: 'ウォレット', name: '楽天ウォレット', rate: 0.5, cap: 1000, cond: '暗号資産の現物を月3万円以上', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'books', label: 'ブックス', name: '楽天ブックス', rate: 0.5, cap: 500, cond: '1回3,000円以上の注文（税込・クーポンのあと）', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'kobo', label: 'Kobo', name: '楽天Kobo', rate: 0.5, cap: 500, cond: '1回3,000円以上の注文（税込・クーポンのあと）', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'fashion', label: 'Fashion', name: 'Rakuten Fashion', rate: 0.5, cap: 1000, cond: 'アプリで1回5,000円以上の注文', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'travel', label: 'トラベル', name: '楽天トラベル', rate: 1, cap: 1000, cond: '5,000円以上を予約して旅行する（バスはのぞく）', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'beauty', label: 'ビューティ', name: '楽天ビューティ', rate: 0.5, cap: 500, cond: '3,000円以上をネットで予約して来店する', url: SPU_PAGE, checked: '2026-10-23' },
  { id: 'famima', label: 'ファミマ', name: '楽天ポイントカード＋ファミリーマート', rate: 0.5, cap: 500, cond: '楽天ポイントカードを見せて月3,000円以上', url: FAMIMA, checked: '2026-10-23' },
  { id: 'denki', label: 'でんき', name: '楽天でんき', rate: 0.5, cap: 1000, cond: '前の月の利用が5,500円以上で、カードで支払う', url: DENKI, checked: '2026-10-23' },
  { id: 'rakuma', label: 'ラクマ', name: '楽天ラクマ', rate: 0.5, cap: 500, cond: '月2,000円以上を売って、発送を通知する', url: RAKUMA, checked: '2026-10-23' },
  { id: 'pasha', label: 'Pasha', name: 'Rakuten Pasha', rate: 0.5, cap: 1000, cond: 'アイテムクーポンで月500以上を申請する', url: PASHA, checked: '2026-10-23' },
  { id: 'kdreams', label: 'Kドリームス', name: '楽天Kドリームス', rate: 0.5, cap: null, cond: '月1万円以上の車券（ワイドはのぞく）', url: SPU_PAGE, checked: '2026-10-23' },
];

/** 全部そろったときの倍率（いまは18.5倍） */
export const SPU_MAX = SPU_BASE + SPU_ITEMS.reduce((s, x) => s + x.rate, 0);

// 出典（ページの下に出す・見張りのページ）。計算の決まり（税抜・端数・月の数え方）は SPU のページ
export const SPU_SOURCES = [
  { name: '楽天市場「SPU（スーパーポイントアッププログラム）」', url: SPU_PAGE, checked: '2026-10-23', what: '倍率・上限・条件・計算のしかた' },
  { name: '楽天銀行「SPU」', url: BANK, checked: '2026-10-23', what: '楽天銀行の条件と上限' },
  { name: '楽天証券「SPU」', url: SEC, checked: '2026-10-23', what: '投資信託・米国株式の条件と上限' },
  { name: '楽天モバイル「キャリア決済のSPU」', url: CARRIER, checked: '2026-10-23', what: 'キャリア決済の条件と上限' },
  { name: '楽天モバイル「Rakuten Turbo・楽天ひかりのSPU」', url: TURBO, checked: '2026-10-23', what: 'Turbo・ひかりの上限' },
  { name: '楽天ポイントカード「ファミリーマートのSPU」', url: FAMIMA, checked: '2026-10-23', what: 'ファミリーマートの条件と上限' },
  { name: '楽天でんき「SPUのお知らせ」', url: DENKI, checked: '2026-10-23', what: '楽天でんきの条件と上限' },
  { name: '楽天ラクマ「SPU」', url: RAKUMA, checked: '2026-10-23', what: 'ラクマの条件と上限' },
  { name: 'Rakuten Pasha「SPU」', url: PASHA, checked: '2026-10-23', what: 'Pashaの条件と上限' },
];

// 5と0のつく日（楽天カードのキャンペーン。毎月5・10・15・20・25・30日。開催日ごとにエントリーして楽天カードで払うと、通常1倍＋SPUの楽天カード＋2倍に＋1倍）
// 楽天のポイントのしくみ /point/shikumi/ で使う。見張りは SPU と同じ（scripts/watch-pages.mjs spu）
export const POINT_DAY = { name: '楽天カード「5と0のつく日」', url: 'https://event.rakuten.co.jp/card/pointday/', rate: 1, cap: 1000, checked: '2026-10-23', what: '5と0のつく日の倍率・上限・エントリー' };
