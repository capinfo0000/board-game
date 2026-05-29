import React from 'react';
import { DIFFICULTY_LABEL } from '../game/constants.js';

function Hearts({ n }) {
  if (n <= 0) return <span className="lives">☠️</span>;
  return <span className="lives">{'❤️'.repeat(n)}</span>;
}

export default function PlayerSeats({ players, currentIndex }) {
  return (
    <div className="seats">
      {players.map((p, i) => (
        <div
          key={p.id}
          className={`seat${i === currentIndex ? ' active' : ''}${
            p.eliminated ? ' eliminated' : ''
          }`}
        >
          {!p.eliminated && <span className="cardcount">{p.hand.length}</span>}
          {!p.ultimateUsed && !p.eliminated && <span className="ult" title="必殺技 未使用">🌀</span>}
          <div className="av">{p.avatar}</div>
          <div className="nm">{p.name}</div>
          <Hearts n={p.lives} />
          <div className="meta">{p.isAI ? `AI・${DIFFICULTY_LABEL[p.difficulty]}` : '人'}</div>
        </div>
      ))}
    </div>
  );
}
