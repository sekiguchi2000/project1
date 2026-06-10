// WebAudio で効果音を合成（音声ファイル不要）。ミュート対応。
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('flick_mute') !== '1';
  }
  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  setEnabled(on) {
    this.enabled = on;
    localStorage.setItem('flick_mute', on ? '0' : '1');
  }
  toggle() { this.setEnabled(!this.enabled); return this.enabled; }

  _tone(freq, dur, { type = 'sine', vol = 0.2, slide = 0, delay = 0 } = {}) {
    if (!this.enabled) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  tap()       { this._tone(440, 0.05, { type: 'triangle', vol: 0.12 }); }
  correct()   { this._tone(880, 0.07, { type: 'triangle', vol: 0.18, slide: 200 }); }
  combo(n)    { this._tone(660 + Math.min(n, 24) * 30, 0.08, { type: 'square', vol: 0.12 }); }
  wrong()     { this._tone(180, 0.16, { type: 'sawtooth', vol: 0.16, slide: -60 }); }
  hit()       { this._tone(520, 0.06, { type: 'square', vol: 0.14, slide: 120 }); }
  defeat()    { [523, 659, 784].forEach((f, i) => this._tone(f, 0.12, { type: 'triangle', vol: 0.18, delay: i * 0.06 })); }
  damage()    { this._tone(140, 0.22, { type: 'sawtooth', vol: 0.2, slide: -50 }); }
  levelup()   { [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.18, { type: 'triangle', vol: 0.2, delay: i * 0.08 })); }
  clear()     { [659, 784, 988, 1318].forEach((f, i) => this._tone(f, 0.2, { type: 'triangle', vol: 0.2, delay: i * 0.1 })); }
  gameover()  { [392, 330, 262].forEach((f, i) => this._tone(f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.14 })); }
  start()     { this._tone(660, 0.1, { type: 'triangle', vol: 0.16, slide: 200 }); }
}

const sound = new SoundManager();
