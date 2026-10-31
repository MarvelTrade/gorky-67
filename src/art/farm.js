import { PALETTE as P } from '../config.js';

// Враги деревни (уровень 2): заражённые колхозники, тракторы с фермерами-стрелками и раздутая газом скотина.
// Вид сверху, нос — вправо (rotation 0 = +x), как у остальных врагов. Рисуются один раз в BootScene.

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Жёлтое свечение «Зари» под заражённым — то же, что у городских
function glow(g, x, y, r) {
  g.fillStyle(P.glow, 0.35).fillCircle(x, y, r);
  g.fillStyle(P.glow, 0.2).fillCircle(x, y, r * 0.72);
}

// Трактор сверху: большие задние колёса, капот вперёд, кабина с фермером и ружьё
function tractor(g, w, h, body, dark) {
  const cy = h / 2;
  g.fillStyle(0x1a1a16);
  g.fillRect(2, 0, 13, 6).fillRect(2, h - 6, 13, 6); // задние колёса
  g.fillRect(w - 11, 3, 8, 4).fillRect(w - 11, h - 7, 8, 4); // передние
  g.fillStyle(0x3a3a32);
  for (let x = 3; x < 15; x += 3) g.fillRect(x, 0, 1, 6).fillRect(x, h - 6, 1, 6); // грунтозацепы
  g.fillStyle(body).fillRect(w * 0.4, cy - 5, w * 0.6 - 2, 10); // капот
  g.fillStyle(dark).fillRect(w - 4, cy - 4, 3, 8); // решётка
  g.fillStyle(body).fillRect(4, cy - 8, w * 0.42, 16); // кабина
  g.lineStyle(1, dark).strokeRect(4, cy - 8, w * 0.42, 16);
  g.fillStyle(0x9ab0b8, 0.8).fillRect(w * 0.42, cy - 7, 2, 14); // лобовое стекло
  g.fillStyle(0x2a2a2a).fillRect(w * 0.62, cy - 8, 3, 3); // выхлопная труба
  // Фермер в кабине: телогрейка, заражённая голова, ружьё вперёд
  g.fillStyle(0x3a4250).fillCircle(w * 0.25, cy, 5);
  g.fillStyle(P.infectedHead).fillCircle(w * 0.25, cy, 3);
  g.fillStyle(0x4a3424).fillRect(w * 0.25, cy + 3, w * 0.5, 2); // приклад и ствол
  g.fillStyle(0x1a1a1a).fillRect(w * 0.6, cy + 3, w * 0.3, 1.5);
  g.fillStyle(P.glow, 0.6).fillCircle(w * 0.55, cy - 2, 1.5); // пятно «Зари» на капоте
}

// Раздутая скотина: бочка-туловище (в полтора раза толще обычного), ножки торчат, вздутые жёлтые жилы
function beast(g, w, h, o) {
  const cx = w * 0.45;
  const cy = h / 2;
  const rx = w * 0.36;
  const ry = h * 0.42;
  g.fillStyle(P.glow, 0.25).fillEllipse(cx, cy, rx * 2 + 8, ry * 2 + 8); // газовое марево
  g.fillStyle(o.leg);
  for (const [x, y] of [[-0.6, -1], [0.55, -1], [-0.6, 1], [0.55, 1]]) g.fillRect(cx + x * rx - 2, cy + y * (ry + 1) - 2, 4, 4);
  g.fillStyle(o.leg).fillRect(cx - rx - 5, cy - 1, 6, 2); // хвост
  g.fillStyle(o.body).fillEllipse(cx, cy, rx * 2, ry * 2);
  if (o.spots) {
    g.fillStyle(o.spots);
    g.fillEllipse(cx - rx * 0.35, cy - ry * 0.3, rx * 0.6, ry * 0.7);
    g.fillEllipse(cx + rx * 0.3, cy + ry * 0.35, rx * 0.5, ry * 0.5);
  }
  if (o.mane) g.fillStyle(o.mane).fillRect(cx - rx * 0.2, cy - 1.5, rx * 1.1, 3);
  // Вздутие: блик и жёлто-зелёные жилы газа
  g.fillStyle(0xffffff, 0.22).fillEllipse(cx - rx * 0.2, cy - ry * 0.35, rx * 0.9, ry * 0.5);
  g.lineStyle(1, 0xc8e040, 0.75);
  g.lineBetween(cx - rx * 0.6, cy + ry * 0.1, cx - rx * 0.1, cy - ry * 0.2);
  g.lineBetween(cx + rx * 0.1, cy + ry * 0.5, cx + rx * 0.5, cy + ry * 0.05);
  g.lineStyle(1.5, o.line, 0.9).strokeEllipse(cx, cy, rx * 2, ry * 2);
  // Голова
  const hx = cx + rx + o.head * 0.4;
  g.fillStyle(o.headCol ?? o.body).fillEllipse(hx, cy, o.head * 1.5, o.head);
  g.lineStyle(1, o.line, 0.9).strokeEllipse(hx, cy, o.head * 1.5, o.head);
  g.fillStyle(0xd88a8a).fillEllipse(hx + o.head * 0.55, cy, o.head * 0.45, o.head * 0.6); // морда
  if (o.horns) {
    g.lineStyle(2, 0xe8e0c8);
    g.lineBetween(hx - 1, cy - o.head / 2, hx + 4, cy - o.head / 2 - 4);
    g.lineBetween(hx - 1, cy + o.head / 2, hx + 4, cy + o.head / 2 + 4);
  }
  g.fillStyle(P.glow).fillRect(hx + 2, cy - 3, 2, 1).fillRect(hx + 2, cy + 2, 2, 1); // жёлтые глаза
}

export function makeFarmTextures(scene) {
  // Заражённый колхозник: телогрейка, кепка, руки вперёд
  tex(scene, 'farmer', 26, 26, (g) => {
    glow(g, 13, 13, 13);
    g.fillStyle(0x6a7c94).fillRect(14, 7, 8, 3).fillRect(14, 16, 8, 3);
    g.fillStyle(P.infected).fillRect(21, 7, 3, 3).fillRect(21, 16, 3, 3); // кисти
    g.fillStyle(0x6a7c94).fillEllipse(12, 13, 12, 18);
    g.lineStyle(1, 0x1a2028, 0.9).strokeEllipse(12, 13, 12, 18);
    g.lineStyle(1, 0x46546a, 0.9).lineBetween(8, 7, 8, 19).lineBetween(11, 5, 11, 21); // стёжка телогрейки
    g.fillStyle(P.infectedHead).fillCircle(14, 13, 4);
    g.fillStyle(0x4a3c2c).fillRect(9, 10, 4, 6); // кепка — на затылке, лицо видно
    g.fillStyle(0xffffff).fillRect(16, 11, 2, 1).fillRect(16, 14, 2, 1); // глаза
  });
  tex(scene, 'tractorBlue', 36, 28, (g) => tractor(g, 36, 28, 0x2f6fb8, 0x1c4070));
  tex(scene, 'tractorRed', 40, 30, (g) => tractor(g, 40, 30, 0xc83a2a, 0x7a1e14));
  tex(scene, 'cow', 44, 34, (g) => beast(g, 44, 34, { body: 0xe8e4d8, spots: 0x2a2622, leg: 0x2a2622, line: 0x3a3028, head: 10 }));
  tex(scene, 'bull', 46, 36, (g) => beast(g, 46, 36, { body: 0x5a3220, leg: 0x2a1810, line: 0x1a0e08, head: 11, headCol: 0x4a2818, horns: true }));
  tex(scene, 'horse', 50, 30, (g) => beast(g, 50, 30, { body: 0x8a5a34, leg: 0x2a1a10, line: 0x3a2414, head: 10, mane: 0x2a1a10 }));
  // Дробь из ружья — мелкая, тёплая, чтобы отличалась от красных снарядов оцепления
  tex(scene, 'pellet', 8, 8, (g) => {
    g.fillStyle(0xffa030).fillCircle(4, 4, 3.5);
    g.fillStyle(0xffffff).fillCircle(4, 4, 1.5);
  });
}
