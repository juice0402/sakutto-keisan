// 値をえらぶ付箋の動き（10/22 しょーくん「選択されたもの以外の付箋はアニメーションで剥がれてスッキリ、選択された付箋は少しぺろっとめくれる・斜めに向く」）
// .tiles と .seg のある全ページに、layout.mjs が入れる。ページごとの計算のスクリプトにはさわらない
//   さわってえらぶ → ほかの付箋が剥がれて消え、えらんだ付箋が先頭へ。赤ペンで丸を描く（めくれと傾きは site.css）
//   えらんだ付箋をもう一度さわる → 剥がした付箋を貼り直す（計算のスクリプトには、そのタップを渡さない）
//   クリアを押したとき・えらんだものがなくなったとき → 貼り直す
//   自分で入れる付箋（?%）は、さわっても剥がさない（キーボードで入れている途中なので）
//   はじめから入っている値には、えらんだしるしを付けない（data-fresh。さわったら外し、クリアなどでもどったら付け直す）
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PEEL_MS = 480;
const STEP_MS = 45;
const resets = [];

for (const group of document.querySelectorAll('.tiles, .seg')) {
  const notes = () => [...group.children].filter((el) => el.matches('.tile, .seg-btn'));
  let picked = null;
  let busy = false;

  // 高さと、えらんだ付箋の場所を、なめらかに動かす（FLIP）
  const glide = (note, change) => {
    const h0 = group.offsetHeight;
    const r0 = note.getBoundingClientRect();
    change();
    if (still) return;
    const r1 = note.getBoundingClientRect();
    const h1 = group.offsetHeight;
    note.animate([{ translate: `${r0.left - r1.left}px ${r0.top - r1.top}px` }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' });
    group.animate([{ height: `${h0}px`, overflow: 'visible' }, { height: `${h1}px`, overflow: 'visible' }], { duration: 260, easing: 'ease-out' });
  };

  const peel = (note) => {
    const others = notes().filter((x) => x !== note && !x.hidden);
    if (!others.length) return;
    picked = note;
    busy = true;
    others.forEach((x, i) => {
      x.style.setProperty('--i', i);
      x.classList.add('is-peel');
    });
    setTimeout(
      () => {
        glide(note, () =>
          others.forEach((x) => {
            x.hidden = true;
            x.classList.remove('is-peel');
          }),
        );
        busy = false;
      },
      still ? 0 : PEEL_MS + others.length * STEP_MS,
    );
  };

  const restore = (fresh) => {
    if (fresh) group.setAttribute('data-fresh', '');
    const note = picked;
    picked = null;
    const back = notes().filter((x) => x.hidden);
    if (!back.length || !note) return;
    glide(note, () => back.forEach((x) => (x.hidden = false)));
    if (still) return;
    back.forEach((x, i) => {
      x.style.setProperty('--i', i);
      x.classList.add('is-stick');
      x.addEventListener('animationend', () => x.classList.remove('is-stick'), { once: true });
    });
  };

  // えらんだ付箋をもう一度さわったら、貼り直すだけ（計算のスクリプトには渡さない）
  group.addEventListener(
    'click',
    (e) => {
      const note = e.target.closest('.tile, .seg-btn');
      if (!note || (note !== picked && !busy)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (!busy) restore();
    },
    true,
  );

  // さわってえらんだら、計算のスクリプトが印をつけたあとに剥がす
  group.addEventListener('click', (e) => {
    const note = e.target.closest('.tile, .seg-btn');
    if (!e.isTrusted || !note) return;
    group.removeAttribute('data-fresh');
    if (note.classList.contains('tile-input')) return;
    requestAnimationFrame(() => {
      if (note.getAttribute('aria-pressed') !== 'true') return;
      note.classList.add('is-drawn');
      note.addEventListener('animationend', () => note.classList.remove('is-drawn'), { once: true });
      peel(note);
    });
  });

  // 計算のスクリプトが、えらんだものを外したり変えたりしたら、貼り直す
  new MutationObserver(() => {
    if (picked && !busy && picked.getAttribute('aria-pressed') !== 'true') restore(true);
  }).observe(group, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });

  resets.push(() => (picked && !busy ? restore(true) : group.setAttribute('data-fresh', '')));
}

// クリアを押したら、どの付箋も貼り直して、はじめの形にもどす
document.addEventListener('click', (e) => {
  if (e.target.closest('.clear-btn')) requestAnimationFrame(() => resets.forEach((f) => f()));
});
