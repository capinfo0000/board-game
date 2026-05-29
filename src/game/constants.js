// ゲーム全体の定数

export const LIMIT = 101; // 場の合計がこれを「超える」と出せない／バースト
export const HAND_SIZE = 5; // 手札枚数
export const START_LIVES = 3; // 初期ライフ
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 7;
export const RESET_VALUE = 1; // リセットカードで戻る値
export const TURN_SECONDS = 30; // オンライン時の手番制限（秒）

// カードの種類
export const KIND = {
  NUMBER: 'number', // その数字を足す（10/J/Q/Kも値で表現）
  MINUS: 'minus', // 場を下げる
  SET101: 'set101', // 場を101にする
  PASS: 'pass', // 合計そのまま手番終了
  SKIP: 'skip', // 次の人を飛ばす
  DRAW2: 'draw2', // 次の人が強制で2枚出す
  REVERSE: 'reverse', // 順番逆転
  RESET: 'reset', // 場を1に戻す
  NOMINATE: 'nominate', // 次に出す人を指名
};

// AI難易度
export const DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
};

export const DIFFICULTY_LABEL = {
  easy: '弱い',
  normal: '普通',
  hard: '強い',
};
