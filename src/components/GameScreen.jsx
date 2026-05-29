import React, { useEffect, useState } from 'react';
import { LIMIT, KIND } from '../game/constants.js';
import { isPlayable, directionArrow } from '../game/engine.js';
import CardView from './CardView.jsx';
import PlayerSeats from './PlayerSeats.jsx';
import LogPanel from './LogPanel.jsx';
import PassScreen from './PassScreen.jsx';
import NominateModal from './NominateModal.jsx';

export default function GameScreen({
  game,
  gateOpen,
  onReveal,
  onPlay,
  onUltimate,
  onOpenHelp,
  onHome,
}) {
  const [nominateCardId, setNominateCardId] = useState(null);
  const [bumpKey, setBumpKey] = useState(0);

  // 合計が変わったらアニメーション
  useEffect(() => {
    setBumpKey((k) => k + 1);
  }, [game.total]);

  const current = game.players[game.currentPlayerIndex];
  const isHumanTurn = current && !current.isAI && !current.eliminated;
  const revealed = isHumanTurn && !gateOpen;

  function handleCardClick(card) {
    if (!revealed) return;
    if (!isPlayable(card, game.total)) return;
    if (card.kind === KIND.NOMINATE) {
      setNominateCardId(card.id);
      return;
    }
    onPlay(card.id);
  }

  function handleNominatePick(targetId) {
    const id = nominateCardId;
    setNominateCardId(null);
    onPlay(id, { targetId });
  }

  const hot = game.total >= LIMIT - 10;

  // 手番バナー
  let banner = null;
  if (current?.isAI) {
    banner = <span>🤖 {current.name} が考えています…</span>;
  } else if (revealed) {
    if (game.pendingPlays === 2) {
      banner = (
        <span className="warn">
          {current.name} の番：次の人2枚！あと {game.turnPlaysRemaining} 枚出してください
        </span>
      );
    } else {
      banner = <span>{current.name} の番！カードを選んでね</span>;
    }
  }

  const showHandFaces = revealed;

  return (
    <div className="game">
      <div className="topbar">
        <button className="icon-btn" onClick={onHome} title="メンバー編集へ戻る">
          🏠
        </button>
        <div className="small-muted">ノイ NEU</div>
        <button className="icon-btn" onClick={onOpenHelp} title="遊び方">
          ❓
        </button>
      </div>

      <PlayerSeats players={game.players} currentIndex={game.currentPlayerIndex} />

      <div className="board">
        <div className="total-label">場の合計</div>
        <div key={bumpKey} className={`total bump${hot ? ' hot' : ''}`}>
          {game.total}
          <span className="lim"> / {LIMIT}</span>
        </div>
        <div className="dir">
          順番 {directionArrow(game)} {game.direction === 1 ? '時計回り' : '反時計回り'}
        </div>
        <div className="lastplay">{game.log.length ? game.log[game.log.length - 1].text : ''}</div>
      </div>

      <LogPanel log={game.log} />

      <div className="hand-area">
        <div className="turn-banner">{banner}</div>

        <div className="hand">
          {showHandFaces
            ? current.hand.map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  playable={isPlayable(card, game.total)}
                  selectable={isPlayable(card, game.total)}
                  onClick={() => handleCardClick(card)}
                />
              ))
            : current && !current.eliminated
            ? current.hand.map((c) => <CardView key={c.id} card={c} faceDown />)
            : null}
        </div>

        <div className="actions-bar">
          <button
            className="btn"
            disabled={!revealed || current.ultimateUsed}
            onClick={onUltimate}
            title="全員の手札を右回りで総入れ替え（1人1回・手番終了）"
          >
            🌀 必殺技{current && current.ultimateUsed ? '（使用済）' : ''}
          </button>
        </div>
      </div>

      {gateOpen && isHumanTurn && <PassScreen player={current} onReveal={onReveal} />}

      {nominateCardId && (
        <NominateModal
          players={game.players}
          selfId={current.id}
          onPick={handleNominatePick}
          onCancel={() => setNominateCardId(null)}
        />
      )}
    </div>
  );
}
