// 画面遷移・UIバインドのエントリポイント

const screens = {
  home: document.getElementById('screen-home'),
  group: document.getElementById('screen-group'),
  play: document.getElementById('screen-play'),
  result: document.getElementById('screen-result'),
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('active', k === name);
  });
}

// プレイ画面の各要素
const els = {
  prompt: document.getElementById('prompt'),
  score: document.getElementById('stat-score'),
  combo: document.getElementById('stat-combo'),
  accuracy: document.getElementById('stat-accuracy'),
  cpm: document.getElementById('stat-cpm'),
  timer: document.getElementById('timer'),
  guideBtn: document.getElementById('guide-toggle'),
};

// Game に渡す UI 実装
const ui = {
  showPrompt(text, charIndex) {
    els.prompt.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      span.className = 'ch';
      if (i < charIndex) span.classList.add('done');
      else if (i === charIndex) span.classList.add('cur');
      span.textContent = text[i];
      els.prompt.appendChild(span);
    }
  },
  markCorrect(charIndex) {
    const chars = els.prompt.querySelectorAll('.ch');
    chars.forEach((c, i) => {
      c.classList.toggle('done', i < charIndex);
      c.classList.toggle('cur', i === charIndex);
    });
    els.prompt.classList.remove('hit');
    void els.prompt.offsetWidth;
    els.prompt.classList.add('hit');
  },
  markWrong() {
    els.prompt.classList.remove('miss');
    void els.prompt.offsetWidth;
    els.prompt.classList.add('miss');
  },
  updateStats(s) {
    els.score.textContent = s.score;
    els.combo.textContent = s.combo;
    els.accuracy.textContent = s.accuracy + '%';
    els.cpm.textContent = s.cpm;
  },
  updateTimer(remaining) {
    els.timer.textContent = remaining.toFixed(1);
  },
  showResult(stats) {
    document.getElementById('result-rank').textContent = stats.rank;
    document.getElementById('result-rank').dataset.rank = stats.rank;
    document.getElementById('result-mode').textContent = stats.modeLabel;
    document.getElementById('result-score').textContent = stats.score;
    document.getElementById('result-accuracy').textContent = stats.accuracy + '%';
    document.getElementById('result-cpm').textContent = stats.cpm;
    document.getElementById('result-maxcombo').textContent = stats.maxCombo;
    document.getElementById('result-mistakes').textContent = stats.mistakes;
    saveBest(stats);
    showScreen('result');
  },
};

// ベストスコアの保存（localStorage）
function saveBest(stats) {
  const key = 'flick_best_' + (game.modeKey || 'x');
  const prev = Number(localStorage.getItem(key) || 0);
  const best = Math.max(prev, stats.score);
  localStorage.setItem(key, best);
  const el = document.getElementById('result-best');
  el.textContent = best;
  document.getElementById('result-new').hidden = !(stats.score >= best && stats.score > prev);
}

// 初期化
const keyboard = new FlickKeyboard(document.getElementById('keyboard'), () => {});
const game = new Game({ keyboard, ui });

let pendingMode = null;

// --- ホーム画面: モード選択 ---
document.querySelectorAll('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modeKey = btn.dataset.mode;
    if (MODES[modeKey].needsGroup) {
      pendingMode = modeKey;
      showScreen('group');
    } else {
      startGame(modeKey, {});
    }
  });
});

// --- 行選択画面 ---
const groupGrid = document.getElementById('group-grid');
Object.entries(GROUP_LABELS).forEach(([key, label]) => {
  const btn = document.createElement('button');
  btn.className = 'btn group-btn';
  btn.textContent = label;
  btn.addEventListener('click', () => startGame(pendingMode, { group: key }));
  groupGrid.appendChild(btn);
});
document.getElementById('group-all').addEventListener('click', () => {
  startGame(pendingMode, { group: null });
});

function startGame(modeKey, opts) {
  const mode = MODES[modeKey];
  document.getElementById('play-mode-label').textContent = mode.label;
  // タイマー表示の有無
  document.getElementById('timer-wrap').hidden = !mode.timed;
  showScreen('play');
  game.start(modeKey, opts);
  els.guideBtn.classList.toggle('on', game.showGuide);
}

// --- プレイ中のボタン ---
els.guideBtn.addEventListener('click', () => {
  const on = game.toggleGuide();
  els.guideBtn.classList.toggle('on', on);
});
document.getElementById('quit-btn').addEventListener('click', () => {
  game.running = false;
  if (game.timerId) clearInterval(game.timerId);
  keyboard.clearGuide();
  showScreen('home');
});

// --- 結果画面のボタン ---
document.getElementById('retry-btn').addEventListener('click', () => {
  showScreen('home');
});

showScreen('home');
