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
  privacy, // true: 覗き見防止あり（複数人）/ false: 常に手札表示
  viewerId, // privacy=false のとき、常に見せる人間プレイヤーのid
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

  // 画面下部にどのプレイヤーの手札を出すか／表向きか／操作可能か を決める
  let bottomPlayer;
  let bottomFaceUp;
  let bottomSelectable;
  if (privacy) {
    const revealed = isHumanTurn && !gateOpen;
    bottomPlayer = current;
    bottomFaceUp = revealed;
    bottomSelectable = revealed;
  } else {
    const viewer = viewerId ? game.players.find((p) => p.id === viewerId) : null;
    if (viewer) {
      bottomPlayer = viewer;
      bottomFaceUp = true;
      bottomSelectable = current?.id === viewer.id && game.phase === 'playing';
    } else {
      bottomPlayer = current;
      bottomFaceUp = false;
      bottomSelectable = false;
    }
  }

  function handleCardClick(card) {
    if (!bottomSelectable) return;
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
  } else if (bottomSelectable) {
    if (game.pendingPlays === 2) {
      banner = (
        <span className="warn">
          {current.name} の番：次の人2枚！あと {game.turnPlaysRemaining} 枚出してください
        </span>
      );
    } else {
      banner = <span>{current.name} の番！カードを選んでね</span>;
    }
  } else if (!privacy && current && !current.isAI) {
    banner = <span>{current.name} の番</span>;
  }

  const ultDisabled = !bottomSelectable || !current || current.ultimateUsed;

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
        <div className="deckinfo" title="山札が尽きたら捨て札をシャッフルして山札に戻します">
          🂠 山札 <b>{game.drawPile.length}</b> 枚 ・ 🗑 捨て札 {game.discardPile.length} 枚
        </div>
        <div className="lastplay">{game.log.length ? game.log[game.log.length - 1].text : ''}</div>
      </div>

      <LogPanel log={game.log} />

      <div className="hand-area">
        <div className="turn-banner">{banner}</div>

        <div className="hand">
          {bottomPlayer && !bottomPlayer.eliminated
            ? bottomPlayer.hand.map((card) =>
                bottomFaceUp ? (
                  <CardView
                    key={card.id}
                    card={card}
                    playable={isPlayable(card, game.total)}
                    selectable={bottomSelectable && isPlayable(card, game.total)}
                    onClick={() => handleCardClick(card)}
                  />
                ) : (
                  <CardView key={card.id} card={card} faceDown />
                ),
              )
            : null}
        </div>

        <div className="actions-bar">
          <button
            className="btn"
            disabled={ultDisabled}
            onClick={onUltimate}
            title="全員の手札を右回りで総入れ替え（1人1回・手番終了）"
          >
            🌀 必殺技{current && current.ultimateUsed ? '（使用済）' : ''}
          </button>
        </div>
      </div>

      {privacy && gateOpen && isHumanTurn && <PassScreen player={current} onReveal={onReveal} />}

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
