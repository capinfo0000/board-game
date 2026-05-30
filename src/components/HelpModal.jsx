import React from 'react';
import { LIMIT } from '../game/constants.js';

const CARD_HELP = [
  ['1〜9', 'その数字を足す'],
  ['10', '+10'],
  ['J', '+20'],
  ['Q', '+30'],
  ['K', '+40'],
  ['−10 / −20', '場の合計を下げる（0で止まる）'],
  ['101 ⚡', '場の合計を一気に101にする'],
  ['⏭ パス', '合計を変えずに手番を終える'],
  ['🚫 スキップ', '次の人を飛ばす'],
  ['➕➕ ダブル', '次の人は強制で2枚出す。受けた人が特殊カードを出せば1枚でOK（2枚出す番は次の人へ／ダブルでは返せない）。数字・±・101なら2枚必要。2枚出したターンに引けるのは1枚'],
  ['🔄 リバース', '順番を逆にする（2人時は実質スキップ）'],
  ['1️⃣ リセット', '場の合計を1に戻す'],
  ['🎯 ショット', '次に出す人を指名する（自分以外）'],
];

export default function HelpModal({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>遊び方</h2>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          手札からカードを1枚出して、場の合計を増やしていきます。合計が
          <b> {LIMIT} を超える</b>札しか出せなくなったら<b>バースト</b>（ライフ−1）。
          このゲームは<b>ひとり負けを決めるゲーム</b>。最初にライフ（開始時に1〜3で設定）が
          0になった人が<b>ひとり負け</b>で、その時点でゲーム終了です（のこりは全員勝ち）。
          カードを出したら手番の終わりに山札から1枚引きます（手札の枚数は3〜5枚で設定）。
          山札が尽きたら、捨て札をシャッフルして山札に戻します。
        </p>

        <h3>🔁 手札こうかん（1人1回）</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          自分の手番に使うと、<b>指定したプレイヤーと手札をまるごと交換</b>します。
          <b>交換したあとは、続けてカードを出します</b>。
          出せるカードが無いときの立て直しにも使えます。
        </p>

        <h3>カード一覧</h3>
        <div className="help-list">
          {CARD_HELP.map(([k, v]) => (
            <div className="help-row" key={k}>
              <span className="k">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>

        <div className="center mt">
          <button className="btn primary" onClick={onClose}>
            とじる
          </button>
        </div>
      </div>
    </div>
  );
}
