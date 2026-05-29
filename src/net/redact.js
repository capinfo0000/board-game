// ネットワーク送信用に、受信者以外の手札の中身を隠した状態を作る（カンニング防止）
export function redactStateFor(state, viewerId) {
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id === viewerId) return { ...p }; // 本人の手札はそのまま
      // 他人の手札は枚数だけ残して中身を隠す
      return {
        ...p,
        hand: p.hand.map((_, i) => ({
          id: `${p.id}-hidden-${i}`,
          kind: 'back',
          value: 0,
          label: '',
        })),
      };
    }),
    // 手札確認(引いたカード)はオンラインでは使わないので送らない
    lastDrawn: [],
    drawPile: { length: state.drawPile.length }, // 枚数情報だけ
    discardPile: { length: state.discardPile.length },
  };
}
