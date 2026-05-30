// 効果音（Web Audio APIで生成。音声ファイル不要）。ON/OFF切り替え可・設定は保存。
let enabled = true;
try {
  const v = localStorage.getItem('noi-sound');
  if (v !== null) enabled = v === '1';
} catch (e) {
  /* noop */
}

let ctx = null;
function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundOn() {
  return enabled;
}
export function setSoundOn(v) {
  enabled = !!v;
  try {
    localStorage.setItem('noi-sound', enabled ? '1' : '0');
  } catch (e) {
    /* noop */
  }
  if (enabled) blip(660, 0.08, 'triangle', 0.15); // 確認音
}

// 単音
function tone(freq, start, dur, { type = 'sine', gain = 0.18, slideTo = null } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function blip(freq, dur, type, gain) {
  if (!enabled) return;
  tone(freq, 0, dur, { type, gain });
}

export const sfx = {
  card() {
    if (!enabled) return;
    tone(420, 0, 0.07, { type: 'triangle', gain: 0.16, slideTo: 620 });
  },
  special() {
    if (!enabled) return;
    tone(520, 0, 0.09, { type: 'square', gain: 0.12 });
    tone(780, 0.07, 0.12, { type: 'square', gain: 0.12 });
  },
  reset() {
    if (!enabled) return;
    tone(900, 0, 0.18, { type: 'sine', gain: 0.16, slideTo: 300 });
  },
  bust() {
    if (!enabled) return;
    tone(300, 0, 0.18, { type: 'sawtooth', gain: 0.2, slideTo: 120 });
    tone(160, 0.14, 0.28, { type: 'sawtooth', gain: 0.2, slideTo: 70 });
  },
  win() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, { type: 'triangle', gain: 0.18 }));
  },
  click() {
    if (!enabled) return;
    tone(300, 0, 0.04, { type: 'sine', gain: 0.1 });
  },
};
