// AI（NPC）の思考ロジック。3段階の難易度。
// chooseMove(state) は { type: 'play', cardId, choice? } もしくは { type: 'ultimate' } を返す。
import { LIMIT, KIND, DIFFICULTY } from './constants.js';
import { getCurrentPlayer, getPlayableCards, isPlayable } from './engine.js';

function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 自分以外の生存者
function opponents(state, playerId) {
  return state.players.filter((p) => !p.eliminated && p.id !== playerId);
}

// 指名・ヒューリスティック用：もっともライフの多い相手（リーダー）を狙う
function pickNominateTarget(state, playerId) {
  const opps = opponents(state, playerId);
  if (opps.length === 0) return null;
  return opps.slice().sort((a, b) => b.lives - a.lives)[0].id;
}

// カードを出す価値のスコア（高いほど出したい）
function scorePlay(state, card) {
  const total = state.total;
  switch (card.kind) {
    case KIND.NUMBER: {
      const after = total + card.value;
      let s = 10 + card.value * 0.6; // 大きい数字を安全なうちに処分＋次の人へ圧力
      if (after >= LIMIT - 5) s += 6; // 上限近くまで上げると次がピンチ
      return s;
    }
    case KIND.SET101:
      // 次のプレイヤーを一気にピンチに。場が低いほど効果的
      return 28 + (LIMIT - total) * 0.25;
    case KIND.DRAW2:
      return 14 + total * 0.15; // 場が高いほど強い
    case KIND.NOMINATE:
      return 12 + total * 0.12;
    case KIND.SKIP:
      return 8;
    case KIND.REVERSE:
      return 7;
    case KIND.PASS:
      return 3; // 出すものが無いときの逃げ
    case KIND.RESET:
      // 場を1に戻す＝全員が楽になるので基本は温存。自分が詰みかけのみ価値
      return total > LIMIT - 10 ? 6 : 1;
    case KIND.MINUS:
      // 緊急回避用に温存したいので低め
      return total > LIMIT - 15 ? 5 : 2;
    default:
      return 1;
  }
}

function chooseBest(state, playable, jitter) {
  let best = null;
  let bestScore = -Infinity;
  for (const card of playable) {
    const score = scorePlay(state, card) + Math.random() * jitter;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

// 必殺技を使うべきか（手札が詰まっているとき）
function shouldUseUltimate(state, player, threshold) {
  if (player.ultimateUsed) return false;
  const playable = getPlayableCards(player, state.total);
  const unplayable = player.hand.length - playable.length;
  return unplayable >= threshold;
}

export function chooseMove(state) {
  const player = getCurrentPlayer(state);
  const playable = getPlayableCards(player, state.total);
  if (playable.length === 0) return null; // 出せない（エンジン側でバースト処理）

  const diff = player.difficulty || DIFFICULTY.NORMAL;

  // --- 弱い：ランダム ---
  if (diff === DIFFICULTY.EASY) {
    const card = randPick(playable);
    return buildMove(state, player, card);
  }

  // --- 普通／強い：ヒューリスティック ---
  const ultThreshold = diff === DIFFICULTY.HARD ? 3 : 4;
  if (shouldUseUltimate(state, player, ultThreshold)) {
    return { type: 'ultimate' };
  }

  const jitter = diff === DIFFICULTY.HARD ? 1.5 : 5; // 強いほどブレが小さい
  const card = chooseBest(state, playable, jitter);
  return buildMove(state, player, card);
}

function buildMove(state, player, card) {
  if (card.kind === KIND.NOMINATE) {
    const targetId = pickNominateTarget(state, player.id) ?? null;
    if (!targetId) {
      // 指名先がいない場合は別の札を選ぶ
      const others = getPlayableCards(player, state.total).filter((c) => c.kind !== KIND.NOMINATE);
      if (others.length) return { type: 'play', cardId: others[0].id };
    }
    return { type: 'play', cardId: card.id, choice: { targetId } };
  }
  return { type: 'play', cardId: card.id };
}

// 念のためのエクスポート（テスト用）
export { isPlayable };
