import React, { useEffect, useRef, useState } from 'react';
import { createGame, playCard, useUltimate } from './game/engine.js';
import { chooseMove } from './game/ai.js';
import SetupScreen from './components/SetupScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOverModal from './components/GameOverModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import HandoffReview from './components/HandoffReview.jsx';
import BustEffect from './components/BustEffect.jsx';

// 生存している人間プレイヤー
function livingHumans(g) {
  return g.players.filter((p) => !p.isAI && !p.eliminated);
}
// 覗き見防止が必要か（同一端末で人間が2人以上）
function needsPrivacy(g) {
  return livingHumans(g).length >= 2;
}
// 常に手札を見せる人間プレイヤーのid（人間が1人以下のとき）
function soloViewerId(g) {
  const humans = livingHumans(g);
  return humans.length ? humans[0].id : null;
}

export default function App() {
  const [screen, setScreen] = useState('setup'); // 'setup' | 'game'
  const [seats, setSeats] = useState(null);
  const [lives, setLives] = useState(3); // 初期ライフ設定（1〜3）
  const [game, setGame] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [reviewPlayerId, setReviewPlayerId] = useState(null); // 手札確認中の（直前に出した）人間
  const [bustInfo, setBustInfo] = useState(null); // バースト演出
  const [showHelp, setShowHelp] = useState(false);

  const prevTurnRef = useRef(-1);
  const prevBustSeqRef = useRef(0);
  const aiTimerRef = useRef(null);
  const bustTimerRef = useRef(null);

  // --- ゲーム開始 ---
  function startGame(seatConfig, livesSetting) {
    const lv = livesSetting ?? lives;
    setSeats(seatConfig);
    setLives(lv);
    const g = createGame({ players: seatConfig, lives: lv });
    prevTurnRef.current = -1;
    prevBustSeqRef.current = 0;
    setReviewPlayerId(null);
    setBustInfo(null);
    setGateOpen(false);
    setGame(g);
    setScreen('game');
  }

  function restart() {
    if (seats) startGame(seats, lives);
  }

  function goHome() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (bustTimerRef.current) clearTimeout(bustTimerRef.current);
    setGame(null);
    setReviewPlayerId(null);
    setBustInfo(null);
    setScreen('setup');
  }

  // --- バーストの演出 ---
  useEffect(() => {
    const bust = game?.lastBust;
    if (!bust) return;
    if (bust.seq !== prevBustSeqRef.current) {
      prevBustSeqRef.current = bust.seq;
      setBustInfo(bust);
      if (bustTimerRef.current) clearTimeout(bustTimerRef.current);
      bustTimerRef.current = setTimeout(() => setBustInfo(null), 1600);
    }
  }, [game?.lastBust?.seq]);

  // --- 新しい手番になったら、人間かつ覗き見防止が必要ならゲートを開く ---
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    if (game.turnId !== prevTurnRef.current) {
      prevTurnRef.current = game.turnId;
      const cur = game.players[game.currentPlayerIndex];
      setGateOpen(needsPrivacy(game) && cur && !cur.isAI && !cur.eliminated);
    }
  }, [game]);

  // --- AIの自動プレイ（手札確認中は待機）---
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    if (reviewPlayerId) return; // 手札確認の演出中は止める
    const cur = game.players[game.currentPlayerIndex];
    if (!cur || !cur.isAI || cur.eliminated) return;

    const delay = 700 + Math.random() * 700;
    aiTimerRef.current = setTimeout(() => {
      const move = chooseMove(game);
      if (!move) return;
      if (move.type === 'ultimate') {
        setGame((g) => useUltimate(g, cur.id));
      } else {
        setGame((g) => playCard(g, cur.id, move.cardId, move.choice ?? null));
      }
    }, delay);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [game?.turnId, game?.turnPlaysRemaining, game?.phase, reviewPlayerId]);

  // --- 手番終了後に「引いたカードの確認」を挟むか判定 ---
  function maybeReview(prev, next, actingId) {
    const turnEnded = next.turnId !== prev.turnId;
    const acting = next.players.find((p) => p.id === actingId);
    const bustHappened = next.players.some(
      (p, i) => p.lives < prev.players[i].lives,
    );
    if (
      turnEnded &&
      next.phase === 'playing' &&
      needsPrivacy(next) &&
      acting &&
      !acting.isAI &&
      !acting.eliminated &&
      !bustHappened
    ) {
      setReviewPlayerId(actingId);
    }
  }

  // --- 人間の操作 ---
  function handlePlay(cardId, choice) {
    const actingId = game.players[game.currentPlayerIndex].id;
    const next = playCard(game, actingId, cardId, choice ?? null);
    setGame(next);
    maybeReview(game, next, actingId);
  }
  function handleUltimate() {
    const actingId = game.players[game.currentPlayerIndex].id;
    const next = useUltimate(game, actingId);
    setGame(next);
    maybeReview(game, next, actingId);
  }
  function reveal() {
    setGateOpen(false);
  }
  function passHandoff() {
    setReviewPlayerId(null);
  }

  if (screen === 'setup') {
    return (
      <div className="app">
        <SetupScreen
          onStart={startGame}
          onOpenHelp={() => setShowHelp(true)}
          initialSeats={seats}
          initialLives={lives}
        />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  const winner = game?.winnerId ? game.players.find((p) => p.id === game.winnerId) : null;
  const privacy = game ? needsPrivacy(game) : false;
  const viewerId = game && !privacy ? soloViewerId(game) : null;
  const reviewPlayer = reviewPlayerId
    ? game.players.find((p) => p.id === reviewPlayerId)
    : null;

  return (
    <div className="app">
      <GameScreen
        game={game}
        privacy={privacy}
        viewerId={viewerId}
        gateOpen={gateOpen}
        onReveal={reveal}
        onPlay={handlePlay}
        onUltimate={handleUltimate}
        onOpenHelp={() => setShowHelp(true)}
        onHome={goHome}
      />
      {reviewPlayer && game.phase === 'playing' && (
        <HandoffReview
          player={reviewPlayer}
          lastDrawn={game.lastDrawn}
          total={game.total}
          onPass={passHandoff}
        />
      )}
      <BustEffect bust={bustInfo} />
      {game?.phase === 'gameOver' && (
        <GameOverModal winner={winner} onRestart={restart} onHome={goHome} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
