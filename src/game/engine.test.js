// エンジンの動作確認（node --test で実行）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, playCard, useUltimate, getCurrentPlayer, livingPlayers, isPlayable } from './engine.js';
import { chooseMove } from './ai.js';
import { buildDeck } from './cards.js';
import { LIMIT, KIND } from './constants.js';

test('デッキは88枚', () => {
  assert.equal(buildDeck().length, 88);
});

test('初期状態：全員ライフ3・手札5枚', () => {
  const g = createGame({
    players: [
      { name: 'A', isAI: false },
      { name: 'B', isAI: true, difficulty: 'normal' },
    ],
  });
  assert.equal(g.players.length, 2);
  for (const p of g.players) {
    assert.equal(p.lives, 3);
    assert.equal(p.hand.length, 5);
  }
  assert.equal(g.total, 0);
});

test('数字カードは合計が101を超えると出せない', () => {
  const card20 = { id: 'x', kind: KIND.NUMBER, value: 20, label: 'J' };
  assert.equal(isPlayable(card20, 80), true); // 80+20=100 OK
  assert.equal(isPlayable(card20, 81), true); // 81+20=101 OK（ちょうどはOK）
  assert.equal(isPlayable(card20, 82), false); // 82+20=102 NG
  const minus = { id: 'y', kind: KIND.MINUS, value: -10, label: '−10' };
  assert.equal(isPlayable(minus, 100), true); // マイナスは常にOK
});

test('AI同士で最後まで進行し勝者が決まる（クラッシュしない）', () => {
  for (let trial = 0; trial < 20; trial += 1) {
    let g = createGame({
      players: [
        { name: 'AI-1', isAI: true, difficulty: 'easy' },
        { name: 'AI-2', isAI: true, difficulty: 'normal' },
        { name: 'AI-3', isAI: true, difficulty: 'hard' },
        { name: 'AI-4', isAI: true, difficulty: 'normal' },
      ],
    });
    let steps = 0;
    while (g.phase === 'playing' && steps < 5000) {
      steps += 1;
      const move = chooseMove(g);
      assert.ok(move, '手番プレイヤーは必ず手を持つ（出せなければエンジンが自動バースト）');
      const me = getCurrentPlayer(g);
      if (move.type === 'ultimate') {
        g = useUltimate(g, me.id);
      } else {
        g = playCard(g, me.id, move.cardId, move.choice ?? null);
      }
      // 不変条件
      assert.ok(g.total >= 0 && g.total <= LIMIT, `total範囲: ${g.total}`);
    }
    assert.equal(g.phase, 'gameOver', `trial${trial}: ${steps}手で終了しなかった`);
    assert.equal(livingPlayers(g).length, 1);
    assert.ok(g.winnerId);
  }
});

test('101カードは場を101にする', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }] });
  const me = getCurrentPlayer(g);
  // 手札に101カードを仕込む
  const card = { id: 'force101', kind: KIND.SET101, value: 0, label: '101' };
  me.hand[0] = card;
  g = playCard(g, me.id, 'force101');
  assert.equal(g.total, LIMIT);
});

test('リセットカードは場を1にする', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }] });
  g.total = 90;
  const me = getCurrentPlayer(g);
  me.hand[0] = { id: 'r', kind: KIND.RESET, value: 0, label: 'リセット' };
  g = playCard(g, me.id, 'r');
  assert.equal(g.total, 1);
});
