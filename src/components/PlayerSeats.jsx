import React from 'react';
import { DIFFICULTY_LABEL } from '../game/constants.js';

function Lives({ n }) {
  if (n <= 0) return <span className="lives">☠️</span>;
  return <span className="lives">{'❤'.repeat(n)}</span>;
}

export default function PlayerSeats({ players, currentIndex }) {
  return (
    <div className="seats">
      {players.map((p, i) => {
        const active = i === currentIndex && !p.eliminated;
        return (
          <div
            key={p.id}
            className={`seat${active ? ' active' : ''}${p.eliminated ? ' eliminated' : ''}`}
          >
            <div className="seat-ava-wrap">
              {active && <span className="turn-ring" aria-hidden />}
              <div className="seat-ava">{p.avatar}</div>
              {!p.eliminated && <span className="cardcount">{p.hand.length}</span>}
              {!p.ultimateUsed && !p.eliminated && (
                <span className="ult-badge" title="手札まわし 未使用">
                  🔄
                </span>
              )}
            </div>
            <div className="nm">{p.name}</div>
            <Lives n={p.lives} />
            <div className="meta">{p.isAI ? `CPU・${DIFFICULTY_LABEL[p.difficulty]}` : '人'}</div>
          </div>
        );
      })}
    </div>
  );
}
