// ゲーム本体: モードごとの問題生成・採点・進行管理

const MODES = {
  basic: {
    label: '基礎れんしゅう',
    desc: '行を選んで1文字ずつ。ガイドつきで指の動きを覚える。',
    timed: false,
    needsGroup: true,
    guideDefault: true,
    makeQueue(opts) {
      // 選んだ行の文字をシャッフルして2周
      const base = KANA_GROUPS[opts.group] || ALL_KANA;
      const q = shuffle([...base, ...base]);
      return q.map((c) => ({ text: c }));
    },
  },
  random: {
    label: 'ランダム文字',
    desc: '全部の文字からランダム出題。ガイドなしで腕だめし。',
    timed: false,
    needsGroup: false,
    guideDefault: false,
    makeQueue() {
      return shuffle(ALL_KANA).slice(0, 20).map((c) => ({ text: c }));
    },
  },
  words: {
    label: 'ことば',
    desc: '単語を入力。実戦に近い練習。',
    timed: false,
    needsGroup: false,
    guideDefault: false,
    makeQueue() {
      return shuffle([...WORDS]).slice(0, 10).map((w) => ({ text: w }));
    },
  },
  timeattack: {
    label: 'タイムアタック',
    desc: '60秒で何文字打てる？スコアを競おう。',
    timed: true,
    duration: 60,
    needsGroup: false,
    guideDefault: false,
    makeQueue() {
      // 時間切れまで補充するので長めに用意
      return shuffle([...WORDS, ...WORDS, ...WORDS]).map((w) => ({ text: w }));
    },
  },
};

class Game {
  constructor({ keyboard, ui }) {
    this.keyboard = keyboard;
    this.ui = ui;
    this.keyboard.onInput = (ch) => this.handleInput(ch);
    this.reset();
  }

  reset() {
    this.mode = null;
    this.queue = [];
    this.qIndex = 0;
    this.charIndex = 0;
    this.correct = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.startTime = 0;
    this.running = false;
    this.showGuide = false;
    this.timerId = null;
  }

  start(modeKey, opts = {}) {
    this.reset();
    this.mode = MODES[modeKey];
    this.modeKey = modeKey;
    this.queue = this.mode.makeQueue(opts);
    this.showGuide = opts.guide !== undefined ? opts.guide : this.mode.guideDefault;
    this.running = true;
    this.startTime = performance.now();

    if (this.mode.timed) {
      this.remaining = this.mode.duration;
      this._tick();
      this.timerId = setInterval(() => this._tick(), 200);
    }
    this._renderPrompt();
    this.ui.updateStats(this.statsSnapshot());
  }

  _tick() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    this.remaining = Math.max(0, this.mode.duration - elapsed);
    this.ui.updateTimer(this.remaining);
    if (this.remaining <= 0) this.finish();
  }

  get currentPrompt() {
    return this.queue[this.qIndex];
  }

  get currentChar() {
    const p = this.currentPrompt;
    return p ? p.text[this.charIndex] : null;
  }

  _renderPrompt() {
    const p = this.currentPrompt;
    if (!p) { this.finish(); return; }
    this.ui.showPrompt(p.text, this.charIndex);
    if (this.showGuide) {
      this.keyboard.setGuide(this.currentChar);
    } else {
      this.keyboard.clearGuide();
    }
  }

  handleInput(ch) {
    if (!this.running) return;
    const expected = this.currentChar;
    if (ch === expected) {
      this.correct++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      // コンボに応じた加点
      this.score += 10 + Math.min(this.combo, 20);
      this.charIndex++;
      this.ui.markCorrect(this.charIndex);

      if (this.charIndex >= this.currentPrompt.text.length) {
        // 単語クリアのボーナス
        this.score += 20;
        this.qIndex++;
        this.charIndex = 0;
        // タイムアタックでキューが尽きそうなら補充
        if (this.mode.timed && this.qIndex >= this.queue.length - 2) {
          this.queue.push(...shuffle([...WORDS]).map((w) => ({ text: w })));
        }
      }
      this._renderPrompt();
      if (!this.mode.timed && this.qIndex >= this.queue.length) this.finish();
    } else {
      this.mistakes++;
      this.combo = 0;
      this.keyboard.flashWrong();
      this.ui.markWrong();
    }
    this.ui.updateStats(this.statsSnapshot());
  }

  statsSnapshot() {
    const elapsed = Math.max(0.001, (performance.now() - this.startTime) / 1000);
    const total = this.correct + this.mistakes;
    const accuracy = total ? Math.round((this.correct / total) * 100) : 100;
    const cpm = Math.round((this.correct / elapsed) * 60); // 1分あたり文字数
    return {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      accuracy,
      cpm,
      correct: this.correct,
      mistakes: this.mistakes,
      elapsed,
    };
  }

  finish() {
    if (!this.running) return;
    this.running = false;
    if (this.timerId) clearInterval(this.timerId);
    this.keyboard.clearGuide();
    const stats = this.statsSnapshot();
    stats.modeLabel = this.mode.label;
    stats.rank = rankFor(stats);
    this.ui.showResult(stats);
  }

  toggleGuide() {
    this.showGuide = !this.showGuide;
    this._renderPrompt();
    return this.showGuide;
  }
}

function rankFor(stats) {
  // 正確率と速度から簡易ランク
  const s = stats.accuracy * 0.6 + Math.min(stats.cpm, 120) * 0.6;
  if (stats.accuracy >= 98 && stats.cpm >= 90) return 'S';
  if (s >= 110) return 'A';
  if (s >= 90) return 'B';
  if (s >= 70) return 'C';
  return 'D';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
