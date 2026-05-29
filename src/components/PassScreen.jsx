import React from 'react';

// 同一端末プレイ時の覗き見防止画面
export default function PassScreen({ player, onReveal }) {
  return (
    <div className="overlay">
      <div className="modal pass-screen">
        <div className="big-av">{player.avatar}</div>
        <div className="who">{player.name} の番</div>
        <p className="hint">端末を渡してね。準備ができたらタップ。</p>
        <button className="btn primary" style={{ fontSize: 18 }} onClick={onReveal}>
          タップして手札を見る 👀
        </button>
      </div>
    </div>
  );
}
