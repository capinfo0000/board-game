import React from 'react';
import { KIND } from '../game/constants.js';
import { CARD_META } from '../game/cards.js';

// 1枚のカードの見た目（トランプ風：左上タグ・中央に大きく・右下に逆さタグ）
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

  let tag; // 四隅に出す短いタグ
  let center; // 中央の大きな表示
  if (card.kind === KIND.NUMBER) {
    const isFace = card.label === 'J' || card.label === 'Q' || card.label === 'K';
    tag = card.label;
    center = <div className="big">{isFace ? card.value : card.label}</div>;
  } else if (card.kind === KIND.MINUS) {
    tag = card.label;
    center = <div className="big">{card.label}</div>;
  } else if (card.kind === KIND.SET101) {
    tag = '101';
    center = <div className="big">101</div>;
  } else {
    // 特殊カード（パス・スキップ・ダブル・リバース・リセット・ショット）は中央を文字だけに
    tag = meta.icon;
    center = <div className="cname-only">{card.label}</div>;
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={selectable ? onClick : undefined}
      disabled={!selectable}
      title={`${card.label}${meta.desc ? `：${meta.desc}` : ''}`}
    >
      {!small && <span className="corner tl">{tag}</span>}
      {center}
      {!small && <span className="corner br">{tag}</span>}
    </button>
  );
}
