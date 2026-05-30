// ノイ（NEU）ゲームエンジン
// 純粋なロジック層。UI からもサーバー（将来のオンライン対戦）からも使えるよう、
// 状態を受け取り新しい状態を返す形にしている。
import {
  LIMIT,
  HAND_SIZE,
  START_LIVES,
  RESET_VALUE,
  KIND,
} from './constants.js';
import { buildDeck, cardName } from './cards.js';

// ---- ユーティリティ ----

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 状態の浅いクローン（カードは不変オブジェクトなので配列・プレイヤーのみ複製）
function clone(state) {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: p.hand.slice() })),
    drawPile: state.drawPile.slice(),
    discardPile: state.discardPile.slice(),
    log: state.log.slice(),
    turnEffects: { ...state.turnEffects },
  };
}

let _logId = 0;
let _bustSeq = 0;
function addLog(state, text) {
  _logId += 1;
  state.log.push({ id: `l${_logId}`, text });
  // ログは直近100件まで
  if (state.log.length > 100) state.log.shift();
}

// ---- 判定系 ----

export function isPlayable(card, total, pendingPlays = 1) {
  // 「次の人2枚」を受けている番（2枚出し）では、次の人2枚カードは出せない
  if (card.kind === KIND.DRAW2 && pendingPlays === 2) return false;
  if (card.kind === KIND.NUMBER) return total + card.value <= LIMIT;
  // マイナス（0止まり）・101・リセット・各アクションは常に出せる
  return true;
}

export function getPlayableCards(player, total, pendingPlays = 1) {
  return player.hand.filter((c) => isPlayable(c, total, pendingPlays));
}

export function livingPlayers(state) {
  return state.players.filter((p) => !p.eliminated);
}

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function nextLivingIndex(players, fromIndex, dir) {
  const n = players.length;
  let i = fromIndex;
  do {
    i = (i + dir + n) % n;
  } while (players[i].eliminated);
  return i;
}

// ---- 山札・配札 ----

function drawCard(state) {
  if (state.drawPile.length === 0) {
    // 山札が尽きたら捨て札をシャッフルして山札に
    if (state.discardPile.length === 0) return null; // 究極の枯渇（ほぼ起きない）
    state.drawPile = shuffle(state.discardPile);
    state.discardPile = [];
  }
  return state.drawPile.pop();
}

function refillHand(state, player, collected) {
  const target = state.handSize ?? HAND_SIZE;
  while (player.hand.length < target) {
    const card = drawCard(state);
    if (!card) break;
    player.hand.push(card);
    if (collected) collected.push(card.id);
  }
}

// 全カードを集めてラウンドを開始（手札を配り直す）
function startRound(state, starterIndex) {
  // 全カードを回収して新しい山札を作る
  const all = [];
  for (const p of state.players) {
    all.push(...p.hand);
    p.hand = [];
  }
  all.push(...state.drawPile, ...state.discardPile);
  state.drawPile = shuffle(all.length ? all : buildDeck());
  state.discardPile = [];
  state.total = 0;
  state.direction = 1;
  state.turnEffects = freshTurnEffects();

  for (const p of state.players) {
    if (!p.eliminated) refillHand(state, p);
  }

  state.currentPlayerIndex = starterIndex;
  state.pendingPlays = 1;
  state.turnPlaysRemaining = 1;
  state.phase = 'playing';
  settleTurnStart(state);
}

function freshTurnEffects() {
  return { skip: 0, draw2: false, nominateTarget: null };
}

// ---- ゲーム生成 ----

// config: { players: [{ name, avatar, isAI, difficulty }], lives }
export function createGame(config) {
  const deck = shuffle(buildDeck());
  const startLives = config.lives ?? START_LIVES;
  const players = config.players.map((p, idx) => ({
    id: p.id ?? `p${idx}`,
    name: p.name,
    avatar: p.avatar ?? '🙂',
    isAI: !!p.isAI,
    difficulty: p.difficulty ?? 'normal',
    lives: startLives,
    hand: [],
    ultimateUsed: false,
    eliminated: false,
  }));

  const state = {
    players,
    handSize: config.handSize ?? HAND_SIZE,
    drawPile: deck,
    discardPile: [],
    total: 0,
    direction: 1,
    currentPlayerIndex: 0,
    pendingPlays: 1,
    turnPlaysRemaining: 1,
    turnEffects: freshTurnEffects(),
    phase: 'playing',
    mode: config.mode === 'winner' ? 'winner' : 'loser', // 'loser'=ひとり負け / 'winner'=ひとり勝ち
    loserId: null, // ひとり負けが決まったプレイヤー
    winnerId: null, // ひとり勝ちが決まったプレイヤー
    lastAction: null, // { playerId, cardId, kind, text } 直近の手（アニメ用）
    lastBust: null, // { seq, name, total, eliminated, ... } バースト演出用
    lastDrawn: [], // 直前のプレイで引いたカードのidリスト（手札確認の演出用）
    turnId: 0, // 手番が新しいプレイヤーに確定するたびに増える（UIのパス＆プレイ用）
    log: [],
  };

  // 配札
  for (const p of state.players) refillHand(state, p);
  addLog(state, 'ゲーム開始！');
  settleTurnStart(state);
  return state;
}

// ---- 手番開始時の処理（出せなければ自動バースト）----

function settleTurnStart(state) {
  // バーストが連鎖する可能性があるのでループで処理
  let guard = 0;
  while (state.phase === 'playing' && guard < 50) {
    guard += 1;
    const player = getCurrentPlayer(state);
    if (!player || player.eliminated) {
      // 念のため次の生存者へ
      state.currentPlayerIndex = nextLivingIndex(
        state.players,
        state.currentPlayerIndex,
        state.direction,
      );
      continue;
    }
    const playable = getPlayableCards(player, state.total, state.pendingPlays);
    if (playable.length === 0 && player.ultimateUsed) {
      // 出せる札がなく、手札まわしも使い切っている → バースト
      doBust(state, player);
      // doBust が startRound を呼ぶ場合があり、その中で再度 settleTurnStart が走る
      return;
    }
    // 出せる札が無くても、手札まわしが残っていれば手番は成立（使うか/バーストかを選ぶ）
    state.turnId += 1; // 新しいプレイヤーの手番が確定
    break; // 出せる札がある＝手番確定
  }
}

function doBust(state, player) {
  const bustTotal = state.total;
  player.lives -= 1;
  addLog(state, `💥 ${player.name} は出せる札がなく合計${bustTotal}でバースト！ ライフ -1（残り${Math.max(player.lives, 0)}）`);

  const bustedIndex = state.players.indexOf(player);
  const eliminated = player.lives <= 0;

  // バースト演出用のイベント
  _bustSeq += 1;
  state.lastBust = {
    seq: _bustSeq,
    playerId: player.id,
    name: player.name,
    avatar: player.avatar,
    total: bustTotal,
    eliminated,
    livesLeft: Math.max(player.lives, 0),
  };

  if (eliminated) {
    player.lives = 0;
    player.eliminated = true;

    if (state.mode === 'loser') {
      // ひとり負け：最初にライフ0になった人が敗者で即終了
      state.phase = 'gameOver';
      state.loserId = player.id;
      addLog(state, `😵 ${player.name} のひとり負け！ ゲーム終了`);
      return;
    }

    // ひとり勝ち：脱落させて続行。最後の1人が勝ち
    addLog(state, `☠️ ${player.name} は脱落しました`);
    const living = livingPlayers(state);
    if (living.length <= 1) {
      state.phase = 'gameOver';
      state.winnerId = living[0]?.id ?? null;
      if (living[0]) addLog(state, `🏆 ${living[0].name} の勝利！`);
      return;
    }
    // 次の親は脱落者の次の生存者
    addLog(state, '🔄 手札を配り直して次のラウンドへ');
    startRound(state, nextLivingIndex(state.players, bustedIndex, 1));
    return;
  }

  // まだ脱落していない → 手札を配り直して次ラウンド（バーストした人が次の親）
  addLog(state, '🔄 手札を配り直して次のラウンドへ');
  startRound(state, bustedIndex);
}

// ---- 手番終了 → 次のプレイヤーへ ----

function advanceTurn(state) {
  const fx = state.turnEffects;
  const fromIndex = state.currentPlayerIndex;
  let idx = nextLivingIndex(state.players, fromIndex, state.direction);
  // スキップ（追加ホップ）
  for (let k = 0; k < fx.skip; k += 1) {
    idx = nextLivingIndex(state.players, idx, state.direction);
  }
  // 指名は上書き
  if (fx.nominateTarget != null) {
    const tIdx = state.players.findIndex((p) => p.id === fx.nominateTarget && !p.eliminated);
    if (tIdx >= 0) idx = tIdx;
  }

  state.currentPlayerIndex = idx;
  let owe = fx.draw2 ? 2 : 1;
  // 自分自身には「2枚」を回さない（2人時のスキップ/リバース等で自分に戻る場合）
  if (owe === 2 && idx === fromIndex) owe = 1;
  state.pendingPlays = owe;
  state.turnPlaysRemaining = owe;
  state.turnEffects = freshTurnEffects();

  if (owe === 2) {
    addLog(state, `➕➕ ${getCurrentPlayer(state).name} は2枚出さなければなりません`);
  }

  settleTurnStart(state);
}

// ---- カードの効果適用 ----

function applyCardEffect(state, player, card, choice) {
  switch (card.kind) {
    case KIND.NUMBER:
      state.total += card.value;
      break;
    case KIND.MINUS:
      state.total = Math.max(0, state.total + card.value);
      break;
    case KIND.SET101:
      state.total = LIMIT;
      break;
    case KIND.RESET:
      state.total = RESET_VALUE;
      break;
    case KIND.SKIP:
      state.turnEffects.skip += 1;
      break;
    case KIND.DRAW2:
      state.turnEffects.draw2 = true; // 累積しない
      break;
    case KIND.REVERSE:
      if (livingPlayers(state).length === 2) {
        // 2人時は実質スキップ（自分がもう1回）
        state.turnEffects.skip += 1;
      } else {
        state.direction *= -1;
      }
      break;
    case KIND.NOMINATE:
      state.turnEffects.nominateTarget = choice?.targetId ?? null;
      break;
    case KIND.PASS:
    default:
      // 合計も順番も変えない
      break;
  }
}

function buildPlayLogText(state, player, card, choice) {
  const base = `${player.name} が「${cardName(card)}」を出した`;
  switch (card.kind) {
    case KIND.NUMBER:
    case KIND.MINUS:
    case KIND.SET101:
    case KIND.RESET:
      return `${base} → 場は ${state.total}`;
    case KIND.SKIP:
      return `${base}（スキップ）`;
    case KIND.DRAW2:
      return `${base}（次の人2枚）`;
    case KIND.REVERSE:
      return `${base}（リバース）`;
    case KIND.PASS:
      return `${base}（パス）`;
    case KIND.NOMINATE: {
      const target = state.players.find((p) => p.id === choice?.targetId);
      return `${base} → 🎯 ${target ? target.name : '?'} を指名`;
    }
    default:
      return base;
  }
}

// ---- 公開アクション：カードを出す ----

export function playCard(prev, playerId, cardId, choice = null) {
  const state = clone(prev);
  if (state.phase !== 'playing') return prev;

  const player = getCurrentPlayer(state);
  if (!player || player.id !== playerId) return prev; // 手番違い

  const cardIdx = player.hand.findIndex((c) => c.id === cardId);
  if (cardIdx < 0) return prev;
  const card = player.hand[cardIdx];

  if (!isPlayable(card, state.total, state.pendingPlays)) return prev; // 出せない札
  if (card.kind === KIND.NOMINATE) {
    // 指名先は自分以外の生存者でなければならない
    const target = state.players.find(
      (p) => p.id === choice?.targetId && !p.eliminated && p.id !== playerId,
    );
    if (!target) return prev;
  }

  // 手札から場へ
  player.hand.splice(cardIdx, 1);
  state.discardPile.push(card);
  applyCardEffect(state, player, card, choice);
  state.lastAction = { playerId, cardId, kind: card.kind, label: card.label, value: card.value, seq: (prev.lastAction?.seq || 0) + 1 };
  addLog(state, buildPlayLogText(state, player, card, choice));

  // --- 「次の人2枚」を受けたターンの処理 ---
  // turnPlaysRemaining === 2 は「強制2枚ターンの1枚目」を意味する
  const valueCard =
    card.kind === KIND.NUMBER || card.kind === KIND.MINUS || card.kind === KIND.SET101;

  if (state.turnPlaysRemaining === 2) {
    if (!valueCard) {
      // 特殊カード（スキップ・リバース・リセット・パス・指名・次2枚）なら1枚でOK
      // → 「2枚出す」義務は次のプレイヤーへ移る
      state.turnEffects.draw2 = true;
      state.turnPlaysRemaining = 0;
      addLog(state, '→ 特殊カードのため1枚でOK。2枚出す番は次の人へ');
    } else {
      // 数字・±・101 は、もう1枚出す必要がある
      state.turnPlaysRemaining = 1;
    }
  } else {
    state.turnPlaysRemaining -= 1;
  }

  if (state.turnPlaysRemaining > 0) {
    // 2枚目を出す必要がある（※ここでは補充しない＝2枚出して引けるのは1枚）
    const playable = getPlayableCards(player, state.total, state.pendingPlays);
    if (playable.length === 0 && player.ultimateUsed) {
      doBust(state, player);
    }
    // 手札まわしが残っていればバーストせず、本人が使うか/バーストかを選ぶ
    return state; // 同じプレイヤーが続けて出す
  }

  // 手番終了：このターンに引けるのは1枚だけ
  const drawn = [];
  const newCard = drawCard(state);
  if (newCard) {
    player.hand.push(newCard);
    drawn.push(newCard.id);
  }
  state.lastDrawn = drawn;

  advanceTurn(state);
  return state;
}

// ---- 公開アクション：手札まわしを使わずにバースト（投了）----
export function forfeit(prev, playerId) {
  const state = clone(prev);
  if (state.phase !== 'playing') return prev;
  const player = getCurrentPlayer(state);
  if (!player || player.id !== playerId) return prev;
  // 出せる札があるなら投了はできない（詰んでいる時だけ）
  if (getPlayableCards(player, state.total, state.pendingPlays).length > 0) return prev;
  doBust(state, player);
  return state;
}

// ---- 公開アクション：必殺技（手札を右回転で全交換）----

export function useUltimate(prev, playerId) {
  const state = clone(prev);
  if (state.phase !== 'playing') return prev;
  const player = getCurrentPlayer(state);
  if (!player || player.id !== playerId) return prev;
  if (player.ultimateUsed) return prev;

  const living = state.players.filter((p) => !p.eliminated);
  if (living.length >= 2) {
    // 進行方向と逆まわりに手札を回す（右進行なら左へ／左進行なら右へ）
    const hands = living.map((p) => p.hand);
    const n = living.length;
    const shift = state.direction === 1 ? -1 : 1;
    for (let i = 0; i < n; i += 1) {
      living[(i + shift + n) % n].hand = hands[i];
    }
  }
  player.ultimateUsed = true;
  state.lastDrawn = [];
  state.lastAction = { playerId, kind: 'ultimate', seq: (prev.lastAction?.seq || 0) + 1 };
  addLog(
    state,
    `🔄 ${player.name} が手札まわし！ 全員の手札を${state.direction === 1 ? '左' : '右'}どなりへ回す`,
  );

  // 手番は終わらない。続けてカードを出す（出せなければ＝手札まわしも使い切ったのでバースト）
  const playable = getPlayableCards(player, state.total, state.pendingPlays);
  if (playable.length === 0) {
    doBust(state, player);
  }
  return state;
}

// ---- 補助：UI 用の情報 ----

export function directionArrow(state) {
  return state.direction === 1 ? '→' : '←';
}

export { cardName };
