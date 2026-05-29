import React, { useEffect, useRef, useState } from 'react';
import { createGame, playCard, useUltimate } from '../game/engine.js';
import { chooseMove } from '../game/ai.js';
import { createHost, joinRoom } from '../net/peer.js';
import { redactStateFor } from '../net/redact.js';
import GameScreen from './GameScreen.jsx';
import GameOverModal from './GameOverModal.jsx';
import HelpModal from './HelpModal.jsx';
import BustEffect from './BustEffect.jsx';

const AVATARS = ['🦊', '🐼', '🐧', '🐸', '🐯', '🦁', '🐰', '🐻', '🐱', '🐶', '🐵', '🦄'];
const MAX = 7;

export default function OnlineGame({ onExit }) {
  // view: 'menu' | 'connecting' | 'lobby' | 'game'
  const [view, setView] = useState('menu');
  const [role, setRole] = useState(null); // 'host' | 'client'
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('プレイヤー');
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // ロビー設定（ホスト）
  const [seats, setSeats] = useState([]); // [{id,name,avatar,isAI,difficulty}]
  const [lives, setLives] = useState(1);
  const [handSize, setHandSize] = useState(3);
  const [mode, setMode] = useState('loser');

  const [game, setGame] = useState(null);
  const [myId, setMyId] = useState(null);
  const [bustInfo, setBustInfo] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const hostCtrlRef = useRef(null);
  const clientCtrlRef = useRef(null);
  const connsRef = useRef(new Map()); // conn -> playerId
  const counterRef = useRef(0);
  const gameRef = useRef(null);
  const viewRef = useRef('menu');
  const aiTimerRef = useRef(null);
  const bustSeqRef = useRef(0);
  const bustTimerRef = useRef(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => () => cleanup(), []); // unmount

  function cleanup() {
    if (hostCtrlRef.current) hostCtrlRef.current.destroy();
    if (clientCtrlRef.current) clientCtrlRef.current.destroy();
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (bustTimerRef.current) clearTimeout(bustTimerRef.current);
    hostCtrlRef.current = null;
    clientCtrlRef.current = null;
    connsRef.current = new Map();
  }

  function leaveRoom() {
    cleanup();
    onExit();
  }

  // ---------- ホスト ----------
  function broadcastState(state) {
    for (const [conn, pid] of connsRef.current.entries()) {
      try {
        conn.send({ t: 'state', game: redactStateFor(state, pid), you: pid });
      } catch (e) {
        /* noop */
      }
    }
  }

  function hostApply(playerId, action) {
    const g = gameRef.current;
    if (!g || g.phase !== 'playing') return;
    const ng =
      action.kind === 'ultimate'
        ? useUltimate(g, playerId)
        : playCard(g, playerId, action.cardId, action.choice ?? null);
    if (ng === g) return; // 無効手
    gameRef.current = ng;
    setGame(ng);
    broadcastState(ng);
  }

  function onHostData(conn, data) {
    if (!data || !data.t) return;
    if (data.t === 'hello') {
      if (viewRef.current !== 'lobby') {
        try {
          conn.send({ t: 'error', msg: 'すでに開始または終了しています' });
        } catch (e) {
          /* noop */
        }
        return;
      }
      setSeats((prev) => {
        if (prev.length >= MAX) {
          try {
            conn.send({ t: 'full' });
          } catch (e) {
            /* noop */
          }
          return prev;
        }
        counterRef.current += 1;
        const id = `r${counterRef.current}`;
        connsRef.current.set(conn, id);
        try {
          conn.send({ t: 'assigned', id });
        } catch (e) {
          /* noop */
        }
        return [
          ...prev,
          {
            id,
            name: String(data.name || 'プレイヤー').slice(0, 10),
            avatar: data.avatar || '🙂',
            isAI: false,
          },
        ];
      });
    } else if (data.t === 'action') {
      const pid = connsRef.current.get(conn);
      if (pid) hostApply(pid, data.action);
    }
  }

  function onHostClose(conn) {
    const pid = connsRef.current.get(conn);
    connsRef.current.delete(conn);
    if (!pid) return;
    if (viewRef.current === 'lobby') {
      setSeats((prev) => prev.filter((s) => s.id !== pid));
    } else if (gameRef.current) {
      // ゲーム中の切断 → AIが肩代わり
      const ng = {
        ...gameRef.current,
        players: gameRef.current.players.map((p) =>
          p.id === pid ? { ...p, isAI: true, difficulty: p.difficulty || 'normal' } : p,
        ),
      };
      gameRef.current = ng;
      setGame(ng);
      broadcastState(ng);
    }
  }

  function startHosting() {
    setError('');
    setRole('host');
    setView('connecting');
    setMyId('host');
    setSeats([{ id: 'host', name: name.trim() || 'ホスト', avatar, isAI: false }]);
    hostCtrlRef.current = createHost({
      onReady: (c) => {
        setCode(c);
        setView('lobby');
      },
      onConnection: () => {},
      onData: onHostData,
      onClose: onHostClose,
      onError: () => setError('部屋の作成に失敗しました。通信環境を確認して、もう一度お試しください。'),
    });
  }

  // ロビー変更をクライアントへ配信
  useEffect(() => {
    if (role !== 'host' || view !== 'lobby') return;
    const payload = { t: 'lobby', code, seats, settings: { lives, handSize, mode } };
    for (const conn of connsRef.current.keys()) {
      try {
        conn.send(payload);
      } catch (e) {
        /* noop */
      }
    }
  }, [role, view, seats, lives, handSize, mode, code]);

  function addAi() {
    setSeats((prev) => {
      if (prev.length >= MAX) return prev;
      counterRef.current += 1;
      return [
        ...prev,
        { id: `ai${counterRef.current}`, name: `CPU`, avatar: '🤖', isAI: true, difficulty: 'normal' },
      ];
    });
  }
  function removeSeat(id) {
    if (id === 'host') return;
    setSeats((prev) => prev.filter((s) => s.id !== id));
  }

  function hostStart() {
    const players = seats.map((s) => ({ ...s }));
    const g = createGame({ players, lives, handSize, mode });
    gameRef.current = g;
    setGame(g);
    setView('game');
    broadcastState(g);
  }

  function hostRestart() {
    const players = gameRef.current.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isAI: p.isAI,
      difficulty: p.difficulty,
    }));
    const g = createGame({ players, lives, handSize, mode });
    gameRef.current = g;
    setGame(g);
    broadcastState(g);
  }

  // ---------- クライアント ----------
  function onClientData(d) {
    if (!d || !d.t) return;
    if (d.t === 'assigned') {
      setMyId(d.id);
    } else if (d.t === 'lobby') {
      setCode(d.code);
      setSeats(d.seats);
      setLives(d.settings.lives);
      setHandSize(d.settings.handSize);
      setMode(d.settings.mode);
      setView('lobby');
    } else if (d.t === 'state') {
      if (d.you) setMyId(d.you);
      setGame(d.game);
      setView('game');
    } else if (d.t === 'full') {
      setError('その部屋は満員です（最大7人）。');
      setView('menu');
    } else if (d.t === 'error') {
      setError(d.msg || 'エラーが発生しました。');
      setView('menu');
    }
  }

  function startJoining() {
    if (!joinCode.trim()) return;
    setError('');
    setRole('client');
    setView('connecting');
    clientCtrlRef.current = joinRoom(joinCode.trim(), {
      onOpen: () => {
        clientCtrlRef.current.send({ t: 'hello', name: name.trim() || 'プレイヤー', avatar });
      },
      onData: onClientData,
      onClose: () => {
        setError('ホストとの接続が切れました。');
        setView('menu');
      },
      onError: () =>
        setError('接続できませんでした。ルームコードを確認してください（部屋が存在しないか、通信環境の問題）。'),
    });
  }

  // ---------- 共通：ホストのAI/制限時間ドライバ ----------
  useEffect(() => {
    if (role !== 'host') return undefined;
    if (!game || game.phase !== 'playing') return undefined;
    const cur = game.players[game.currentPlayerIndex];
    if (!cur || cur.eliminated) return undefined;
    const delay = cur.isAI ? 800 + Math.random() * 600 : 30000; // 人間は30秒で自動
    aiTimerRef.current = setTimeout(() => {
      const mv = chooseMove(gameRef.current);
      if (mv) hostApply(cur.id, mv);
    }, delay);
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [role, game?.turnId, game?.turnPlaysRemaining, game?.phase]);

  // ---------- 共通：バースト演出 ----------
  useEffect(() => {
    const b = game?.lastBust;
    if (!b) return;
    if (b.seq !== bustSeqRef.current) {
      bustSeqRef.current = b.seq;
      setBustInfo(b);
      if (bustTimerRef.current) clearTimeout(bustTimerRef.current);
      bustTimerRef.current = setTimeout(() => setBustInfo(null), 1600);
    }
  }, [game?.lastBust?.seq]);

  // ---------- 操作 ----------
  function handlePlay(cardId, choice) {
    if (role === 'host') hostApply(myId, { kind: 'play', cardId, choice });
    else clientCtrlRef.current.send({ t: 'action', action: { kind: 'play', cardId, choice } });
  }
  function handleUltimate() {
    if (role === 'host') hostApply(myId, { kind: 'ultimate' });
    else clientCtrlRef.current.send({ t: 'action', action: { kind: 'ultimate' } });
  }

  // ================= 描画 =================
  if (view === 'game' && game) {
    const loser = game.loserId ? game.players.find((p) => p.id === game.loserId) : null;
    const winner = game.winnerId ? game.players.find((p) => p.id === game.winnerId) : null;
    const others = game.players.filter((p) => p.id !== game.loserId && p.id !== game.winnerId);
    return (
      <div className="app">
        <GameScreen
          game={game}
          privacy={false}
          viewerId={myId}
          gateOpen={false}
          onReveal={() => {}}
          onPlay={handlePlay}
          onUltimate={handleUltimate}
          onOpenHelp={() => setShowHelp(true)}
          onHome={leaveRoom}
        />
        <BustEffect bust={bustInfo} />
        {game.phase === 'gameOver' && (
          <GameOverModal
            mode={game.mode}
            winner={winner}
            loser={loser}
            others={others}
            online
            isHost={role === 'host'}
            onRestart={hostRestart}
            onHome={leaveRoom}
          />
        )}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  return (
    <div className="app setup">
      <div className="title">
        <h1 style={{ fontSize: 32 }}>オンライン対戦</h1>
        <p>ルームコードで別々の端末と対戦 🌐</p>
      </div>

      {error && (
        <div className="card-panel" style={{ borderColor: 'var(--danger)' }}>
          <span style={{ color: 'var(--danger)' }}>⚠️ {error}</span>
        </div>
      )}

      {view === 'menu' && (
        <>
          <div className="card-panel">
            <h2>あなたの情報</h2>
            <div className="seat-row">
              <button
                className="avatar-btn"
                onClick={() => setAvatar(AVATARS[(AVATARS.indexOf(avatar) + 1) % AVATARS.length])}
                title="タップでアバター変更"
              >
                {avatar}
              </button>
              <input
                type="text"
                value={name}
                maxLength={10}
                onChange={(e) => setName(e.target.value)}
                placeholder="名前"
              />
            </div>
          </div>

          <div className="card-panel center">
            <button className="btn primary" style={{ width: '100%', fontSize: 18 }} onClick={startHosting}>
              ＋ 部屋を作る（ホスト）
            </button>
          </div>

          <div className="card-panel">
            <h2>部屋に入る</h2>
            <div className="seat-row">
              <input
                type="text"
                value={joinCode}
                maxLength={4}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ルームコード（4文字）"
                style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 800 }}
              />
              <button className="btn" onClick={startJoining} disabled={joinCode.trim().length < 4}>
                参加
              </button>
            </div>
          </div>

          <div className="center">
            <button className="btn ghost" onClick={onExit}>
              ← 戻る
            </button>
          </div>
        </>
      )}

      {view === 'connecting' && (
        <div className="card-panel center">
          <p>接続中…⏳</p>
          <p className="small-muted">数秒かかることがあります</p>
          <button className="btn ghost" onClick={leaveRoom}>
            キャンセル
          </button>
        </div>
      )}

      {view === 'lobby' && (
        <>
          <div className="card-panel center">
            <p className="small-muted" style={{ margin: 0 }}>ルームコード</p>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 8, color: 'var(--accent)' }}>
              {code || '…'}
            </div>
            <p className="small-muted">このコードを相手に伝えてね</p>
          </div>

          <div className="card-panel">
            <div className="row between">
              <h2 style={{ margin: 0 }}>参加者（{seats.length}/{MAX}）</h2>
              {role === 'host' && (
                <button className="btn ghost small" onClick={addAi} disabled={seats.length >= MAX}>
                  🤖 AIを追加
                </button>
              )}
            </div>
            {seats.map((s) => (
              <div className="seat-row" key={s.id}>
                <span className="avatar-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.avatar}
                </span>
                <span style={{ flex: 1, fontWeight: 700 }}>
                  {s.name}
                  {s.id === myId ? '（あなた）' : ''}
                  {s.isAI ? '（AI）' : ''}
                </span>
                {role === 'host' && s.isAI && (
                  <button className="remove" onClick={() => removeSeat(s.id)}>✕</button>
                )}
              </div>
            ))}
          </div>

          {role === 'host' ? (
            <>
              <div className="card-panel">
                <h2 style={{ marginTop: 0 }}>ルール設定</h2>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span>勝敗</span>
                  <div className="kind-toggle">
                    <button className={`chip${mode === 'loser' ? ' on' : ''}`} onClick={() => setMode('loser')}>
                      ひとり負け
                    </button>
                    <button className={`chip${mode === 'winner' ? ' on' : ''}`} onClick={() => setMode('winner')}>
                      ひとり勝ち
                    </button>
                  </div>
                </div>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span>ライフ</span>
                  <div className="kind-toggle">
                    {[1, 2, 3].map((n) => (
                      <button key={n} className={`chip${lives === n ? ' on' : ''}`} onClick={() => setLives(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="row between">
                  <span>手札</span>
                  <div className="kind-toggle">
                    {[3, 4, 5].map((n) => (
                      <button key={n} className={`chip${handSize === n ? ' on' : ''}`} onClick={() => setHandSize(n)}>
                        {n}枚
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card-panel center">
                <button
                  className="btn primary"
                  style={{ width: '100%', fontSize: 18 }}
                  disabled={seats.length < 2}
                  onClick={hostStart}
                >
                  ゲーム開始 ▶（{seats.length}人）
                </button>
                {seats.length < 2 && <p className="small-muted">2人以上で開始できます</p>}
              </div>
            </>
          ) : (
            <div className="card-panel center">
              <p>ホストの開始を待っています…⏳</p>
              <p className="small-muted">
                {mode === 'loser' ? 'ひとり負け' : 'ひとり勝ち'} ・ ライフ{lives} ・ 手札{handSize}枚
              </p>
            </div>
          )}

          <div className="center">
            <button className="btn ghost" onClick={leaveRoom}>
              退出
            </button>
          </div>
        </>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
