// ============================================================
// ぼうけんモード（RPG）: 言葉を打ってモンスターを倒す
// ============================================================

const RPG_STAGES = [
  {
    id: 1, name: 'はじまりの くさはら', tier: 'easy', bg: 'stage-grass',
    monsters: [
      { name: 'スライム', emoji: '🟢', hp: 45, atk: 6, interval: 6.5 },
      { name: 'こうもり', emoji: '🦇', hp: 55, atk: 7, interval: 6 },
      { name: 'きのこせい', emoji: '🍄', hp: 65, atk: 8, interval: 5.5 },
    ],
    boss: { name: 'いわゴーレム', emoji: '🗿', hp: 150, atk: 11, interval: 5 },
  },
  {
    id: 2, name: 'ひかりの どうくつ', tier: 'easy', bg: 'stage-cave',
    monsters: [
      { name: 'おばけ', emoji: '👻', hp: 70, atk: 8, interval: 5.5 },
      { name: 'コウモリ王', emoji: '🦇', hp: 85, atk: 9, interval: 5 },
      { name: 'むしむし', emoji: '🐛', hp: 95, atk: 10, interval: 5 },
    ],
    boss: { name: 'どくグモ', emoji: '🕷️', hp: 200, atk: 13, interval: 4.5 },
  },
  {
    id: 3, name: 'そらの しろ', tier: 'normal', bg: 'stage-sky',
    monsters: [
      { name: 'はりねずみ', emoji: '🦔', hp: 110, atk: 10, interval: 5 },
      { name: 'わるいとり', emoji: '🦅', hp: 130, atk: 12, interval: 4.5 },
      { name: 'ゆきだま', emoji: '⛄', hp: 150, atk: 13, interval: 4.5 },
    ],
    boss: { name: 'ドラゴン', emoji: '🐉', hp: 280, atk: 16, interval: 4 },
  },
  {
    id: 4, name: 'まおうの とう', tier: 'hard', bg: 'stage-tower',
    monsters: [
      { name: 'がいこつ', emoji: '💀', hp: 160, atk: 13, interval: 4.5 },
      { name: 'まじゅう', emoji: '👹', hp: 190, atk: 15, interval: 4 },
      { name: 'やみのめ', emoji: '👁️', hp: 220, atk: 16, interval: 4 },
    ],
    boss: { name: 'まおう', emoji: '😈', hp: 400, atk: 20, interval: 3.8 },
  },
];

const CHEERS = ['いいかんじ！', 'その ちょうし！', 'つよい！', 'ナイス！', 'すごい！', 'やるね！'];

class RPG {
  constructor({ keyboard, ui }) {
    this.keyboard = keyboard;
    this.ui = ui;
    this.running = false;
    this.paused = false;
    this._loopBound = (ts) => this._loop(ts);
  }

  bind() {
    this.keyboard.onInput = (ch) => this.onChar(ch);
    this.keyboard.onModifier = () => this.onMod();
  }

  startStage(stageId) {
    this.stage = RPG_STAGES.find((s) => s.id === stageId);
    if (!this.stage) return;
    this.save = Storage.load();
    const st = playerStats(this.save.level);
    this.maxHp = st.maxHp;
    this.hp = st.maxHp;
    this.attack = st.attack;
    this.combo = 0;
    this.maxCombo = 0;
    this.gainedXp = 0;
    this.gainedCoins = 0;
    this.queue = [...this.stage.monsters, { ...this.stage.boss, isBoss: true }];
    this.monsterIndex = 0;
    this.totalMonsters = this.queue.length;

    this.bind();
    this.ui.rpgSetup(this.stage, this.save.level, this.hp, this.maxHp);
    this._spawnMonster();

    this.running = true;
    this.paused = false;
    this._last = performance.now();
    requestAnimationFrame(this._loopBound);
  }

  _spawnMonster() {
    this.monster = this.queue[this.monsterIndex];
    this.monsterHp = this.monster.hp;
    this.atkGauge = 0;
    this.ui.showMonster(this.monster, this.monsterIndex + 1, this.totalMonsters);
    this.ui.setMonsterHp(1);
    this.ui.setAtkGauge(0);
    this._nextWord();
  }

  _nextWord() {
    const pool = WORD_POOLS[this.stage.tier] || WORD_POOLS.easy;
    this.word = pool[Math.floor(Math.random() * pool.length)];
    this.ci = 0;
    this.matcher = new CharMatcher(this.word[0]);
    this.ui.showWord(this.word, 0);
  }

  // ---- 入力処理 ----
  onChar(ch) {
    if (!this.running || this.paused) return;
    sound.tap();
    this._apply(this.matcher.feedChar(ch));
  }
  onMod() {
    if (!this.running || this.paused) return;
    this._apply(this.matcher.feedMod());
  }
  _apply(result) {
    if (result === 'correct') {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.save.totalChars++;
      const dmg = this.attack + Math.floor(this.combo / 3) * 2;
      this._damageMonster(dmg);
      this.ui.wordAdvance(this.ci);
      sound.correct();
      this.ci++;
      if (this.ci >= this.word.length) {
        this._nextWord();
      } else {
        this.matcher = new CharMatcher(this.word[this.ci]);
        this.ui.guideChar(this.word[this.ci]);
      }
    } else if (result === 'pending') {
      this.ui.wordPending(this.ci, this.matcher.current);
    } else {
      this.combo = 0;
      this.ui.wordWrong();
      this.keyboard.flashWrong();
      sound.wrong();
    }
  }

  _damageMonster(dmg) {
    if (!this.monster) return;
    this.monsterHp -= dmg;
    const crit = this.combo >= 10 && this.combo % 5 === 0;
    this.ui.damageMonster(crit ? dmg * 2 : dmg, crit);
    if (crit) this.monsterHp -= dmg; // クリティカル追加
    sound.hit();
    this.ui.setMonsterHp(Math.max(0, this.monsterHp) / this.monster.hp);
    if (this.monsterHp <= 0) this._defeatMonster();
  }

  _defeatMonster() {
    const m = this.monster;
    const xp = Math.round(m.hp / 3) + (m.isBoss ? 30 : 0);
    const coins = Math.round(m.hp / 8) + (m.isBoss ? 20 : 0);
    this.gainedXp += xp;
    this.gainedCoins += coins;
    this.monster = null;
    sound.defeat();
    this.ui.monsterDefeated(xp);
    this.ui.mascotSay(CHEERS[Math.floor(Math.random() * CHEERS.length)], 'happy');

    this.paused = true;
    setTimeout(() => {
      this.monsterIndex++;
      if (this.monsterIndex >= this.queue.length) {
        this._stageClear();
      } else {
        this.paused = false;
        this._spawnMonster();
      }
    }, 900);
  }

  // ---- 敵の攻撃ループ ----
  _loop(ts) {
    if (!this.running) return;
    const dt = (ts - this._last) / 1000;
    this._last = ts;
    if (!this.paused && this.monster) {
      this.atkGauge += dt;
      this.ui.setAtkGauge(Math.min(1, this.atkGauge / this.monster.interval));
      if (this.atkGauge >= this.monster.interval) {
        this.atkGauge = 0;
        this._monsterAttack();
      }
    }
    requestAnimationFrame(this._loopBound);
  }

  _monsterAttack() {
    this.hp -= this.monster.atk;
    this.combo = 0;
    sound.damage();
    this.ui.playerHurt(this.monster.atk, this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.hp = 0;
      this.ui.setPlayerHp(0, this.maxHp);
      this._gameOver();
    }
  }

  // ---- 終了処理 ----
  _applyRewards() {
    this.save.xp += this.gainedXp;
    this.save.coins += this.gainedCoins;
    let leveled = 0;
    while (this.save.xp >= xpForLevel(this.save.level)) {
      this.save.xp -= xpForLevel(this.save.level);
      this.save.level++;
      leveled++;
    }
    Storage.save(this.save);
    return leveled;
  }

  _stageClear() {
    this.running = false;
    if (!this.save.clearedStages.includes(this.stage.id)) {
      this.save.clearedStages.push(this.stage.id);
    }
    const leveled = this._applyRewards();
    sound.clear();
    if (leveled) sound.levelup();
    this.ui.stageClear({
      stage: this.stage,
      xp: this.gainedXp,
      coins: this.gainedCoins,
      leveled,
      level: this.save.level,
      maxCombo: this.maxCombo,
      nextUnlocked: RPG_STAGES.some((s) => s.id === this.stage.id + 1),
    });
  }

  _gameOver() {
    this.running = false;
    // 倒したぶんの報酬は獲得（がんばりを無駄にしない）
    const leveled = this._applyRewards();
    sound.gameover();
    this.ui.rpgGameOver({
      stage: this.stage,
      xp: this.gainedXp,
      coins: this.gainedCoins,
      leveled,
      level: this.save.level,
    });
  }

  quit() {
    this.running = false;
    this.paused = false;
    this.keyboard.clearGuide();
  }
}
