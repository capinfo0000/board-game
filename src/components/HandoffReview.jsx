import React from 'react';
import CardView from './CardView.jsx';
import { isPlayable } from '../game/engine.js';

// 手番後：自動で引いたカードを確認し、画面横の「渡す」ボタンで次の人へ
export default function HandoffReview({ player, lastDrawn, total, onPass }) {
  const drawnSet = new Set(lastDrawn || []);
  return (
    <div className="handoff-overlay">
      <div className="handoff-body">
        <div className="big-av">{player.avatar}</div>
        <div className="who">{player.name} の手札</div>
        <p className="hint">
          {drawnSet.size > 0
            ? '✨ 光っているのが今ひいたカードです。'
            : '手札を確認してね。'}
          <br />
          確認できたら横の「渡す」ボタンを押してください。
        </p>
        <div className="hand handoff-hand">
          {player.hand.map((card) => (
            <div key={card.id} className={drawnSet.has(card.id) ? 'drawn-highlight' : ''}>
              <CardView card={card} playable={isPlayable(card, total)} />
            </div>
          ))}
        </div>
      </div>
      <button className="btn primary side-pass" onClick={onPass}>
        <span className="side-pass-label">次の人へ渡す</span>
        <span className="side-pass-arrow">➡️</span>
      </button>
    </div>
  );
}
