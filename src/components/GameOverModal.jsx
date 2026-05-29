import React from 'react';
import Confetti from './Confetti.jsx';

export default function GameOverModal({ winner, onRestart, onHome }) {
  return (
    <div className="overlay">
      <Confetti />
      <div className="modal center win-modal">
        <div className="win-rays" aria-hidden />
        <div className="win-trophy">🏆</div>
        <h2 className="win-title">勝者決定！</h2>
        {winner ? (
          <div className="win-player">
            <div className="win-avatar">{winner.avatar}</div>
            <div className="win-name">{winner.name}</div>
            <div className="win-sub">🎉 おめでとう！ 最後まで生き残りました 🎉</div>
          </div>
        ) : (
          <p>勝者なし</p>
        )}
        <div className="actions-bar mt">
          <button className="btn primary" onClick={onRestart}>
            もう一度（同じメンバー）
          </button>
          <button className="btn ghost" onClick={onHome}>
            メンバー編集へ
          </button>
        </div>
      </div>
    </div>
  );
}
