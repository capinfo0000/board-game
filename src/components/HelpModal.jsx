import React from 'react';
import { LIMIT, START_LIVES, HAND_SIZE } from '../game/constants.js';

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
  ['➕➕ 次2枚', '次の人は強制で2枚出す。受けた人が特殊カードを出せば1枚でOK（2枚出す番は次の人へ）。数字・±・101なら2枚必要。2枚出したターンに引けるのは1枚'],
  ['🔄 リバース', '順番を逆にする（2人時は実質スキップ）'],
  ['1️⃣ リセット', '場の合計を1に戻す'],
  ['🎯 指名', '次に出す人を指名する（自分以外）'],
];

export default function HelpModal({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>遊び方</h2>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          手札からカードを1枚出して、場の合計を増やしていきます。合計が
          <b> {LIMIT} を超える</b>札しか出せなくなったら<b>バースト</b>（ライフ−1）。
          ライフ（最初は{START_LIVES}）が0になると脱落し、<b>最後の1人が勝ち</b>です。
          カードを出したら手番の終わりに山札から1枚引きます（通常は手札{HAND_SIZE}枚をキープ）。
          山札が尽きたら、捨て札をシャッフルして山札に戻します。
        </p>

        <h3>🌀 必殺技（1人1回）</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          自分の手番に発動すると、全員の手札を右回りで総入れ替え。発動したらその手番は終了します。
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
