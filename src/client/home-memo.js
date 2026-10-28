import { cmUsable, cmDraw } from './choimemo.mjs';

// トップのちょいメモ：全ツールのメモを新しい順に6枚。メモがないとき・保存できない端末では何も出さない
const tmBox = document.getElementById('tm');
if (tmBox && cmUsable()) cmDraw(tmBox, null, 6);
