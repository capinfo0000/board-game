import React, { useEffect, useRef, useState } from 'react';
import { LIMIT, KIND } from '../game/constants.js';
import { isPlayable, directionArrow } from '../game/engine.js';
import { sfx, say, isSoundOn, setSoundOn } from '../sound.js';
import CardView from './CardView.jsx';
import PlayerSeats from './PlayerSeats.jsx';
import LogPanel from './LogPanel.jsx';
import PassScreen from './PassScreen.jsx';
import NominateModal from './NominateModal.jsx';

const FX_MSG = {
  skip: '🚫 スキップ！',
  reverse: '🔄 逆まわり！',
  draw2: '➕➕ 次の人 2枚！',
  reset: '1️⃣ 場をリセット！',
  nominate: '🎯 指名！',
  set101: '⚡ 101！',
  minus: '➖ ダウン！',
  ultimate: '🌀 手札まわし！',
};
const SPECIAL_SOUND = ['skip', 'reverse', 'draw2', 'nominate', 'set101', 'ultimate'];
// 1枚でOKになる特殊カード（プラスマイナスに関わらない）
const SPECIAL_KINDS = [KIND.PASS, KIND.SKIP, KIND.DRAW2, KIND.REVERSE, KIND.RESET, KIND.NOMINATE];
const VALUE_KINDS = [KIND.NUMBER, KIND.MINUS, KIND.SET101];

// 読み上げ用テキスト
const NUM_READ = {
  1: 'いち', 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご', 6: 'ろく', 7: 'なな', 8: 'はち',
  9: 'きゅう', 10: 'じゅう', 20: 'にじゅう', 30: 'さんじゅう', 40: 'よんじゅう',
};
function readingFor(la) {
  switch (la.kind) {
    case KIND.NUMBER:
      return NUM_READ[la.value] || String(la.value);
    case KIND.MINUS:
      return la.value === -20 ? 'マイナスにじゅう' : 'マイナスじゅう';
    case KIND.SET101:
      return 'ひゃくいち';
    case KIND.PASS:
      return 'パス';
    case KIND.SKIP:
      return 'スキップ';
    case KIND.DRAW2:
      return 'つぎのひと、にまい';
    case KIND.REVERSE:
      return 'リバース';
    case KIND.RESET:
      return 'リセット';
    case KIND.NOMINATE:
      return 'しめい';
    case 'ultimate':
      return 'てふだまわし';
    default:
      return '';
  }
}

export default function GameScreen({
  game,
  privacy,
  viewerId,
  gateOpen,
  onReveal,
  onPlay,
  onUltimate,
  onOpenHelp,
  onHome,
}) {
  const [nominateCardId, setNominateCardId] = useState(null);
  const [confirmCard, setConfirmCard] = useState(null); // 2枚出し警告中のカード
  const [bumpKey, setBumpKey] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(game.total);
  const [fx, setFx] = useState(null);
  const [fxKey, setFxKey] = useState(0);
  const [soundOn, setSoundOnState] = useState(isSoundOn());

  const totalRef = useRef(game.total);
  const fxSeqRef = useRef(game.lastAction?.seq || 0);

  // 合計のカウントアップ＆バウンド
  useEffect(() => {
    const from = totalRef.current;
    const to = game.total;
    totalRef.current = to;
    setBumpKey((k) => k + 1);
    if (from === to) {
      setDisplayTotal(to);
      return undefined;
    }
    const dur = 350;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setDisplayTotal(Math.round(from + (to - from) * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [game.total]);

  // カード／特殊エフェクト＋効果音
  useEffect(() => {
    const la = game.lastAction;
    if (!la || la.seq === fxSeqRef.current) return;
    fxSeqRef.current = la.seq;
    if (la.kind === 'reset') sfx.reset();
    else if (SPECIAL_SOUND.includes(la.kind)) sfx.special();
    else sfx.card();
    say(readingFor(la)); // 出したカードを読み上げ
    const msg = FX_MSG[la.kind];
    if (msg) {
      setFx(msg);
      setFxKey((k) => k + 1);
    }
  }, [game.lastAction?.seq]);

  const current = game.players[game.currentPlayerIndex];
  const isHumanTurn = current && !current.isAI && !current.eliminated;

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

  function doPlay(card) {
    if (card.kind === KIND.NOMINATE) {
      setNominateCardId(card.id);
      return;
    }
    onPlay(card.id);
  }
  function handleCardClick(card) {
    if (!bottomSelectable || !isPlayable(card, game.total)) return;
    // 2枚出しの1枚目で、特殊カードがあるのにプラスマイナス系を出そうとしたら警告
    const forcedFirst = game.pendingPlays === 2 && game.turnPlaysRemaining === 2;
    const isValue = VALUE_KINDS.includes(card.kind);
    const hasSpecial = bottomPlayer.hand.some((c) => SPECIAL_KINDS.includes(c.kind));
    if (forcedFirst && isValue && hasSpecial) {
      setConfirmCard(card);
      return;
    }
    doPlay(card);
  }
  function handleNominatePick(targetId) {
    const id = nominateCardId;
    setNominateCardId(null);
    onPlay(id, { targetId });
  }
  function toggleSound() {
    const v = !soundOn;
    setSoundOn(v);
    setSoundOnState(v);
  }

  const hot = game.total >= LIMIT - 15;
  const pct = Math.max(0, Math.min(100, (game.total / LIMIT) * 100));

  // 場に出た直前のカード（lastActionから復元。必殺技は除く）
  const la = game.lastAction;
  const pileCard =
    la && la.kind && la.kind !== 'ultimate'
      ? { id: 'pile', kind: la.kind, value: la.value ?? 0, label: la.label ?? '' }
      : null;

  let banner = null;
  if (current?.isAI) {
    banner = <span>🤖 {current.name} が考えています…</span>;
  } else if (bottomSelectable) {
    banner =
      game.pendingPlays === 2 ? (
        <span className="warn">
          {current.name} の番：あと {game.turnPlaysRemaining} 枚 出してください
        </span>
      ) : (
        <span>{current.name} の番！ カードを選んでね</span>
      );
  } else if (!privacy && current && !current.isAI) {
    banner = <span>{current.name} の番</span>;
  }

  const ultDisabled = !bottomSelectable || !current || current.ultimateUsed;

  return (
    <div className="game">
      <div className="topbar">
        <button className="icon-btn" onClick={onHome} title="やめる／戻る">
          🏠
        </button>
        <div className="brand">ノイ</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" onClick={toggleSound} title="効果音 ON/OFF">
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="icon-btn" onClick={onOpenHelp} title="あそびかた">
            ❓
          </button>
        </div>
      </div>

      <PlayerSeats players={game.players} currentIndex={game.currentPlayerIndex} />

      <div className="board">
        {fx && (
          <div className="fx-burst" key={fxKey}>
            {fx}
          </div>
        )}
        <div className="play-area">
          <div className="pile">
            {pileCard ? (
              <div className="pile-pop" key={la.seq}>
                <CardView card={pileCard} playable />
              </div>
            ) : (
              <div className="pile-empty" />
            )}
          </div>
          <div className="total-block">
            <div className="total-label">場の合計</div>
            <div key={bumpKey} className={`total bump${hot ? ' hot' : ''}`}>
              {displayTotal}
              <span className="lim"> / {LIMIT}</span>
            </div>
            <div className="gauge">
              <div className={`gauge-fill${hot ? ' warn' : ''}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="dir">
          {directionArrow(game)} {game.direction === 1 ? '時計回り' : '反時計回り'}
        </div>
        <div className="deckinfo" title="山札が尽きたら捨て札をシャッフルして山札に戻します">
          🂠 山札 <b>{game.drawPile.length}</b> ・ 🗑 {game.discardPile.length}
        </div>
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
            title="全員の手札を右どなりへ回す（1人1回・使うと手番終了）"
          >
            🔄 手札まわし{current && current.ultimateUsed ? '（使用済）' : ''}
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

      {confirmCard && (
        <div className="overlay" onClick={() => setConfirmCard(null)}>
          <div className="modal center" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h2>2枚出しになります</h2>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              この札（プラス・マイナス系）を出すと、続けて<b>もう1枚</b>出すことになります。
              <br />
              <b>特殊カード</b>（スキップ・リバース・リセット・パス・指名・次2枚）を出せば
              <b>1枚で済み</b>、2枚出す番は次の人へ移ります。
            </p>
            <div className="actions-bar mt">
              <button
                className="btn"
                onClick={() => {
                  const c = confirmCard;
                  setConfirmCard(null);
                  doPlay(c);
                }}
              >
                このまま出す（2枚）
              </button>
              <button className="btn primary" onClick={() => setConfirmCard(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
