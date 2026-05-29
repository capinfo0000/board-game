import React, { useState } from 'react';
import { MIN_PLAYERS, MAX_PLAYERS, DIFFICULTY } from '../game/constants.js';

const AVATARS = ['🦊', '🐼', '🐧', '🐸', '🐯', '🦁', '🐰', '🐻', '🐱', '🐶', '🐵', '🦄'];
const DEFAULT_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4', 'プレイヤー5', 'プレイヤー6', 'プレイヤー7'];

function makeSeat(i, isAI) {
  return {
    id: `p${i}`,
    name: isAI ? `CPU${i}` : DEFAULT_NAMES[i] || `プレイヤー${i + 1}`,
    avatar: AVATARS[i % AVATARS.length],
    isAI,
    difficulty: DIFFICULTY.NORMAL,
  };
}

export default function SetupScreen({
  onStart,
  onOpenHelp,
  initialSeats,
  initialLives,
  initialHandSize,
}) {
  const [seats, setSeats] = useState(
    initialSeats || [makeSeat(0, false), makeSeat(1, true)],
  );
  const [lives, setLives] = useState(initialLives || 3);
  const [handSize, setHandSize] = useState(initialHandSize || 5);
  const [avatarPickerFor, setAvatarPickerFor] = useState(null);

  function update(i, patch) {
    setSeats((s) => s.map((seat, idx) => (idx === i ? { ...seat, ...patch } : seat)));
  }
  function addSeat() {
    if (seats.length >= MAX_PLAYERS) return;
    setSeats((s) => [...s, makeSeat(s.length, true)]);
  }
  function removeSeat(i) {
    if (seats.length <= MIN_PLAYERS) return;
    setSeats((s) => s.filter((_, idx) => idx !== i));
  }

  const canStart = seats.length >= MIN_PLAYERS && seats.every((s) => s.name.trim());

  return (
    <div className="setup">
      <div className="title">
        <h1>ノイ</h1>
        <p>NEU ・ カードゲーム</p>
      </div>

      <div className="card-panel">
        <div className="row between">
          <h2 style={{ margin: 0 }}>メンバー（{seats.length}人）</h2>
          <button className="btn ghost small" onClick={onOpenHelp}>
            遊び方 ❓
          </button>
        </div>

        {seats.map((seat, i) => (
          <div className="seat-row" key={seat.id}>
            <button
              className="avatar-btn"
              onClick={() => setAvatarPickerFor(avatarPickerFor === i ? null : i)}
            >
              {seat.avatar}
            </button>
            <input
              type="text"
              value={seat.name}
              maxLength={10}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <div className="kind-toggle">
              <button
                className={`chip${!seat.isAI ? ' on' : ''}`}
                onClick={() => update(i, { isAI: false, name: seat.isAI ? DEFAULT_NAMES[i] || seat.name : seat.name })}
              >
                人
              </button>
              <button
                className={`chip${seat.isAI ? ' on' : ''}`}
                onClick={() => update(i, { isAI: true })}
              >
                AI
              </button>
            </div>
            {seat.isAI && (
              <select
                className="diff-select"
                value={seat.difficulty}
                onChange={(e) => update(i, { difficulty: e.target.value })}
              >
                <option value={DIFFICULTY.EASY}>弱い</option>
                <option value={DIFFICULTY.NORMAL}>普通</option>
                <option value={DIFFICULTY.HARD}>強い</option>
              </select>
            )}
            {seats.length > MIN_PLAYERS && (
              <button className="remove" onClick={() => removeSeat(i)} title="削除">
                ✕
              </button>
            )}
          </div>
        ))}

        {avatarPickerFor !== null && (
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  update(avatarPickerFor, { avatar: a });
                  setAvatarPickerFor(null);
                }}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        <button
          className="btn ghost"
          style={{ width: '100%', marginTop: 8 }}
          onClick={addSeat}
          disabled={seats.length >= MAX_PLAYERS}
        >
          ＋ メンバーを追加（最大{MAX_PLAYERS}人）
        </button>
      </div>

      <div className="card-panel">
        <div className="row between">
          <h2 style={{ margin: 0 }}>ライフ（チップ）</h2>
          <div className="kind-toggle">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`chip${lives === n ? ' on' : ''}`}
                onClick={() => setLives(n)}
              >
                {'❤️'.repeat(n)}
              </button>
            ))}
          </div>
        </div>
        <p className="small-muted" style={{ marginBottom: 0 }}>
          最初にライフが0になった人が「ひとり負け」。負けが決まったら終了です。
        </p>
      </div>

      <div className="card-panel">
        <div className="row between">
          <h2 style={{ margin: 0 }}>手札の枚数</h2>
          <div className="kind-toggle">
            {[3, 4, 5].map((n) => (
              <button
                key={n}
                className={`chip${handSize === n ? ' on' : ''}`}
                onClick={() => setHandSize(n)}
              >
                {n}枚
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-panel center">
        <p className="small-muted" style={{ marginTop: 0 }}>
          同じ端末で順番に回して遊びます（覗き見防止つき）。AIを混ぜてもOK。
        </p>
        <button
          className="btn primary"
          style={{ width: '100%', fontSize: 18 }}
          disabled={!canStart}
          onClick={() => onStart(seats, lives, handSize)}
        >
          ゲーム開始 ▶
        </button>
      </div>

      <p className="center small-muted" style={{ marginTop: 16 }}>
        🌐 オンライン対戦（ルームコード）は次のアップデートで追加予定
      </p>
    </div>
  );
}
