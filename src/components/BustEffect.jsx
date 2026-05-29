import React from 'react';

// バースト時の演出（画面を覆わず、操作はブロックしない）
export default function BustEffect({ bust }) {
  if (!bust) return null;
  return (
    <div className="bust-effect" key={bust.seq}>
      <div className="bust-flash" />
      <div className="bust-card">
        <div className="bust-boom">💥</div>
        <div className="bust-title">バースト！</div>
        <div className="bust-name">
          {bust.avatar} {bust.name}
        </div>
        <div className="bust-detail">
          合計 {bust.total} で出せず ・ ライフ −1
        </div>
        {bust.eliminated ? (
          <div className="bust-out">☠️ 脱落…</div>
        ) : (
          <div className="bust-left">のこりライフ {bust.livesLeft}</div>
        )}
      </div>
    </div>
  );
}
