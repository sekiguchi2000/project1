// かわいいマスコット(スライム)アイコンを描いてPNG出力するスクリプト
// 外部ライブラリ不使用。zlibでPNGを手書きエンコードする。
const zlib = require('zlib');
const fs = require('fs');

function lerp(a, b, t) { return a + (b - a) * t; }
function hex(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }

function makeIcon(size, { maskable = false } = {}) {
  const W = size, H = size;
  const buf = Buffer.alloc(W * H * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    const ba = buf[i+3] / 255, sa = a / 255, oa = sa + ba * (1 - sa);
    if (oa === 0) return;
    buf[i]   = Math.round((r*sa + buf[i]  *ba*(1-sa)) / oa);
    buf[i+1] = Math.round((g*sa + buf[i+1]*ba*(1-sa)) / oa);
    buf[i+2] = Math.round((b*sa + buf[i+2]*ba*(1-sa)) / oa);
    buf[i+3] = Math.round(oa * 255);
  };
  const disc = (cx, cy, rad, col, sh = 1) => {
    for (let y = Math.floor(cy-rad); y <= cy+rad; y++)
      for (let x = Math.floor(cx-rad/sh); x <= cx+rad/sh; x++) {
        const dx = (x-cx)*sh, dy = y-cy;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d <= rad) { const aa = Math.min(1, (rad-d)); set(x, y, col[0], col[1], col[2], 255*aa); }
      }
  };

  // 背景グラデーション(ピーチ→ピンク)
  const top = hex('#ffe0b8'), bot = hex('#ffb3c8');
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = lerp(top[0], bot[0], t), g = lerp(top[1], bot[1], t), b = lerp(top[2], bot[2], t);
    for (let x = 0; x < W; x++) { const i = (y*W+x)*4; buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255; }
  }

  const cx = W/2;
  const scale = maskable ? 0.62 : 0.78; // maskableは安全領域に収める
  const bodyR = W * 0.30 * (scale/0.78);
  const cy = H * 0.56;
  const mint = hex('#6fd6b0'), mintDark = hex('#4fb591');

  // 影
  disc(cx, cy + bodyR*0.85, bodyR*0.8, hex('#e88aa3'), 2.4);
  // 体(スライム)
  disc(cx, cy, bodyR, mint);
  disc(cx, cy - bodyR*0.15, bodyR*0.96, mint); // 上を少し丸く
  // ほっぺ
  disc(cx - bodyR*0.55, cy + bodyR*0.12, bodyR*0.18, hex('#ff9bb3'));
  disc(cx + bodyR*0.55, cy + bodyR*0.12, bodyR*0.18, hex('#ff9bb3'));
  // 目
  const eyeY = cy - bodyR*0.1, eyeDx = bodyR*0.38, eyeR = bodyR*0.22;
  disc(cx - eyeDx, eyeY, eyeR, hex('#ffffff'));
  disc(cx + eyeDx, eyeY, eyeR, hex('#ffffff'));
  disc(cx - eyeDx, eyeY + eyeR*0.15, eyeR*0.62, hex('#2c2c3a'));
  disc(cx + eyeDx, eyeY + eyeR*0.15, eyeR*0.62, hex('#2c2c3a'));
  disc(cx - eyeDx - eyeR*0.2, eyeY - eyeR*0.25, eyeR*0.22, hex('#ffffff')); // ハイライト
  disc(cx + eyeDx - eyeR*0.2, eyeY - eyeR*0.25, eyeR*0.22, hex('#ffffff'));
  // 口(にこっ): 放物線に沿って点を打つ
  const mw = bodyR*0.34, my = cy + bodyR*0.34;
  for (let t = -1; t <= 1; t += 0.02) {
    const mx = cx + t*mw, myy = my + (1 - t*t)*bodyR*0.12 - bodyR*0.06;
    disc(mx, myy, bodyR*0.045, mintDark);
  }

  return encodePNG(W, H, buf);
}

function encodePNG(W, H, rgba) {
  const raw = Buffer.alloc((W*4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y*(W*4+1)] = 0; // filter none
    rgba.copy(raw, y*(W*4+1)+1, y*W*4, (y+1)*W*4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8bit, RGBA
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const CRC_TABLE = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c ^ 0xffffffff; }

fs.writeFileSync('icons/icon-192.png', makeIcon(192));
fs.writeFileSync('icons/icon-512.png', makeIcon(512));
fs.writeFileSync('icons/icon-maskable-512.png', makeIcon(512, { maskable: true }));
fs.writeFileSync('icons/apple-touch-icon.png', makeIcon(180));
console.log('icons generated');
