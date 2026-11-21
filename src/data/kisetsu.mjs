// トップの「◯月の計算」（#188）：月ごとに出す計算の slug（上から順）。ビルドした日の日本時間の月で src/pages/index.mjs が出す
// 11/4 しょーくん OK の考え方「冬は灯油・電気毛布・こたつ、12月はふるさと納税の締め切りなど」でチャットが作った表
// その月の「よく使う計算」（pick・pickSeason）に出るものは入れない（ふるさと納税の上限 furusato は11・12月に pickSeason で出る）
// 下のページ（parent のあるもの）もここには入れてよい。変えるときは docs/sodateru.md の #188 の表もそろえる
export const KISETSU = {
  1: ['touyu-dai', 'kotatsu', 'denki-moufu', 'yakudoshi'],
  2: ['touyu-dai', 'kotatsu', 'denki-moufu', 'hot-carpet'],
  3: ['gakureki', 'touyu-dai', 'kotatsu', 'yukyu-fuyo'],
  4: ['gakureki', 'yukyu-fuyo', 'zangyo-dai', 'wareki'],
  5: ['yukyu-fuyo', 'denki-dai', 'zangyo-dai', 'recipe'],
  6: ['denki-dai', 'mentsuyu', 'zangyo-dai', 'enbun-noudo'],
  7: ['mentsuyu', 'denki-dai', 'enbun-noudo', 'recipe'],
  8: ['mentsuyu', 'denki-dai', 'recipe', 'ekihi'],
  9: ['choju', 'denki-dai', 'mentsuyu', 'ekihi'],
  10: ['touyu-dai', 'shichigosan', 'denki-moufu', 'kotatsu'],
  11: ['shichigosan', 'touyu-dai', 'denki-moufu', 'kotatsu'],
  12: ['furusato-shimekiri', 'touyu-dai', 'kotatsu', 'denki-moufu'],
};
