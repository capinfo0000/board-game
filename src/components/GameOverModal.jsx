import React from 'react';
import Confetti from './Confetti.jsx';

function PlayerChips({ players }) {
  return (
    <div className="winners-list">
      {players.map((p) => (
        <div key={p.id} className="winner-chip">
          <span className="wc-av">{p.avatar}</span>
          <span className="wc-nm">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function GameOverModal({ mode, winner, loser, others, onRestart, onHome }) {
  const isWinnerMode = mode === 'winner';
  return (
    <div className="overlay">
      <Confetti />
      <div className="modal center win-modal">
        <div className="win-rays" aria-hidden />
        <h2 className="win-title">ゲーム終了！</h2>

        {isWinnerMode ? (
          // ひとり勝ち
          winner ? (
            <div className="win-player">
              <div className="win-trophy">🏆</div>
              <div className="win-avatar">{winner.avatar}</div>
              <div className="win-name">{winner.name}</div>
              <div className="win-sub">🎉 最後まで生き残って優勝！ 🎉</div>
            </div>
          ) : (
            <p>勝者なし</p>
          )
        ) : // ひとり負け
        loser ? (
          <div className="lose-player">
            <div className="lose-stamp">ひとり負け</div>
            <div className="lose-avatar">{loser.avatar}</div>
            <div className="lose-name">{loser.name}</div>
            <div className="lose-sub">😵 ライフが尽きました…</div>
          </div>
        ) : (
          <p>勝敗なし</p>
        )}

        {others && others.length > 0 && (
          <div className="winners-row">
            <div className="winners-label">
              {isWinnerMode ? '☠️ 脱落したみんな' : '🎉 のこりはみんな勝ち 🎉'}
            </div>
            <PlayerChips players={others} />
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
