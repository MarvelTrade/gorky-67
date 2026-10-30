import { LIVERIES } from '../config.js';

// Окраски вертолёта: из спрайта 'heli' (70×48, нос вправо) при загрузке рисуется по текстуре
// heli_<id> на каждую окраску из LIVERIES. Один раз, в BootScene — в бою только setTexture.
// Светотень и контуры берутся из спрайта (яркость пикселя × цвет камуфляжа), остекление
// кабины не красится; поверх по силуэту — звёзды и бортовой номер.

// Места на спрайте (Blender, 70×48): хвостовое оперение, балка, крылья, нос
const SPOT = {
  tailStar: [5, 16.5],
  wingStars: [[39, 5.5], [39, 31.5]],
  number: [12, 15],   // левый верхний угол номера на балке
  hull: [23, 11, 36, 17], // x, y, w, h — где корпус (полосы на носу)
};
// Яркость серого корпуса спрайта — при ней камуфляж ложится своим цветом
const LUM_REF = 185;

export function makeLiveryTextures(scene) {
  if (!scene.textures.exists('heli')) return;
  const src = scene.textures.get('heli');
  const frame = src.get();
  const img = src.getSourceImage();
  const W = frame.width;
  const H = frame.height;
  // Исходные пиксели — один раз для всех окрасок
  const base = document.createElement('canvas');
  base.width = W;
  base.height = H;
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(img, frame.cutX, frame.cutY, W, H, 0, 0, W, H);
  const orig = bctx.getImageData(0, 0, W, H).data;

  for (const L of LIVERIES) {
    const key = `heli_${L.id}`;
    if (scene.textures.exists(key)) continue;
    const camo = paintCamo(L, W, H);
    const tex = scene.textures.createCanvas(key, W, H);
    const ctx = tex.getContext();
    const out = ctx.createImageData(W, H);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = orig[i + 3];
      if (!a) continue;
      const r = orig[i];
      const g = orig[i + 1];
      const b = orig[i + 2];
      d[i + 3] = a;
      // Остекление кабины (голубое) — как есть
      if (g - r > 40 && b - r > 40) {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        continue;
      }
      const shade = Math.min(1.15, (0.3 * r + 0.59 * g + 0.11 * b) / LUM_REF);
      d[i] = Math.min(255, camo[i] * shade);
      d[i + 1] = Math.min(255, camo[i + 1] * shade);
      d[i + 2] = Math.min(255, camo[i + 2] * shade);
    }
    if (L.edging != null) edge(d, orig, W, H, L.edging);
    ctx.putImageData(out, 0, 0);

    // Знаки — только по силуэту
    ctx.globalCompositeOperation = 'source-atop';
    markings(ctx, L);
    ctx.globalCompositeOperation = 'source-over';
    tex.refresh();
  }
}

// Камуфляж на весь кадр: основной цвет, пятна или полосы (случайность — своя у окраски, всегда одинаковая)
function paintCamo(L, W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  const rnd = seeded(L.id);
  x.fillStyle = css(L.base);
  x.fillRect(0, 0, W, H);
  const n = L.count ?? 0;
  for (let k = 0; k < n; k++) {
    x.fillStyle = css(L.spots[k % L.spots.length]);
    if (L.style === 'stripes') {
      // Косые рваные полосы поперёк машины
      const cx = (k + 0.5) * (W / n) + (rnd() - 0.5) * 4;
      x.save();
      x.translate(cx, H / 2);
      x.rotate(0.5 + (rnd() - 0.5) * 0.3);
      x.beginPath();
      const w = L.size * (0.6 + rnd() * 0.6);
      x.moveTo(-w / 2, -H);
      for (let y = -H; y <= H; y += 6) x.lineTo(-w / 2 + (rnd() - 0.5) * 3, y);
      for (let y = H; y >= -H; y -= 6) x.lineTo(w / 2 + (rnd() - 0.5) * 3, y);
      x.closePath();
      x.fill();
      x.restore();
    } else {
      // Пятно из нескольких кругов — «облако», как у кистевого камуфляжа
      const cx = rnd() * W;
      const cy = rnd() * 40;
      const parts = 3 + Math.floor(rnd() * 3);
      for (let p = 0; p < parts; p++) {
        const r = L.size * (0.35 + rnd() * 0.4);
        x.beginPath();
        x.arc(cx + (rnd() - 0.5) * L.size * 1.6, cy + (rnd() - 0.5) * L.size * 0.9, r, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  // Полярная авиация: красные полосы на хвосте и на носу
  if (L.bands != null) {
    x.fillStyle = css(L.bands);
    x.fillRect(0, 0, 4, H);
    x.fillRect(16, 0, 4, H);
    const [hx, hy, hw, hh] = SPOT.hull;
    x.fillRect(hx + hw - 9, hy, 4, hh);
  }
  return x.getImageData(0, 0, W, H).data;
}

// Белая окантовка: полоса в 1 px чуть внутри контура (сам контур — тёмный, остаётся)
function edge(d, orig, W, H, color) {
  const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : orig[(y * W + x) * 4 + 3]);
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (a(x, y) < 128) continue;
      const near = a(x - 1, y) < 128 || a(x + 1, y) < 128 || a(x, y - 1) < 128 || a(x, y + 1) < 128;
      if (near) continue;
      const second = a(x - 2, y) < 128 || a(x + 2, y) < 128 || a(x, y - 2) < 128 || a(x, y + 2) < 128;
      if (!second) continue;
      const i = (y * W + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
}

// Красные звёзды (с белой каймой — у парадной и тёмных окрасок) и бортовой номер на балке
function markings(ctx, L) {
  const big = !!L.bigStars;
  const rim = big || L.id === 'night' || L.id === 'olive' || L.id === 'border';
  const r = big ? 5 : 3.6;
  for (const [x, y] of SPOT.wingStars) star(ctx, x, y, r, rim);
  star(ctx, SPOT.tailStar[0], SPOT.tailStar[1], big ? 4 : 3.4, rim);
  digits(ctx, L.number ?? '67', SPOT.number[0], SPOT.number[1], L.numColor ?? '#e8c84a');
}

function star(ctx, x, y, r, rim) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  ctx.beginPath();
  pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  if (rim) {
    ctx.strokeStyle = '#f0ece0';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.fillStyle = '#c42a1e';
  ctx.fill();
}

// Цифры 3×5 пикселей — бортовой номер читается даже на 70-пиксельном спрайте
const FONT = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};
function digits(ctx, text, x0, y0, color) {
  ctx.fillStyle = color;
  [...text].forEach((ch, n) => {
    const rows = FONT[ch];
    if (!rows) return;
    rows.forEach((row, y) => {
      for (let x = 0; x < 3; x++) if (row[x] === '1') ctx.fillRect(x0 + n * 4 + x, y0 + y, 1, 1);
    });
  });
}

function css(c) {
  return `#${c.toString(16).padStart(6, '0')}`;
}

// Простой детерминированный генератор (mulberry32) от строки
function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
