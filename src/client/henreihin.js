// ふるさと納税の返礼品：寄付額のマス（1万円・2万円・3万円まで・すべて）で一覧をしぼる
// 一覧はビルドのときに楽天から取ったもの。ここでは見せる行を切りかえるだけ（どこにも送らない）
const tiles = [...document.querySelectorAll('.hr-price .tile')];

function show(max) {
  tiles.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.max) === max)));
  document.querySelectorAll('.hr-group').forEach((g) => {
    let n = 0;
    g.querySelectorAll('.hr-row').forEach((r) => {
      const on = !max || Number(r.dataset.price) <= max;
      r.hidden = !on;
      if (on) n++;
    });
    const none = g.querySelector('.hr-none');
    if (none) none.hidden = n > 0;
  });
}

tiles.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.max))));
