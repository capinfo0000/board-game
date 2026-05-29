import React from 'react';

// バーストでラウンドが区切られたときの画面（手札を配り直して次へ）
export default function RoundEndModal({ bust, players, onContinue }) {
  return (
    <div className="overlay">
      <div className="modal center">
        <div className="round-boom">💥</div>
        <h2 style={{ margin: '4px 0' }}>ラウンド終了</h2>
        <p className="round-bust">
          {bust.avatar} <b>{bust.name}</b> がバースト！（合計 {bust.total}）
          {bust.eliminated ? ' → ☠️ 脱落' : ' ライフ −1'}
        </p>

        <div className="standings">
          {players.map((p) => (
            <div key={p.id} className={`standing${p.eliminated ? ' out' : ''}`}>
              <span className="st-av">{p.avatar}</span>
              <span className="st-nm">{p.name}</span>
              <span className="st-lives">
                {p.eliminated ? '☠️ 脱落' : '❤️'.repeat(p.lives) || '—'}
              </span>
            </div>
          ))}
        </div>

        <p className="small-muted" style={{ marginBottom: 4 }}>
          手札を配り直して次のラウンドを始めます。
        </p>
        <button className="btn primary" style={{ fontSize: 17 }} onClick={onContinue}>
          次のラウンドへ ▶
        </button>
      </div>
    </div>
  );
}
