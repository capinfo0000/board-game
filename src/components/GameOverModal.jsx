import React from 'react';

export default function GameOverModal({ winner, onRestart, onHome }) {
  return (
    <div className="overlay">
      <div className="modal center">
        <div className="winner-emoji">🏆</div>
        <h2>ゲーム終了！</h2>
        {winner ? (
          <p style={{ fontSize: 18 }}>
            <span style={{ fontSize: 28 }}>{winner.avatar}</span>
            <br />
            <b>{winner.name}</b> の勝利！
          </p>
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
