// アーケード系モード: 基礎れんしゅう / ランダム / ことば / タイムアタック

const MODES = {
  basic: {
    label: '基礎れんしゅう', timed: false, needsGroup: true, guideDefault: true,
    makeQueue(opts) {
      const base = KANA_GROUPS[opts.group] || ALL_KANA;
      return shuffle([...base, ...base]).map((c) => ({ text: c }));
    },
  },
  random: {
    label: 'ランダム文字', timed: false, needsGroup: false, guideDefault: false,
    makeQueue() { return shuffle([...ALL_KANA]).slice(0, 20).map((c) => ({ text: c })); },
  },
  words: {
    label: 'ことば', timed: false, needsGroup: false, guideDefault: false,
    makeQueue() { return shuffle([...WORDS]).slice(0, 10).map((w) => ({ text: w })); },
  },
  timeattack: {
    label: 'タイムアタック', timed: true, duration: 60, needsGroup: false, guideDefault: false,
    makeQueue() { return shuffle([...WORDS, ...WORDS, ...WORDS]).map((w) => ({ text: w })); },
  },
};

class Game {
  constructor({ keyboard, ui }) {
    this.keyboard = keyboard;
    this.ui = ui;
    this.reset();
  }

  bind() {
    this.keyboard.onInput = (ch) => this.handleChar(ch);
    this.keyboard.onModifier = () => this.handleMod();
  }

  reset() {
    this.mode = null; this.queue = []; this.qIndex = 0; this.ci = 0;
    this.correct = 0; this.mistakes = 0; this.combo = 0; this.maxCombo = 0;
    this.score = 0; this.startTime = 0; this.running = false;
    this.showGuide = false; this.timerId = null; this.matcher = null;
  }

  start(modeKey, opts = {}) {
    this.reset();
    this.bind();
    this.modeKey = modeKey;
    this.mode = MODES[modeKey];
    this.queue = this.mode.makeQueue(opts);
    this.showGuide = opts.guide !== undefined ? opts.guide : this.mode.guideDefault;
    this.running = true;
    this.startTime = performance.now();
    sound.start();
    if (this.mode.timed) {
      this.remaining = this.mode.duration;
      this._tick();
      this.timerId = setInterval(() => this._tick(), 100);
    }
    this._renderPrompt();
    this.ui.updateStats(this.statsSnapshot());
  }

  _tick() {
    this.remaining = Math.max(0, this.mode.duration - (performance.now() - this.startTime) / 1000);
    this.ui.updateTimer(this.remaining);
    if (this.remaining <= 0) this.finish();
  }

  get prompt() { return this.queue[this.qIndex]; }
  get expected() { return this.prompt ? this.prompt.text[this.ci] : null; }

  _renderPrompt() {
    if (!this.prompt) { this.finish(); return; }
    this.matcher = new CharMatcher(this.expected);
    this.ui.showPrompt(this.prompt.text, this.ci);
    if (this.showGuide) this.keyboard.setGuide(this.expected);
    else this.keyboard.clearGuide();
  }

  _guideNext() {
    this.matcher = new CharMatcher(this.expected);
    if (this.showGuide) this.keyboard.setGuide(this.expected);
  }

  handleChar(ch) { if (this.running) { sound.tap(); this._apply(this.matcher.feedChar(ch)); } }
  handleMod()    { if (this.running) this._apply(this.matcher.feedMod()); }

  _apply(result) {
    if (result === 'correct') {
      this.correct++; this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += 10 + Math.min(this.combo, 20);
      sound.correct();
      if (this.combo > 1 && this.combo % 5 === 0) sound.combo(this.combo);
      this.ci++;
      this.ui.markCorrect(this.ci);
      if (this.ci >= this.prompt.text.length) {
        this.score += 20; this.qIndex++; this.ci = 0;
        if (this.mode.timed && this.qIndex >= this.queue.length - 2) {
          this.queue.push(...shuffle([...WORDS]).map((w) => ({ text: w })));
        }
        if (!this.mode.timed && this.qIndex >= this.queue.length) { this.finish(); return; }
        this._renderPrompt();
      } else {
        this._guideNext();
      }
    } else if (result === 'pending') {
      this.ui.markPending(this.ci, this.matcher.current);
    } else {
      this.mistakes++; this.combo = 0;
      this.keyboard.flashWrong(); this.ui.markWrong(); sound.wrong();
    }
    this.ui.updateStats(this.statsSnapshot());
  }

  statsSnapshot() {
    const elapsed = Math.max(0.001, (performance.now() - this.startTime) / 1000);
    const total = this.correct + this.mistakes;
    return {
      score: this.score, combo: this.combo, maxCombo: this.maxCombo,
      accuracy: total ? Math.round((this.correct / total) * 100) : 100,
      cpm: Math.round((this.correct / elapsed) * 60),
      correct: this.correct, mistakes: this.mistakes, elapsed,
    };
  }

  finish() {
    if (!this.running) return;
    this.running = false;
    if (this.timerId) clearInterval(this.timerId);
    this.keyboard.clearGuide();
    sound.clear();
    const stats = this.statsSnapshot();
    stats.modeLabel = this.mode.label;
    stats.rank = rankFor(stats);
    // ベストスコア保存
    const save = Storage.load();
    save.bestScores = save.bestScores || {};
    const prev = save.bestScores[this.modeKey] || 0;
    stats.best = Math.max(prev, stats.score);
    stats.isNew = stats.score >= stats.best && stats.score > prev;
    save.bestScores[this.modeKey] = stats.best;
    save.totalChars = (save.totalChars || 0) + this.correct;
    Storage.save(save);
    this.ui.showResult(stats);
  }

  toggleGuide() {
    this.showGuide = !this.showGuide;
    if (this.showGuide) this.keyboard.setGuide(this.expected);
    else this.keyboard.clearGuide();
    return this.showGuide;
  }

  quit() {
    this.running = false;
    if (this.timerId) clearInterval(this.timerId);
    this.keyboard.clearGuide();
  }
}

function rankFor(stats) {
  if (stats.accuracy >= 98 && stats.cpm >= 90) return 'S';
  const s = stats.accuracy * 0.6 + Math.min(stats.cpm, 120) * 0.6;
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
