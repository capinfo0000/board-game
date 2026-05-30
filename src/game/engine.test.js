// エンジンの動作確認（node --test で実行）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, playCard, useUltimate, forfeit, getCurrentPlayer, isPlayable } from './engine.js';
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
    // ひとり負けを決めるゲーム：最初に脱落した1人が敗者で即終了
    assert.ok(g.loserId, '敗者が決まる');
    const eliminated = g.players.filter((p) => p.eliminated);
    assert.equal(eliminated.length, 1, '脱落者はちょうど1人');
    assert.equal(eliminated[0].id, g.loserId);
  }
});

test('ひとり勝ちモードでは最後の1人が決まるまで続く', () => {
  for (let trial = 0; trial < 10; trial += 1) {
    let g = createGame({
      players: [
        { name: 'A', isAI: true, difficulty: 'easy' },
        { name: 'B', isAI: true, difficulty: 'normal' },
        { name: 'C', isAI: true, difficulty: 'hard' },
      ],
      lives: 2,
      mode: 'winner',
    });
    let steps = 0;
    while (g.phase === 'playing' && steps < 5000) {
      steps += 1;
      const move = chooseMove(g);
      const me = getCurrentPlayer(g);
      g = move.type === 'ultimate' ? useUltimate(g, me.id) : playCard(g, me.id, move.cardId, move.choice ?? null);
    }
    assert.equal(g.phase, 'gameOver');
    assert.ok(g.winnerId, 'ひとり勝ちが決まる');
    assert.equal(g.players.filter((p) => !p.eliminated).length, 1, '生存者は1人');
  }
});

test('手札枚数は設定できる（3枚）', () => {
  const g = createGame({ players: [{ name: 'A' }, { name: 'B' }], handSize: 3 });
  for (const p of g.players) assert.equal(p.hand.length, 3);
});

test('ライフ1で詰み・手札まわし使用済なら即ひとり負け', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }], lives: 1 });
  const cur = getCurrentPlayer(g); // A
  cur.hand[0] = { id: 's101', kind: KIND.SET101, value: 0, label: '101' };
  const b = g.players[1];
  b.ultimateUsed = true; // 手札まわしは使い切っている
  for (let i = 0; i < b.hand.length; i += 1) {
    b.hand[i] = { id: `bn${i}`, kind: KIND.NUMBER, value: 5, label: '5' };
  }
  g = playCard(g, cur.id, 's101'); // 場101→Bは出せず・手札まわしも無し→即バースト→負け
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.loserId, b.id);
});

test('詰みでも手札まわしが残っていればまだ負けではない（投了でバースト）', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }], lives: 1 });
  const cur = getCurrentPlayer(g);
  cur.hand[0] = { id: 's101', kind: KIND.SET101, value: 0, label: '101' };
  const b = g.players[1];
  // b.ultimateUsed は false（手札まわし残っている）
  for (let i = 0; i < b.hand.length; i += 1) {
    b.hand[i] = { id: `bn${i}`, kind: KIND.NUMBER, value: 5, label: '5' };
  }
  g = playCard(g, cur.id, 's101'); // 場101→Bは出せないが手札まわしが残る→まだ続行
  assert.equal(g.phase, 'playing', '手札まわしが残っているので負けではない');
  assert.equal(getCurrentPlayer(g).id, b.id, 'Bの手番のまま');
  // Bが手札まわしを使わずバースト（投了）
  g = forfeit(g, b.id);
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.loserId, b.id);
});

test('101カードは場を101にする', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }] });
  const me = getCurrentPlayer(g);
  // 相手(B)が必ず出せる札を持つようにして、バースト→リセットで場が0に戻るのを防ぐ
  g.players[1].hand[0] = { id: 'bpass', kind: KIND.PASS, value: 0, label: 'パス' };
  // 手札に101カードを仕込む
  const card = { id: 'force101', kind: KIND.SET101, value: 0, label: '101' };
  me.hand[0] = card;
  g = playCard(g, me.id, 'force101');
  assert.equal(g.total, LIMIT);
});

test('次2枚を受けて特殊カードを出すと1枚でOK・2枚出す番は次へ移る', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
  const a = getCurrentPlayer(g);
  a.hand[0] = { id: 'd2', kind: KIND.DRAW2, value: 0, label: '次2枚' };
  g = playCard(g, a.id, 'd2');
  assert.equal(g.pendingPlays, 2, 'Bは2枚出す番');
  const bId = getCurrentPlayer(g).id;
  getCurrentPlayer(g).hand[0] = { id: 'sk', kind: KIND.SKIP, value: 0, label: 'スキップ' };
  g = playCard(g, bId, 'sk');
  const bAfter = g.players.find((p) => p.id === bId);
  assert.equal(bAfter.hand.length, 5, '1枚出して1枚引く＝5枚キープ');
  assert.equal(g.pendingPlays, 2, '2枚出す義務は次のプレイヤーへ');
  assert.notEqual(getCurrentPlayer(g).id, bId, 'Bの手番は終わっている');
});

test('次2枚を受けて数字カードを出すと2枚必要・引けるのは1枚', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
  const a = getCurrentPlayer(g);
  a.hand[0] = { id: 'd2', kind: KIND.DRAW2, value: 0, label: '次2枚' };
  g = playCard(g, a.id, 'd2');
  const bId = getCurrentPlayer(g).id;
  const b = getCurrentPlayer(g);
  b.hand[0] = { id: 'n1', kind: KIND.NUMBER, value: 3, label: '3' };
  b.hand[1] = { id: 'n2', kind: KIND.NUMBER, value: 4, label: '4' };
  g = playCard(g, bId, 'n1');
  assert.equal(getCurrentPlayer(g).id, bId, '1枚目が数字なのでまだBの番');
  g = playCard(g, bId, 'n2');
  const bAfter = g.players.find((p) => p.id === bId);
  assert.equal(bAfter.hand.length, 4, '2枚出して1枚しか引けないので手札-1');
});

test('リセットカードは場を1にする', () => {
  let g = createGame({ players: [{ name: 'A' }, { name: 'B' }] });
  g.total = 90;
  const me = getCurrentPlayer(g);
  me.hand[0] = { id: 'r', kind: KIND.RESET, value: 0, label: 'リセット' };
  g = playCard(g, me.id, 'r');
  assert.equal(g.total, 1);
});
