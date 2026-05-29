import React, { useEffect, useRef, useState } from 'react';
import { createGame, playCard, useUltimate } from './game/engine.js';
import { chooseMove } from './game/ai.js';
import SetupScreen from './components/SetupScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import GameOverModal from './components/GameOverModal.jsx';
import HelpModal from './components/HelpModal.jsx';

export default function App() {
  const [screen, setScreen] = useState('setup'); // 'setup' | 'game'
  const [seats, setSeats] = useState(null);
  const [game, setGame] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const prevTurnRef = useRef(-1);
  const aiTimerRef = useRef(null);

  // --- ゲーム開始 ---
  function startGame(seatConfig) {
    setSeats(seatConfig);
    const g = createGame({ players: seatConfig });
    prevTurnRef.current = -1;
    setGame(g);
    setScreen('game');
  }

  function restart() {
    if (seats) startGame(seats);
  }

  function goHome() {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGame(null);
    setScreen('setup');
  }

  // --- 新しい手番になったら、人間なら覗き見防止ゲートを開く ---
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    if (game.turnId !== prevTurnRef.current) {
      prevTurnRef.current = game.turnId;
      const cur = game.players[game.currentPlayerIndex];
      // 人間の新しい手番 → ゲート表示（前の人の手札を隠す）
      setGateOpen(cur && !cur.isAI && !cur.eliminated);
    }
  }, [game]);

  // --- AIの自動プレイ ---
  useEffect(() => {
    if (!game || game.phase !== 'playing') return;
    const cur = game.players[game.currentPlayerIndex];
    if (!cur || !cur.isAI || cur.eliminated) return;

    // 思考の「間」を演出（難易度や状況で少し変える）
    const delay = 700 + Math.random() * 700;
    aiTimerRef.current = setTimeout(() => {
      const move = chooseMove(game);
      if (!move) return; // 出せない場合はエンジンが自動処理済み
      if (move.type === 'ultimate') {
        setGame((g) => useUltimate(g, cur.id));
      } else {
        setGame((g) => playCard(g, cur.id, move.cardId, move.choice ?? null));
      }
    }, delay);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
    // turnId と残り枚数の両方を見て、2枚出し（次の人2枚）にも対応
  }, [game?.turnId, game?.turnPlaysRemaining, game?.phase]);

  // --- 人間の操作 ---
  function handlePlay(cardId, choice) {
    setGame((g) => playCard(g, g.players[g.currentPlayerIndex].id, cardId, choice ?? null));
  }
  function handleUltimate() {
    setGame((g) => useUltimate(g, g.players[g.currentPlayerIndex].id));
  }
  function reveal() {
    setGateOpen(false);
  }

  if (screen === 'setup') {
    return (
      <div className="app">
        <SetupScreen
          onStart={startGame}
          onOpenHelp={() => setShowHelp(true)}
          initialSeats={seats}
        />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  const winner = game?.winnerId ? game.players.find((p) => p.id === game.winnerId) : null;

  return (
    <div className="app">
      <GameScreen
        game={game}
        gateOpen={gateOpen}
        onReveal={reveal}
        onPlay={handlePlay}
        onUltimate={handleUltimate}
        onOpenHelp={() => setShowHelp(true)}
        onHome={goHome}
      />
      {game?.phase === 'gameOver' && (
        <GameOverModal winner={winner} onRestart={restart} onHome={goHome} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
