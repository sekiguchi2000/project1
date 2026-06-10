// フリックキーボード: 描画とジェスチャー検出を担当
// 文字が確定したら onInput(char) コールバックを呼ぶ。

class FlickKeyboard {
  constructor(rootEl, onInput) {
    this.root = rootEl;
    this.onInput = onInput;
    this.threshold = 28; // タップ/フリックを判定する移動距離(px)
    this.keyEls = {};    // keyId -> element
    this.active = null;  // 現在ドラッグ中のキー情報
    this.guide = null;   // { keyId, direction } ハイライト用
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    this.root.classList.add('keyboard');

    for (const key of FLICK_KEYS) {
      const cell = document.createElement('div');
      cell.className = 'key';
      if (!key.center) {
        cell.classList.add('key-blank');
        this.root.appendChild(cell);
        continue;
      }
      cell.dataset.keyId = key.id;

      const main = document.createElement('span');
      main.className = 'key-main';
      main.textContent = key.center;
      cell.appendChild(main);

      // フリック方向のミニ表示（タップ中に出るポップアップの素）
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

      this.keyEls[key.id] = cell;
      this._bindPointer(cell, key);
      this.root.appendChild(cell);
    }
  }

  _bindPointer(cell, key) {
    const start = (clientX, clientY) => {
      this.active = { key, startX: clientX, startY: clientY, dir: 'center' };
      cell.classList.add('pressed');
      this._updatePopup(cell, 'center');
    };

    const move = (clientX, clientY) => {
      if (!this.active || this.active.key !== key) return;
      const dir = this._dirFor(clientX - this.active.startX, clientY - this.active.startY, key);
      this.active.dir = dir;
      this._updatePopup(cell, dir);
    };

    const end = () => {
      if (!this.active || this.active.key !== key) return;
      const dir = this.active.dir;
      const ch = dir === 'center' ? key.center : key.flicks[dir];
      cell.classList.remove('pressed');
      this._clearPopup(cell);
      this.active = null;
      if (ch) this.onInput(ch);
    };

    // タッチ
    cell.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      start(t.clientX, t.clientY);
    }, { passive: false });
    cell.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      move(t.clientX, t.clientY);
    }, { passive: false });
    cell.addEventListener('touchend', (e) => {
      e.preventDefault();
      end();
    }, { passive: false });
    cell.addEventListener('touchcancel', () => {
      cell.classList.remove('pressed');
      this._clearPopup(cell);
      this.active = null;
    });

    // マウス（PCでの動作確認用）
    cell.addEventListener('mousedown', (e) => {
      e.preventDefault();
      start(e.clientX, e.clientY);
      const onMove = (ev) => move(ev.clientX, ev.clientY);
      const onUp = () => {
        end();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  // 移動量から方向を決定。利用可能な方向のみ返し、無ければ center。
  _dirFor(dx, dy, key) {
    const dist = Math.hypot(dx, dy);
    if (dist < this.threshold) return 'center';
    let dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }
    return key.flicks[dir] ? dir : 'center';
  }

  _updatePopup(cell, dir) {
    cell.classList.add('show-popup');
    cell.querySelectorAll('.flick-seg').forEach((seg) => {
      seg.classList.toggle('active', seg.dataset.dir === dir);
    });
  }

  _clearPopup(cell) {
    cell.classList.remove('show-popup');
    cell.querySelectorAll('.flick-seg').forEach((seg) => seg.classList.remove('active'));
  }

  // 次に打つ文字のキーと方向をハイライト（学習ガイド）
  setGuide(char) {
    this.clearGuide();
    if (!char) return;
    const info = CHAR_TO_FLICK[char];
    if (!info) return;
    this.guide = info;
    const cell = this.keyEls[info.keyId];
    if (!cell) return;
    cell.classList.add('guide');
    cell.dataset.guideDir = info.direction;
  }

  clearGuide() {
    if (this.guide) {
      const cell = this.keyEls[this.guide.keyId];
      if (cell) {
        cell.classList.remove('guide');
        delete cell.dataset.guideDir;
      }
      this.guide = null;
    }
  }

  // 入力ミスのフィードバック（軽い振動＋点滅）
  flashWrong() {
    if (navigator.vibrate) navigator.vibrate(40);
    this.root.classList.remove('shake');
    void this.root.offsetWidth; // reflow でアニメ再生
    this.root.classList.add('shake');
  }
}
