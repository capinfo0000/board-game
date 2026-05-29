import React from 'react';
import Confetti from './Confetti.jsx';

export default function GameOverModal({ loser, winners, onRestart, onHome }) {
  return (
    <div className="overlay">
      <Confetti />
      <div className="modal center win-modal">
        <div className="win-rays" aria-hidden />
        <h2 className="win-title">ゲーム終了！</h2>

        {loser ? (
          <div className="lose-player">
            <div className="lose-stamp">ひとり負け</div>
            <div className="lose-avatar">{loser.avatar}</div>
            <div className="lose-name">{loser.name}</div>
            <div className="lose-sub">😵 ライフが尽きました…</div>
          </div>
        ) : (
          <p>勝敗なし</p>
        )}

        {winners && winners.length > 0 && (
          <div className="winners-row">
            <div className="winners-label">🎉 のこりはみんな勝ち 🎉</div>
            <div className="winners-list">
              {winners.map((w) => (
                <div key={w.id} className="winner-chip">
                  <span className="wc-av">{w.avatar}</span>
                  <span className="wc-nm">{w.name}</span>
                </div>
              ))}
            </div>
          </div>
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
