// パソコン（1080px〜）の見開きで、左の段（.pc-left）のとまる場所（10/31 連絡 C-017・#107）。layout.mjs が見開きのページに入れる
//   左の段が画面に入る → 上から14pxでとまる
//   入らない → 左の段の下のはしが画面の下から14pxにそろった所でとまる（読み進めると答えとボタンが見える）
//   答えが出る・付箋がふえる・画面の大きさが変わるたびに計算し直す。動かないときは CSS の top: 14px のまま
{
  const pcLeft = document.querySelector('.pc-left');
  const pcWide = matchMedia('(min-width: 1080px)');
  const pcFit = () => {
    if (!pcLeft) return;
    if (!pcWide.matches) { pcLeft.style.top = ''; return; }
    const h = pcLeft.offsetHeight;
    pcLeft.style.top = `${h + 28 > innerHeight ? innerHeight - h - 14 : 14}px`;
  };
  if (pcLeft) {
    pcFit();
    if (window.ResizeObserver) new ResizeObserver(pcFit).observe(pcLeft);
    addEventListener('resize', pcFit);
  }
}
