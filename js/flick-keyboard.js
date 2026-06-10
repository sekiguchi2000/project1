// フリックキーボード: 描画とジェスチャー検出
// 通常キー確定で onInput(char)、「小゛゜」キーで onModifier() を呼ぶ。

class FlickKeyboard {
  constructor(rootEl) {
    this.root = rootEl;
    this.onInput = () => {};
    this.onModifier = () => {};
    this.threshold = 26; // タップ/フリック判定の距離(px)
    this.keyEls = {};
    this.active = null;
    this.guide = null;
    this._build();
  }

  // Gboard(Android)風のかな入力配列（5列×4行）。中央3列が文字キー、左右が機能キー。
  // 機能キーは見た目だけ（反応しない）。'mod'(小゛゜)と文字キーのみ動作する。
  static LAYOUT = [
    ['sym',   'a',   'ka', 'sa',   'del'],
    ['abc',   'ta',  'na', 'ha',   'henkan'],
    ['aA1',   'ma',  'ya', 'ra',   'space'],
    ['globe', 'mod', 'wa', 'mark', 'enter'],
  ];
  static FN = {
    sym:    { t: '☆123' },
    del:    { t: '⌫' },
    abc:    { t: 'ABC' },
    henkan: { t: '変換' },
    aA1:    { t: 'あA1' },
    space:  { t: '空白' },
    globe:  { t: '🌐' },
    enter:  { t: '⏎', cls: 'key-enter' },
  };

  _build() {
    this.root.innerHTML = '';
    this.root.classList.add('keyboard');

    // Gboard風ツールバー（装飾・反応しない）
    const bar = document.createElement('div');
    bar.className = 'kb-toolbar';
    bar.innerHTML = '<span class="kb-g">G</span>'
      + '<span class="kb-tool">🔍</span><span class="kb-tool">GIF</span>'
      + '<span class="kb-tool">😀</span><span class="kb-tool">⚙️</span>'
      + '<span class="kb-tool kb-more">⋯</span>';
    this.root.appendChild(bar);

    const grid = document.createElement('div');
    grid.className = 'key-grid';
    const byId = {};
    for (const k of FLICK_KEYS) byId[k.id] = k;

    FlickKeyboard.LAYOUT.forEach((row, r) => {
      row.forEach((id, c) => {
        const key = byId[id];
        if (key) {
          const cell = this._makeKeyCell(key);
          cell.style.gridColumn = String(c + 1);
          cell.style.gridRow = String(r + 1);
          grid.appendChild(cell);
          return;
        }
        const fn = FlickKeyboard.FN[id];
        if (!fn) return;
        const cell = document.createElement('div');
        cell.className = 'key key-fn' + (fn.cls ? ' ' + fn.cls : '');
        cell.textContent = fn.t;
        cell.style.gridColumn = String(c + 1);
        cell.style.gridRow = String(r + 1);
        grid.appendChild(cell);
      });
    });
    this.root.appendChild(grid);
  }

  _makeKeyCell(key) {
    const cell = document.createElement('div');
    cell.className = 'key';
    cell.dataset.keyId = key.id;
    if (key.isModifier) cell.classList.add('key-mod');

    const main = document.createElement('span');
    main.className = 'key-main';
    main.textContent = key.center;
    cell.appendChild(main);

    if (!key.isModifier) {
      const popup = document.createElement('div');
      popup.className = 'flick-popup';
      for (const dir of ['up', 'down', 'left', 'right', 'center']) {
        const ch = dir === 'center' ? key.center : key.flicks[dir];
        if (!ch) continue;
        const seg = document.createElement('span');
        seg.className = 'flick-seg flick-' + dir;
        seg.textContent = ch;
        seg.dataset.dir = dir;
        popup.appendChild(seg);
      }
      cell.appendChild(popup);
    }

    this.keyEls[key.id] = cell;
    this._bindPointer(cell, key);
    return cell;
  }

  _bindPointer(cell, key) {
    const start = (x, y) => {
      this.active = { key, startX: x, startY: y, dir: 'center' };
      cell.classList.add('pressed');
      if (!key.isModifier) this._updatePopup(cell, 'center');
    };
    const move = (x, y) => {
      if (!this.active || this.active.key !== key || key.isModifier) return;
      const dir = this._dirFor(x - this.active.startX, y - this.active.startY, key);
      this.active.dir = dir;
      this._updatePopup(cell, dir);
    };
    const end = () => {
      if (!this.active || this.active.key !== key) return;
      const dir = this.active.dir;
      cell.classList.remove('pressed');
      this._clearPopup(cell);
      this.active = null;
      if (key.isModifier) { this.onModifier(); return; }
      const ch = dir === 'center' ? key.center : key.flicks[dir];
      if (ch) this.onInput(ch);
    };
    const cancel = () => {
      cell.classList.remove('pressed');
      this._clearPopup(cell);
      this.active = null;
    };

    cell.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; start(t.clientX, t.clientY); }, { passive: false });
    cell.addEventListener('touchmove',  (e) => { e.preventDefault(); const t = e.changedTouches[0]; move(t.clientX, t.clientY); }, { passive: false });
    cell.addEventListener('touchend',   (e) => { e.preventDefault(); end(); }, { passive: false });
    cell.addEventListener('touchcancel', cancel);

    cell.addEventListener('mousedown', (e) => {
      e.preventDefault();
      start(e.clientX, e.clientY);
      const onMove = (ev) => move(ev.clientX, ev.clientY);
      const onUp = () => { end(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  _dirFor(dx, dy, key) {
    if (Math.hypot(dx, dy) < this.threshold) return 'center';
    let dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    return key.flicks[dir] ? dir : 'center';
  }

  _updatePopup(cell, dir) {
    cell.classList.add('show-popup');
    cell.querySelectorAll('.flick-seg').forEach((s) => s.classList.toggle('active', s.dataset.dir === dir));
  }
  _clearPopup(cell) {
    cell.classList.remove('show-popup');
    cell.querySelectorAll('.flick-seg').forEach((s) => s.classList.remove('active'));
  }

  // 次に打つ文字のキー・方向・「小゛゜」回数をハイライト（学習ガイド）
  setGuide(char) {
    this.clearGuide();
    if (!char) return;
    const g = flickGuideFor(char);
    if (!g) return;
    this.guide = g;
    const cell = this.keyEls[g.keyId];
    if (cell) { cell.classList.add('guide'); cell.dataset.guideDir = g.direction; }
    if (g.mods > 0) {
      const mod = this.keyEls['mod'];
      if (mod) { mod.classList.add('guide-mod'); mod.dataset.mods = g.mods; }
    }
  }
  clearGuide() {
    if (this.guide) {
      const cell = this.keyEls[this.guide.keyId];
      if (cell) { cell.classList.remove('guide'); delete cell.dataset.guideDir; }
      const mod = this.keyEls['mod'];
      if (mod) { mod.classList.remove('guide-mod'); delete mod.dataset.mods; }
      this.guide = null;
    }
  }

  flashWrong() {
    if (navigator.vibrate) navigator.vibrate(40);
    this.root.classList.remove('shake');
    void this.root.offsetWidth;
    this.root.classList.add('shake');
  }
}
