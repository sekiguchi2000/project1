// 画面遷移・UI・マスコット・キーボード配置のまとめ

const screens = ['home', 'stages', 'group', 'play', 'rpg', 'result']
  .reduce((o, k) => (o['screen-' + k] = document.getElementById('screen-' + k), o), {});

function showScreen(name) {
  Object.entries(screens).forEach(([id, el]) => el.classList.toggle('active', id === 'screen-' + name));
}

// マスコットSVGを各スロットへ
const mascotTpl = document.getElementById('mascot-svg');
document.querySelectorAll('.mascot-slot').forEach((slot) => {
  slot.appendChild(mascotTpl.content.cloneNode(true));
});
function setMood(selector, mood) {
  document.querySelectorAll(selector).forEach((s) => (s.dataset.mood = mood));
}
function flashMood(selector, mood, ms = 900) {
  setMood(selector, mood);
  clearTimeout(flashMood._t);
  flashMood._t = setTimeout(() => setMood(selector, 'idle'), ms);
}

// 単一キーボードを使い回す
const keyboard = new FlickKeyboard(document.createElement('div'));
function mountKeyboard(slotId) { document.getElementById(slotId).appendChild(keyboard.root); }

// ---- ホーム表示の更新 ----
function refreshHome() {
  const s = Storage.load();
  document.getElementById('home-level').textContent = s.level;
  document.getElementById('stages-level').textContent = s.level;
  document.getElementById('home-coins').textContent = '🪙 ' + s.coins;
  const need = xpForLevel(s.level);
  document.getElementById('home-xp-fill').style.width = Math.min(100, (s.xp / need) * 100) + '%';
  document.getElementById('home-xp-text').textContent = s.xp + ' / ' + need;
}

// ===========================================================
// アーケード用 UI
// ===========================================================
const els = {
  prompt: document.getElementById('prompt'),
  score: document.getElementById('stat-score'), combo: document.getElementById('stat-combo'),
  accuracy: document.getElementById('stat-accuracy'), cpm: document.getElementById('stat-cpm'),
  timer: document.getElementById('timer'), guideBtn: document.getElementById('guide-toggle'),
};
function renderWord(container, text, charIndex) {
  container.innerHTML = '';
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.className = 'ch' + (i < charIndex ? ' done' : i === charIndex ? ' cur' : '');
    span.textContent = text[i];
    container.appendChild(span);
  }
}
const arcadeUI = {
  showPrompt(text, ci) { renderWord(els.prompt, text, ci); },
  markCorrect(ci) {
    els.prompt.querySelectorAll('.ch').forEach((c, i) => {
      c.classList.toggle('done', i < ci); c.classList.toggle('cur', i === ci);
      if (i === ci) c.textContent = game.prompt.text[i]; // pending表示を確定文字へ戻す
    });
    pop(els.prompt, 'hit');
  },
  markPending(ci, ch) {
    const cur = els.prompt.querySelectorAll('.ch')[ci];
    if (cur) { cur.textContent = ch; cur.classList.add('pending'); }
  },
  markWrong() { pop(els.prompt, 'miss'); },
  updateStats(s) {
    els.score.textContent = s.score; els.combo.textContent = s.combo;
    els.accuracy.textContent = s.accuracy + '%'; els.cpm.textContent = s.cpm;
  },
  updateTimer(r) { els.timer.textContent = r.toFixed(1); },
  showResult(stats) {
    showResultScreen({
      title: 'けっか', mood: stats.rank === 'D' ? 'idle' : 'happy', rank: stats.rank,
      isNew: stats.isNew, leveled: 0,
      grid: [
        ['スコア', stats.score], ['ベスト', stats.best],
        ['正確率', stats.accuracy + '%'], ['文字/分', stats.cpm],
        ['最大コンボ', stats.maxCombo], ['ミス', stats.mistakes],
      ],
      again: () => startArcade(game.modeKey, lastArcadeOpts),
    });
  },
};

function pop(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

// ===========================================================
// RPG 用 UI
// ===========================================================
const rpgEls = {
  arena: document.getElementById('rpg-arena'),
  monster: document.getElementById('rpg-monster'),
  monsterName: document.getElementById('rpg-monster-name'),
  mhp: document.getElementById('rpg-mhp'), atk: document.getElementById('rpg-atk'),
  php: document.getElementById('rpg-php'), phpText: document.getElementById('rpg-php-text'),
  level: document.getElementById('rpg-level'), stageName: document.getElementById('rpg-stage-name'),
  progress: document.getElementById('rpg-progress'), prompt: document.getElementById('rpg-prompt'),
  fx: document.getElementById('rpg-fx'), speech: document.getElementById('rpg-speech'),
};
const rpgUI = {
  rpgSetup(stage, level, hp, maxHp) {
    rpgEls.stageName.textContent = stage.name;
    rpgEls.level.textContent = level;
    rpgEls.arena.className = 'rpg-arena ' + stage.bg;
    this.setPlayerHp(hp, maxHp);
    setMood('.mascot-battle', 'idle');
  },
  showMonster(m, idx, total) {
    rpgEls.monster.textContent = m.emoji;
    rpgEls.monster.classList.toggle('boss', !!m.isBoss);
    rpgEls.monsterName.textContent = (m.isBoss ? '★ ' : '') + m.name;
    rpgEls.progress.textContent = idx + '/' + total;
    pop(rpgEls.monster, 'enter');
  },
  setMonsterHp(r) { rpgEls.mhp.style.width = Math.max(0, r * 100) + '%'; },
  setAtkGauge(r) { rpgEls.atk.style.width = (r * 100) + '%'; rpgEls.atk.classList.toggle('full', r > 0.8); },
  setPlayerHp(cur, max) {
    rpgEls.php.style.width = Math.max(0, (cur / max) * 100) + '%';
    rpgEls.php.classList.toggle('low', cur / max < 0.3);
    rpgEls.phpText.textContent = Math.max(0, Math.ceil(cur)) + '/' + max;
  },
  showWord(word, ci) { renderWord(rpgEls.prompt, word, ci); if (rpgGuideOn) keyboard.setGuide(word[ci]); },
  guideChar(ch) { if (rpgGuideOn) keyboard.setGuide(ch); },
  wordAdvance(ci) {
    rpgEls.prompt.querySelectorAll('.ch').forEach((c, i) => {
      c.classList.toggle('done', i <= ci); c.classList.toggle('cur', i === ci + 1);
    });
  },
  wordPending(ci, ch) {
    const cur = rpgEls.prompt.querySelectorAll('.ch')[ci];
    if (cur) { cur.textContent = ch; cur.classList.add('pending'); }
  },
  wordWrong() { pop(rpgEls.prompt, 'miss'); flashMood('.mascot-battle', 'hurt', 400); },
  damageMonster(amount, crit) {
    pop(rpgEls.monster, 'hurt');
    spawnPopup(rpgEls.fx, '-' + amount, crit ? 'crit' : 'dmg');
  },
  monsterDefeated(xp) {
    rpgEls.monster.classList.add('dead');
    spawnPopup(rpgEls.fx, '+' + xp + ' XP', 'xp');
    flashMood('.mascot-battle', 'happy', 1200);
  },
  playerHurt(amount, hp, max) {
    this.setPlayerHp(hp, max);
    pop(rpgEls.arena, 'shake-arena');
    flashMood('.mascot-battle', 'hurt', 700);
    spawnPopup(rpgEls.fx, '-' + amount, 'player-dmg');
    if (navigator.vibrate) navigator.vibrate(60);
  },
  mascotSay(text, mood) {
    rpgEls.speech.textContent = text; rpgEls.speech.hidden = false;
    clearTimeout(rpgUI._st);
    rpgUI._st = setTimeout(() => (rpgEls.speech.hidden = true), 1400);
  },
  stageClear(r) {
    showResultScreen({
      title: 'ステージクリア！', mood: 'happy', isNew: false, leveled: r.leveled, level: r.level,
      grid: [
        ['ステージ', r.stage.name], ['もらったXP', '+' + r.xp],
        ['コイン', '🪙 +' + r.coins], ['最大コンボ', r.maxCombo],
      ],
      note: r.nextUnlocked ? '✨ つぎのステージが あいたよ！' : '🏆 ぜんステージ クリア！',
      again: () => showStages(),
      againLabel: 'マップへ',
    });
  },
  rpgGameOver(r) {
    showResultScreen({
      title: 'やられた…', mood: 'hurt', isNew: false, leveled: r.leveled, level: r.level,
      grid: [['もらったXP', '+' + r.xp], ['コイン', '🪙 +' + r.coins]],
      note: 'レベルを あげて さいちょうせん！',
      again: () => startStage(currentStageId),
      againLabel: 'リトライ',
    });
  },
};

function spawnPopup(layer, text, cls) {
  const el = document.createElement('div');
  el.className = 'popup ' + cls;
  el.textContent = text;
  el.style.left = (30 + Math.random() * 40) + '%';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ===========================================================
// 結果画面（共通）
// ===========================================================
function showResultScreen(cfg) {
  document.getElementById('result-title').textContent = cfg.title;
  const rankEl = document.getElementById('result-rank');
  if (cfg.rank) { rankEl.hidden = false; rankEl.textContent = cfg.rank; rankEl.dataset.rank = cfg.rank; }
  else rankEl.hidden = true;
  document.getElementById('result-new').hidden = !cfg.isNew;
  const lvl = document.getElementById('result-levelup');
  if (cfg.leveled) { lvl.hidden = false; document.getElementById('result-newlevel').textContent = cfg.level; }
  else lvl.hidden = true;

  const grid = document.getElementById('result-grid');
  grid.innerHTML = '';
  for (const [k, v] of cfg.grid) {
    const d = document.createElement('div');
    d.className = 'rstat';
    d.innerHTML = `<span>${k}</span><b>${v}</b>`;
    grid.appendChild(d);
  }
  let note = document.getElementById('result-note');
  if (cfg.note) {
    if (!note) { note = document.createElement('p'); note.id = 'result-note'; note.className = 'result-note'; grid.after(note); }
    note.textContent = cfg.note; note.hidden = false;
  } else if (note) note.hidden = true;

  setMood('.mascot-result', cfg.mood || 'happy');
  const againBtn = document.getElementById('result-again');
  againBtn.textContent = cfg.againLabel || 'もういちど';
  againBtn.onclick = cfg.again;
  showScreen('result');
}

// ===========================================================
// インスタンスと起動フロー
// ===========================================================
const game = new Game({ keyboard, ui: arcadeUI });
const rpg = new RPG({ keyboard, ui: rpgUI });

let lastArcadeOpts = {};
let pendingMode = null;
let currentStageId = 1;
let rpgGuideOn = true;

function startArcade(modeKey, opts) {
  lastArcadeOpts = opts;
  const mode = MODES[modeKey];
  document.getElementById('play-mode-label').textContent = mode.label;
  document.getElementById('timer-wrap').hidden = !mode.timed;
  mountKeyboard('play-kb');
  showScreen('play');
  game.start(modeKey, opts);
  els.guideBtn.classList.toggle('on', game.showGuide);
}

function startStage(stageId) {
  currentStageId = stageId;
  mountKeyboard('rpg-kb');
  showScreen('rpg');
  rpg.startStage(stageId);
}

// ---- ステージ一覧 ----
function showStages() {
  const s = Storage.load();
  document.getElementById('stages-level').textContent = s.level;
  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  RPG_STAGES.forEach((stage, i) => {
    const cleared = s.clearedStages.includes(stage.id);
    const unlocked = i === 0 || s.clearedStages.includes(RPG_STAGES[i - 1].id);
    const btn = document.createElement('button');
    btn.className = 'btn stage-card ' + stage.bg + (unlocked ? '' : ' locked');
    btn.innerHTML = `
      <span class="stage-num">${stage.id}</span>
      <span class="stage-info"><b>${stage.name}</b>
        <small>${unlocked ? (cleared ? '✅ クリアずみ' : 'ボス：' + stage.boss.name) : '🔒 まだ あけられない'}</small></span>
      <span class="stage-go">${unlocked ? '▶' : '🔒'}</span>`;
    if (unlocked) btn.addEventListener('click', () => startStage(stage.id));
    list.appendChild(btn);
  });
  showScreen('stages');
}

// ---- 行選択(きそ) ----
const groupGrid = document.getElementById('group-grid');
Object.entries(GROUP_LABELS).forEach(([key, label]) => {
  const btn = document.createElement('button');
  btn.className = 'btn group-btn';
  btn.textContent = label;
  btn.addEventListener('click', () => startArcade('basic', { group: key }));
  groupGrid.appendChild(btn);
});
document.getElementById('group-all').addEventListener('click', () => startArcade('basic', { group: null }));

// ---- イベントバインド ----
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  const m = b.dataset.mode;
  if (MODES[m].needsGroup) { pendingMode = m; showScreen('group'); }
  else startArcade(m, {});
}));
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
  const dest = b.dataset.go;
  game.quit(); rpg.quit();
  if (dest === 'home') { refreshHome(); showScreen('home'); }
  else if (dest === 'stages') showStages();
}));
els.guideBtn.addEventListener('click', () => els.guideBtn.classList.toggle('on', game.toggleGuide()));

// ミュート
const muteBtn = document.getElementById('mute-btn');
function refreshMute() { muteBtn.textContent = sound.enabled ? '🔊' : '🔇'; }
muteBtn.addEventListener('click', () => { sound.toggle(); refreshMute(); });
refreshMute();

// 起動
refreshHome();
showScreen('home');
