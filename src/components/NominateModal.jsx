import React from 'react';

// プレイヤーを1人選ぶ（ショット＝次に出す人 / 手札こうかんの相手）
export default function NominateModal({ players, selfId, onPick, onCancel, title }) {
  const targets = players.filter((p) => !p.eliminated && p.id !== selfId);
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title || '🎯 次に出す人を指名'}</h2>
        <div className="nominate-list">
          {targets.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)}>
              <span style={{ fontSize: 24 }}>{p.avatar}</span>
              <span style={{ fontWeight: 700 }}>{p.name}</span>
              <span className="small-muted" style={{ marginLeft: 'auto' }}>
                🂠 {p.hand.length}枚 ・ {'❤️'.repeat(p.lives)}
              </span>
            </button>
          ))}
        </div>
        <div className="center mt">
          <button className="btn ghost" onClick={onCancel}>
            やめる
          </button>
        </div>
      </div>
    </div>
  );
}
