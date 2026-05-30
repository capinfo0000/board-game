import React, { useEffect, useRef, useState } from 'react';
import { createGame, playCard, useUltimate, forfeit } from './game/engine.js';
import { chooseMove } from './game/ai.js';
import { sfx, say, isSpeaking, onSpeaking } from './sound.js';
import SetupScreen from './components/SetupScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOverModal from './components/GameOverModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import HandoffReview from './components/HandoffReview.jsx';
import BustEffect from './components/BustEffect.jsx';
import RoundEndModal from './components/RoundEndModal.jsx';
import OnlineGame from './components/OnlineGame.jsx';

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
  const [screen, setScreen] = useState('setup'); // 'setup' | 'game' | 'online'
  const [seats, setSeats] = useState(null);
  const [lives, setLives] = useState(1); // 初期ライフ設定（1〜3）
  const [handSize, setHandSize] = useState(3); // 手札枚数（3〜5）
  const [mode, setMode] = useState('loser'); // 'loser'=ひとり負け / 'winner'=ひとり勝ち
  const [game, setGame] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [reviewPlayerId, setReviewPlayerId] = useState(null); // 手札確認中の（直前に出した）人間
  const [bustInfo, setBustInfo] = useState(null); // バースト演出（ゲーム終了時のフラッシュ）
  const [roundEndInfo, setRoundEndInfo] = useState(null); // ラウンド終了（バーストで区切り）
  const [speaking, setSpeaking] = useState(isSpeaking());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => onSpeaking(setSpeaking), []);

  const prevTurnRef = useRef(-1);
  const prevBustSeqRef = useRef(0);
  const aiTimerRef = useRef(null);
  const bustTimerRef = useRef(null);

  // --- ゲーム開始 ---
  function startGame(seatConfig, livesSetting, handSizeSetting, modeSetting) {
    const lv = livesSetting ?? lives;
    const hs = handSizeSetting ?? handSize;
    const md = modeSetting ?? mode;
    setSeats(seatConfig);
    setLives(lv);
    setHandSize(hs);
    setMode(md);
    const g = createGame({ players: seatConfig, lives: lv, handSize: hs, mode: md });
    prevTurnRef.current = -1;
    prevBustSeqRef.current = 0;
    setReviewPlayerId(null);
    setBustInfo(null);
    setRoundEndInfo(null);
    setGateOpen(false);
    setGame(g);
    setScreen('game');
  }

  function restart() {
    if (seats) startGame(seats, lives, handSize, mode);
  }

  function goHome() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (bustTimerRef.current) clearTimeout(bustTimerRef.current);
    setGame(null);
    setReviewPlayerId(null);
    setBustInfo(null);
    setRoundEndInfo(null);
    setScreen('setup');
  }

  // --- バーストの演出 ---
  useEffect(() => {
    const bust = game?.lastBust;
    if (!bust) return;
    if (bust.seq !== prevBustSeqRef.current) {
      prevBustSeqRef.current = bust.seq;
      sfx.bust();
      if (game.phase === 'gameOver') {
        // 最後のバースト：フラッシュ演出（このあと結果画面）
        setBustInfo(bust);
        if (bustTimerRef.current) clearTimeout(bustTimerRef.current);
        bustTimerRef.current = setTimeout(() => setBustInfo(null), 1600);
      } else {
        // まだ続く：ラウンド終了（手札を配り直して次へ）でいったん区切る
        say('バースト！');
        setRoundEndInfo(bust);
      }
    }
  }, [game?.lastBust?.seq]);

  // --- ゲーム終了時の勝利ファンファーレ ---
  useEffect(() => {
    if (game?.phase === 'gameOver') {
      const t = setTimeout(() => {
        sfx.win();
        const ln = game.loserId && game.players.find((p) => p.id === game.loserId)?.name;
        const wn = game.winnerId && game.players.find((p) => p.id === game.winnerId)?.name;
        if (ln) say(`バースト！ ${ln}の、まけ！`);
        else if (wn) say(`バースト！ ${wn}の、かち！`);
      }, 450);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [game?.phase]);

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
    if (roundEndInfo) return; // ラウンド終了の区切り中は止める
    if (speaking) return; // 読み上げ中は待つ
    const cur = game.players[game.currentPlayerIndex];
    if (!cur || !cur.isAI || cur.eliminated) return;

    const delay = 700 + Math.random() * 700;
    aiTimerRef.current = setTimeout(() => {
      if (isSpeaking()) return; // 読み上げ中なら見送り（終了時に再スケジュール）
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
  }, [game?.turnId, game?.turnPlaysRemaining, game?.phase, reviewPlayerId, roundEndInfo, speaking]);

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
  function handleForfeit() {
    setGame((g) => forfeit(g, g.players[g.currentPlayerIndex].id));
  }
  function reveal() {
    setGateOpen(false);
  }
  function passHandoff() {
    setReviewPlayerId(null);
  }
  function continueRound() {
    setRoundEndInfo(null);
  }

  if (screen === 'online') {
    return <OnlineGame onExit={() => setScreen('setup')} />;
  }

  if (screen === 'setup') {
    return (
      <div className="app">
        <SetupScreen
          onStart={startGame}
          onOpenHelp={() => setShowHelp(true)}
          onOnline={() => setScreen('online')}
          initialSeats={seats}
          initialLives={lives}
          initialHandSize={handSize}
          initialMode={mode}
        />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  const loser = game?.loserId ? game.players.find((p) => p.id === game.loserId) : null;
  const winner = game?.winnerId ? game.players.find((p) => p.id === game.winnerId) : null;
  const others = game
    ? game.players.filter((p) => p.id !== game.loserId && p.id !== game.winnerId)
    : [];
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
        onForfeit={handleForfeit}
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
      {roundEndInfo && game.phase === 'playing' && (
        <RoundEndModal bust={roundEndInfo} players={game.players} onContinue={continueRound} />
      )}
      <BustEffect bust={bustInfo} />
      {game?.phase === 'gameOver' && (
        <GameOverModal
          mode={game.mode}
          winner={winner}
          loser={loser}
          others={others}
          onRestart={restart}
          onHome={goHome}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
