import React from 'react';
import CardView from './CardView.jsx';
import { isPlayable } from '../game/engine.js';

// 手番後：引いたカードを確認してから次の人へ渡す（複数人プレイ時）
export default function HandoffReview({ player, lastDrawn, total, onPass }) {
  const drawnSet = new Set(lastDrawn || []);
  return (
    <div className="overlay">
      <div className="modal pass-screen">
        <div className="big-av">{player.avatar}</div>
        <div className="who">{player.name} の手札</div>
        <p className="hint">
          {drawnSet.size > 0 ? '✨ 光っているのが引いたカードです。' : '手札を確認してね。'}
          <br />
          確認できたら次の人へ渡してください。
        </p>
        <div className="hand" style={{ justifyContent: 'center' }}>
          {player.hand.map((card) => (
            <div key={card.id} className={drawnSet.has(card.id) ? 'drawn-highlight' : ''}>
              <CardView card={card} playable={isPlayable(card, total)} />
            </div>
          ))}
        </div>
        <button className="btn primary" style={{ fontSize: 18, marginTop: 12 }} onClick={onPass}>
          次の人へ渡す ➡️
        </button>
      </div>
    </div>
  );
}
