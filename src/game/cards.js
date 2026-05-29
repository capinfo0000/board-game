// カードの定義とデッキ生成
import { KIND } from './constants.js';

// デッキ構成（全22種 × 各4枚 = 88枚）
// 各エントリ: { kind, value?, label, count }
export const DECK_SPEC = [
  // 数字カード 1〜9
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    kind: KIND.NUMBER,
    value: n,
    label: String(n),
    count: 4,
  })),
  // 10 / J / Q / K（それぞれ +10 / +20 / +30 / +40）
  { kind: KIND.NUMBER, value: 10, label: '10', count: 4 },
  { kind: KIND.NUMBER, value: 20, label: 'J', count: 4 },
  { kind: KIND.NUMBER, value: 30, label: 'Q', count: 4 },
  { kind: KIND.NUMBER, value: 40, label: 'K', count: 4 },
  // マイナス
  { kind: KIND.MINUS, value: -10, label: '−10', count: 4 },
  { kind: KIND.MINUS, value: -20, label: '−20', count: 4 },
  // 特殊
  { kind: KIND.SET101, label: '101', count: 4 },
  { kind: KIND.PASS, label: 'パス', count: 4 },
  { kind: KIND.SKIP, label: 'スキップ', count: 4 },
  { kind: KIND.DRAW2, label: '次2枚', count: 4 },
  { kind: KIND.REVERSE, label: 'リバース', count: 4 },
  { kind: KIND.RESET, label: 'リセット', count: 4 },
  { kind: KIND.NOMINATE, label: '指名', count: 4 },
];

// 表示用のメタ情報（アイコン・色カテゴリ・説明）
export const CARD_META = {
  [KIND.NUMBER]: { icon: '', category: 'number', desc: 'その数字を足す' },
  [KIND.MINUS]: { icon: '➖', category: 'minus', desc: '場の合計を下げる（0で止まる）' },
  [KIND.SET101]: { icon: '⚡', category: 'danger', desc: '場の合計を一気に101にする' },
  [KIND.PASS]: { icon: '⏭', category: 'action', desc: '合計を変えずに手番を終える' },
  [KIND.SKIP]: { icon: '🚫', category: 'action', desc: '次の人を飛ばす' },
  [KIND.DRAW2]: { icon: '➕➕', category: 'action', desc: '次の人は強制で2枚出す' },
  [KIND.REVERSE]: { icon: '🔄', category: 'action', desc: '順番を逆にする' },
  [KIND.RESET]: { icon: '1️⃣', category: 'action', desc: '場の合計を1に戻す' },
  [KIND.NOMINATE]: { icon: '🎯', category: 'action', desc: '次に出す人を指名する（自分以外）' },
};

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `c${_idCounter}`;
}

// デッキ（カードインスタンスの配列）を生成
export function buildDeck() {
  const deck = [];
  for (const spec of DECK_SPEC) {
    for (let i = 0; i < spec.count; i += 1) {
      deck.push({
        id: nextId(),
        kind: spec.kind,
        value: spec.value ?? 0,
        label: spec.label,
      });
    }
  }
  return deck;
}

// カードの表示テキスト（ログ用）
export function cardName(card) {
  if (card.kind === KIND.NUMBER) return `${card.label}（+${card.value}）`;
  if (card.kind === KIND.MINUS) return card.label;
  return card.label;
}
