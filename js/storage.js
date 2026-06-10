// 進行データ・ハイスコアの保存（localStorage）
const Storage = {
  _key: 'flick_save_v1',

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return this._default();
  },

  _default() {
    return {
      level: 1,
      xp: 0,
      coins: 0,
      clearedStages: [],   // クリア済みステージID
      bestScores: {},      // modeKey -> ベストスコア
      totalChars: 0,       // 累計入力文字数
    };
  },

  save(data) {
    try { localStorage.setItem(this._key, JSON.stringify(data)); } catch (e) { /* ignore */ }
  },

  reset() {
    localStorage.removeItem(this._key);
  },
};

// レベルに必要な累計XP（ゆるやかに増加）
function xpForLevel(level) {
  return Math.round(20 * Math.pow(level, 1.5));
}

// プレイヤーの強さ（レベル依存）
function playerStats(level) {
  return {
    maxHp: 40 + level * 12,
    attack: 6 + level * 2,        // 1文字あたりの基本ダメージ
  };
}
