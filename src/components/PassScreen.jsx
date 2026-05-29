import React from 'react';

// 端末を受け取ったプレイヤーの本人確認画面
export default function PassScreen({ player, onReveal }) {
  return (
    <div className="overlay">
      <div className="modal pass-screen">
        <p className="hint">📱 端末を次の人へ渡してください</p>
        <div className="big-av">{player.avatar}</div>
        <div className="who">あなたは {player.name} さんですか？</div>
        <p className="hint">本人だけがタップしてください（覗き見防止）</p>
        <button className="btn primary" style={{ fontSize: 18 }} onClick={onReveal}>
          はい、{player.name} です 👀（手札を見る）
        </button>
      </div>
    </div>
  );
}
