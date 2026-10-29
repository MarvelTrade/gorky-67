import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { PALETTE as P } from '../config.js';
import { t, initLang } from '../i18n/index.js';

// Генератор иконок и обложек для каталога Яндекс Игр (только dev: /promo.html).
// Рисует героев игры теми же функциями, что и BootScene, но векторно и крупно —
// без растягивания маленьких текстур. Готовые PNG уходят dev-серверу, он кладёт их в promo/.
// Требования: иконка 512×512, обложка 800×470, PNG; не скриншот, без рамок, скруглений и интерфейса.

const JOBS = [
  { name: 'icon-a.png', w: 512, h: 512, draw: iconBreakthrough },
  { name: 'icon-b.png', w: 512, h: 512, draw: iconObject },
  { name: 'icon-c.png', w: 512, h: 512, draw: icon67 },
  { name: 'cover-a.png', w: 800, h: 470, draw: coverHorde },
  { name: 'cover-b.png', w: 800, h: 470, draw: coverObject },
  { name: 'cover-c.png', w: 800, h: 470, draw: coverSupply },
];

// Рисунок из BootScene как вектор: вызываем её метод, подменив «запечь в текстуру» на «оставить на сцене»
function vec(scene, method, w, h, x, y, scale = 1, rotation = 0, alpha = 1) {
  const g = scene.add.graphics();
  let first = true;
  const ctx = Object.create(BootScene.prototype);
  ctx.make = { graphics: () => (first ? ((first = false), g) : scene.add.graphics().setVisible(false)) };
  ctx.makeTexture = () => {};
  BootScene.prototype[method].call(ctx);
  g.setPosition(-w / 2, -h / 2);
  return scene.add.container(x, y, [g]).setScale(scale).setRotation(rotation).setAlpha(alpha);
}

const heli = (s, x, y, k, r) => vec(s, 'makeHeliTexture', 70, 48, x, y, k, r);
const rotor = (s, x, y, k, r) => vec(s, 'makeRotorTexture', 72, 72, x, y, k, r, 0.8);
const infected = (s, x, y, k, r) => vec(s, 'makeInfantryTexture', 26, 26, x, y, k, r);
const tank = (s, x, y, k, r) => vec(s, 'makeTankTexture', 58, 40, x, y, k, r);
const aa = (s, x, y, k, r) => vec(s, 'makeAATexture', 34, 34, x, y, k, r);
const boss = (s, x, y, k, r) => vec(s, 'makeBossTexture', 100, 100, x, y, k, r);
const missile = (s, x, y, k, r) => vec(s, 'makeMissileTexture', 20, 8, x, y, k, r);

// Вертолёт с тенью и винтом — главный герой на каждой картинке
function chopper(s, x, y, k, r) {
  s.add.ellipse(x + 10 * k, y + 14 * k, 46 * k, 26 * k, 0x000000, 0.35).setRotation(r);
  heli(s, x, y, k, r);
  rotor(s, x, y, k * 0.95, r + 0.4);
}

// Радиальный градиент как текстура: свечение «Зари» и затемнение краёв
function radial(s, key, size, inner, outer) {
  if (!s.textures.exists(key)) {
    const tex = s.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
  return key;
}

function vignette(s, w, h) {
  s.add.image(w / 2, h / 2, radial(s, 'vig', 512, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.75)')).setDisplaySize(w * 1.35, h * 1.35);
}

function glowAt(s, x, y, size, color = 'rgba(255,200,58,0.55)') {
  s.add.image(x, y, radial(s, `glow-${color}`, 256, color, 'rgba(255,200,58,0)')).setDisplaySize(size, size);
}

// Перекрёсток из четырёх кварталов: дороги сходятся в точке (cx, cy)
function crossroad(s, cx, cy, variants = [0, 2, 1, 0]) {
  const q = 200;
  [
    [-q, -q],
    [q, -q],
    [-q, q],
    [q, q],
  ].forEach(([dx, dy], i) => s.add.image(cx + dx, cy + dy, `city${variants[i]}`).setAngle(i * 90));
}

function tracer(s, x1, y1, x2, y2) {
  const g = s.add.graphics();
  g.lineStyle(3, 0xffe066, 0.9);
  g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(7, 0xffe066, 0.2);
  g.lineBetween(x1, y1, x2, y2);
}

function enemyShell(s, x, y, k = 1, color = P.shell) {
  s.add.circle(x, y, 9 * k, color, 0.35);
  s.add.circle(x, y, 6 * k, color);
  s.add.circle(x, y, 3 * k, 0xffffff);
}

function sparks(s, x, y, n, spread, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * spread;
    const r = (1.5 + Math.random() * 3) * k;
    s.add.circle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + d * 0.5, r, [0xffb030, 0xff7a1a, 0xffe080][i % 3]);
  }
}

function title(s, x, y, size, originX = 0.5, withSub = true) {
  s.add
    .text(x, y, t('title'), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: '#f2f5e6',
      stroke: '#0b0f08',
      strokeThickness: Math.round(size / 7),
    })
    .setOrigin(originX, 0.5)
    .setLetterSpacing(Math.round(size / 14));
  if (withSub) {
    s.add
      .text(x, y + size * 0.72, t('subtitle'), {
        fontFamily: 'monospace',
        fontSize: `${Math.round(size * 0.32)}px`,
        fontStyle: 'bold',
        color: '#ffd040',
        stroke: '#0b0f08',
        strokeThickness: 4,
      })
      .setOrigin(originX, 0.5);
  }
}

// ——— Иконки 512×512 ———

// A: вертолёт прорывается из кольца заражённых над перекрёстком
function iconBreakthrough(s, w, h) {
  crossroad(s, w / 2, h / 2);
  s.add.rectangle(0, 0, w, h, 0x000000, 0.25).setOrigin(0);
  glowAt(s, w / 2, h / 2, 420);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = w / 2 + Math.cos(a) * 205;
    const y = h / 2 + Math.sin(a) * 205;
    infected(s, x, y, 2.3, a + Math.PI);
    if (i % 3 === 0) tracer(s, w / 2, h / 2, x, y);
  }
  chopper(s, w / 2, h / 2, 3.9, -0.65);
  vignette(s, w, h);
}

// B: «Объект» снизу, вертолёт сверху бьёт ракетами
function iconObject(s, w, h) {
  s.add.image(w / 2, h / 2, 'city3').setScale(1.4);
  s.add.rectangle(0, 0, w, h, 0x05080a, 0.55).setOrigin(0);
  glowAt(s, w * 0.6, h * 0.64, 460, 'rgba(157,255,46,0.45)');
  boss(s, w * 0.6, h * 0.64, 4.1, Math.PI * 1.25);
  for (const [x, y] of [[300, 210], [205, 390], [430, 300]]) enemyShell(s, x, y, 1.6, P.spit);
  for (let i = 0; i < 3; i++) {
    const x = 175 + i * 55;
    const y = 175 + i * 50;
    for (let j = 1; j < 5; j++) s.add.circle(x - j * 14, y - j * 13, 5 + j * 1.5, 0xbfbfbf, 0.35 - j * 0.06);
    missile(s, x, y, 3, 0.75);
  }
  chopper(s, w * 0.3, h * 0.28, 2.7, 0.75);
  vignette(s, w, h);
}

// C: крупное «67» за вертолётом и тепловые ловушки по бокам
function icon67(s, w, h) {
  s.add.rectangle(0, 0, w, h, 0x141a10).setOrigin(0);
  glowAt(s, w / 2, h / 2, 560, 'rgba(255,122,26,0.5)');
  s.add
    .text(w / 2, h * 0.38, '67', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '270px',
      fontStyle: 'bold',
      color: '#ffd040',
      stroke: '#0b0f08',
      strokeThickness: 18,
    })
    .setOrigin(0.5)
    .setAlpha(0.9);
  sparks(s, w * 0.24, h * 0.76, 26, 60, 1.6);
  sparks(s, w * 0.76, h * 0.76, 26, 60, 1.6);
  chopper(s, w / 2, h * 0.74, 3.3, -Math.PI / 2);
  vignette(s, w, h);
}

// ——— Обложки 800×470 ———

// A: перекрёсток, вертолёт и сжимающаяся орда, название справа
function coverHorde(s, w, h) {
  crossroad(s, w * 0.36, h * 0.55, [1, 0, 2, 0]);
  crossroad(s, w * 0.36 + 800, h * 0.55, [0, 2, 0, 1]);
  s.add.rectangle(0, 0, w, h, 0x000000, 0.25).setOrigin(0);
  const hx = w * 0.27;
  const hy = h * 0.62;
  glowAt(s, hx, hy, 360);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 150 + (i % 2) * 22;
    const x = hx + Math.cos(a) * r;
    const y = hy + Math.sin(a) * r * 0.9;
    infected(s, x, y, 1.9, a + Math.PI);
    if (i % 4 === 0) tracer(s, hx, hy, x, y);
  }
  enemyShell(s, w * 0.62, h * 0.62, 1.4);
  enemyShell(s, w * 0.7, h * 0.78, 1.4);
  chopper(s, hx, hy, 3.3, -0.5);
  vignette(s, w, h);
  title(s, w - 28, h * 0.16, 70, 1);
}

// B: вертолёт против «Объекта», название сверху слева
function coverObject(s, w, h) {
  s.add.image(w * 0.3, h / 2, 'city0').setScale(1.3);
  s.add.image(w * 0.3 + 520, h / 2, 'city2').setScale(1.3);
  s.add.rectangle(0, 0, w, h, 0x05080a, 0.5).setOrigin(0);
  glowAt(s, w * 0.76, h * 0.58, 520, 'rgba(157,255,46,0.45)');
  boss(s, w * 0.76, h * 0.58, 3.5, Math.PI);
  for (let i = 0; i < 6; i++) infected(s, w * 0.6 + Math.cos(i) * 150, h * 0.62 + Math.sin(i * 1.7) * 120, 1.7, Math.PI);
  for (const [x, y] of [[470, 250], [520, 360], [430, 160]]) enemyShell(s, x, y, 1.3, P.spit);
  for (let i = 0; i < 3; i++) {
    const x = 330 + i * 45;
    const y = 280 - i * 40;
    for (let j = 1; j < 5; j++) s.add.circle(x - j * 15, y + j * 2, 5 + j * 1.5, 0xbfbfbf, 0.35 - j * 0.06);
    missile(s, x, y, 2.6, 0.1);
  }
  chopper(s, w * 0.24, h * 0.6, 3.4, 0);
  vignette(s, w, h);
  title(s, w * 0.05, h * 0.16, 64, 0);
}

// C: ящик снабжения на крыше, вертолёт идёт за ним, оцепление стреляет, ловушки сбивают
function coverSupply(s, w, h) {
  crossroad(s, w * 0.62, h * 0.18, [0, 1, 2, 0]);
  crossroad(s, w * 0.62 - 800, h * 0.18, [2, 0, 1, 0]);
  s.add.rectangle(0, 0, w, h, 0x000000, 0.2).setOrigin(0);
  const cx = w * 0.7;
  const cy = h * 0.36;
  s.add.circle(cx, cy, 52).setStrokeStyle(5, 0xffd040, 0.9);
  s.add.circle(cx, cy, 78).setStrokeStyle(3, 0xffd040, 0.4);
  vec(s, 'makeSupplyTextures', 30, 30, cx, cy, 2.6, 0.2);
  glowAt(s, w * 0.2, h * 0.82, 200, 'rgba(255,45,85,0.35)');
  glowAt(s, w * 0.86, h * 0.84, 180, 'rgba(255,45,85,0.35)');
  tank(s, w * 0.2, h * 0.82, 2.2, -0.6);
  aa(s, w * 0.86, h * 0.84, 2.2, -2.2);
  enemyShell(s, w * 0.36, h * 0.6, 1.3);
  enemyShell(s, w * 0.6, h * 0.66, 1.3);
  sparks(s, w * 0.42, h * 0.56, 22, 55, 1.4);
  chopper(s, w * 0.47, h * 0.47, 3.4, -0.35);
  vignette(s, w, h);
  title(s, w * 0.05, h * 0.14, 60, 0);
}

// ——— Прогон: по очереди рисуем, ждём кадр, отдаём PNG серверу ———

class PromoScene extends Phaser.Scene {
  constructor() {
    super('PromoScene');
  }

  async create() {
    const status = document.createElement('pre');
    document.body.appendChild(status);
    for (const job of JOBS) {
      this.children.removeAll(true);
      this.scale.resize(job.w, job.h);
      this.cameras.main.setSize(job.w, job.h);
      job.draw(this, job.w, job.h);
      await new Promise((r) => setTimeout(r, 250));
      const dataUrl = this.game.canvas.toDataURL('image/png');
      const res = await fetch('/__promo-save', { method: 'POST', body: JSON.stringify({ name: job.name, dataUrl }) });
      status.textContent += `${job.name} ${job.w}×${job.h}: ${res.ok ? 'сохранено' : await res.text()}\n`;
    }
    window.__promoDone = true;
  }
}

// BootScene в конце запускает MenuScene — здесь вместо меню сразу генератор
class ToPromo extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }
  create() {
    this.scene.start('PromoScene');
  }
}

initLang();
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  render: { preserveDrawingBuffer: true }, // чтобы canvas.toDataURL отдавал готовый кадр
  fps: { forceSetTimeOut: true }, // генератору не нужен requestAnimationFrame — работает и в фоновой вкладке
  width: 512,
  height: 512,
  backgroundColor: '#111111',
  scale: { mode: Phaser.Scale.NONE },
  scene: [BootScene, ToPromo, PromoScene],
});
