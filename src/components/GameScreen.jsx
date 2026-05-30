import React, { useEffect, useRef, useState } from 'react';
import { LIMIT, KIND, DIFFICULTY_LABEL } from '../game/constants.js';
import { isPlayable, directionArrow } from '../game/engine.js';
import { sfx, say, isSoundOn, setSoundOn, isSpeaking, onSpeaking } from '../sound.js';
import CardView from './CardView.jsx';
import LogPanel from './LogPanel.jsx';
import PassScreen from './PassScreen.jsx';
import NominateModal from './NominateModal.jsx';

const FX_MSG = {
  skip: '🚫 スキップ！',
  reverse: '🔄 逆まわり！',
  draw2: '➕➕ ダブル！',
  reset: '1️⃣ 場をリセット！',
  nominate: '🎯 ショット！',
  set101: '⚡ 101！',
  minus: '➖ ダウン！',
  ultimate: '🔁 手札こうかん！',
};
const SPECIAL_SOUND = ['skip', 'reverse', 'draw2', 'nominate', 'set101', 'ultimate'];
const SPECIAL_KINDS = [KIND.PASS, KIND.SKIP, KIND.DRAW2, KIND.REVERSE, KIND.RESET, KIND.NOMINATE];
const VALUE_KINDS = [KIND.NUMBER, KIND.MINUS, KIND.SET101];

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
      return 'ダブル';
    case KIND.REVERSE:
      return 'リバース';
    case KIND.RESET:
      return 'リセット';
    case KIND.NOMINATE:
      return 'ショット';
    case 'ultimate':
      return 'てふだこうかん';
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
  onForfeit,
  onOpenHelp,
  onHome,
}) {
  const [nominateCardId, setNominateCardId] = useState(null);
  const [confirmCard, setConfirmCard] = useState(null);
  const [bumpKey, setBumpKey] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(game.total);
  const [fx, setFx] = useState(null);
  const [fxKey, setFxKey] = useState(0);
  const [swapPicking, setSwapPicking] = useState(false);
  const [soundOn, setSoundOnState] = useState(isSoundOn());
  const [speaking, setSpeaking] = useState(isSpeaking());

  useEffect(() => onSpeaking(setSpeaking), []);

  const totalRef = useRef(game.total);
  const fxSeqRef = useRef(game.lastAction?.seq || 0);

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

  useEffect(() => {
    const la = game.lastAction;
    if (!la || la.seq === fxSeqRef.current) return;
    fxSeqRef.current = la.seq;
    if (la.kind === 'reset') sfx.reset();
    else if (SPECIAL_SOUND.includes(la.kind)) sfx.special();
    else sfx.card();
    if (la.kind === 'ultimate') {
      const actor = game.players.find((p) => p.id === la.playerId)?.name || '';
      say(`${actor}が手札こうかんを発動。${la.targetName || ''}と手札こうかんしました`);
    } else {
      say(readingFor(la));
    }
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

  // 読み上げ中はカードを出せない
  if (speaking) bottomSelectable = false;

  const opponents = game.players.filter((p) => !bottomPlayer || p.id !== bottomPlayer.id);

  // 楕円リング上の座標（rx,ry=中心からの割合）。clampで見切れ防止
  function ringPos(ang, rx, ry, lc, tc) {
    let left = 50 + rx * Math.cos(ang);
    let top = 50 + ry * Math.sin(ang);
    left = Math.max(lc[0], Math.min(lc[1], left));
    top = Math.max(tc[0], Math.min(tc[1], top));
    return { left: `${left}%`, top: `${top}%` };
  }
  function angleFor(j, m) {
    return ((180 + ((j + 1) * 180) / (m + 1)) * Math.PI) / 180;
  }

  function doPlay(card) {
    if (card.kind === KIND.NOMINATE) {
      setNominateCardId(card.id);
      return;
    }
    onPlay(card.id);
  }
  function handleCardClick(card) {
    if (!bottomSelectable || !isPlayable(card, game.total, game.pendingPlays)) return;
    const forcedFirst = game.pendingPlays === 2 && game.turnPlaysRemaining === 2;
    const isValue = VALUE_KINDS.includes(card.kind);
    const hasSpecial = bottomPlayer.hand.some(
      (c) => SPECIAL_KINDS.includes(c.kind) && isPlayable(c, game.total, game.pendingPlays),
    );
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
  if (speaking) banner = <span>🔊 読み上げ中…</span>;

  const ultDisabled = !bottomSelectable || !current || current.ultimateUsed;
  const selfActive = bottomPlayer && current && bottomPlayer.id === current.id && !bottomPlayer.eliminated;

  // 出せる札がなく、手札まわしが残っている → 使うか/バーストかを確認
  const myTurnActive =
    current &&
    bottomPlayer &&
    current.id === bottomPlayer.id &&
    !current.isAI &&
    !current.eliminated &&
    game.phase === 'playing' &&
    (privacy ? !gateOpen : true);
  const noPlayable = bottomPlayer ? bottomPlayer.hand.every((c) => !isPlayable(c, game.total, game.pendingPlays)) : false;
  const stuck = myTurnActive && noPlayable && current && !current.ultimateUsed;

  return (
    <div className="game">
      <div className="topbar">
        <button className="icon-btn" onClick={onHome} title="やめる／戻る">
          🏠
        </button>
        <div className="brand">ノイ</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" onClick={toggleSound} title="効果音・読み上げ ON/OFF">
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="icon-btn" onClick={onOpenHelp} title="あそびかた">
            ❓
          </button>
        </div>
      </div>

      {/* 円卓：中央に場の合計、まわりにプレイヤー */}
      <div className="table">
        <div className="felt">
          {fx && (
            <div className="fx-burst" key={fxKey}>
              {fx}
            </div>
          )}
          <div className="felt-center">
            <div className="play-area">
              <div className="pile">
                {pileCard ? (
                  <div className="pile-pop" key={la.seq}>
                    <CardView card={pileCard} playable small />
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
              🂠 <b>{game.drawPile.length}</b> ・ 🗑 {game.discardPile.length}
            </div>
          </div>
        </div>
        {opponents.map((p, j) => {
          const ang = angleFor(j, opponents.length);
          const av = ringPos(ang, 48, 48, [7, 93], [5, 56]);
          const inf = ringPos(ang, 30, 24, [16, 84], [16, 52]);
          const active = current && p.id === current.id && !p.eliminated;
          const backs = Math.min(p.hand.length, 7);
          return (
            <React.Fragment key={p.id}>
              <div
                className={`table-ava${p.eliminated ? ' eliminated' : ''}`}
                style={{ left: av.left, top: av.top }}
              >
                <div className="seat-ava-wrap opp-ava">
                  {active && <span className="turn-ring" aria-hidden />}
                  <div className="seat-ava">{p.avatar}</div>
                  {!p.ultimateUsed && !p.eliminated && <span className="ult-badge">🔁</span>}
                </div>
                <div className="opp-nm">{p.name}</div>
              </div>
              <div
                className={`table-info${active ? ' active' : ''}${p.eliminated ? ' eliminated' : ''}`}
                style={{ left: inf.left, top: inf.top }}
              >
                <div className="opp-fan" title={`${p.hand.length}枚`}>
                  {Array.from({ length: backs }).map((_, i) => (
                    <span className="mini-back" key={i} />
                  ))}
                  <span className="opp-count">{p.hand.length}</span>
                </div>
                <div className="opp-lives">{p.eliminated ? '☠️' : '❤'.repeat(p.lives)}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <LogPanel log={game.log} />

      {/* 自分 */}
      <div className="hand-area">
        {bottomPlayer && (
          <div className={`self-bar${selfActive ? ' active' : ''}`}>
            <span className="self-ava">{bottomPlayer.avatar}</span>
            <span className="self-nm">{bottomPlayer.name}</span>
            <span className="self-lives">
              {bottomPlayer.eliminated ? '☠️' : '❤'.repeat(bottomPlayer.lives)}
            </span>
            {bottomPlayer.isAI && (
              <span className="small-muted">CPU・{DIFFICULTY_LABEL[bottomPlayer.difficulty]}</span>
            )}
          </div>
        )}
        <div className="turn-banner">{banner}</div>
        <div className="hand">
          {bottomPlayer && !bottomPlayer.eliminated
            ? bottomPlayer.hand.map((card) =>
                bottomFaceUp ? (
                  <CardView
                    key={card.id}
                    card={card}
                    playable={isPlayable(card, game.total, game.pendingPlays)}
                    selectable={bottomSelectable && isPlayable(card, game.total, game.pendingPlays)}
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
            onClick={() => setSwapPicking(true)}
            title="指定したプレイヤーと手札をまるごと交換する（1人1回・交換後にカードを出す）"
          >
            🔁 手札こうかん{current && current.ultimateUsed ? '（使用済）' : ''}
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
            <p style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 700 }}>
              このまま出すと、もう1枚出すことになります。
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

      {stuck && !swapPicking && (
        <div className="overlay">
          <div className="modal center">
            <div style={{ fontSize: 42 }}>😣</div>
            <h2>出せるカードがありません</h2>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              まだ負けではありません！ <b>手札こうかん</b>で誰かと手札をまるごと交換すれば、
              出せる札が来るかもしれません。
            </p>
            <div className="actions-bar mt">
              <button className="btn primary" onClick={() => setSwapPicking(true)}>
                🔁 手札こうかんを使う
              </button>
              <button className="btn danger" onClick={onForfeit}>
                使わずにバースト
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手札こうかんの相手を選ぶ */}
      {swapPicking && current && (
        <NominateModal
          title="🔁 手札を交換する相手"
          players={game.players}
          selfId={current.id}
          onPick={(tid) => {
            setSwapPicking(false);
            onUltimate(tid);
          }}
          onCancel={() => setSwapPicking(false)}
        />
      )}
    </div>
  );
}
