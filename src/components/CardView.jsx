import React from 'react';
import { KIND } from '../game/constants.js';
import { CARD_META } from '../game/cards.js';

// 1枚のカードの見た目
export default function CardView({ card, faceDown, small, playable, selectable, onClick }) {
  if (faceDown) {
    return <div className={`card back${small ? ' sm' : ''}`} aria-hidden />;
  }
  const meta = CARD_META[card.kind] || {};
  const cls = [
    'card',
    `cat-${meta.category || 'number'}`,
    small ? 'sm' : '',
    playable ? 'playable' : 'unplayable',
    selectable ? 'selectable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let big;
  if (card.kind === KIND.NUMBER) {
    big = <div className="big">{card.label}</div>;
  } else if (card.kind === KIND.MINUS) {
    big = <div className="big">{card.label}</div>;
  } else if (card.kind === KIND.SET101) {
    big = <div className="big">101</div>;
  } else {
    big = (
      <>
        <div className="ic">{meta.icon}</div>
        <div className="big" style={{ fontSize: small ? 12 : 15 }}>
          {card.label}
        </div>
      </>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={selectable ? onClick : undefined}
      disabled={!selectable}
      title={meta.desc}
    >
      {!small && <span className="corner">{card.label}</span>}
      {big}
    </button>
  );
}
