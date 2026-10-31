import { PAPER } from './paper.js';

// Простые иконки-знаки в круге 16 px, цвет — категории (чернила). Узнаются без чтения.
// Общие для карточек улучшений и нижней панели оружия
export function drawIcon(g, id, color) {
  g.fillStyle(color, 0.12).fillCircle(0, 0, 17);
  g.lineStyle(2, color, 1).strokeCircle(0, 0, 17);
  g.fillStyle(color, 1);
  g.lineStyle(2.5, color, 1);
  switch (id) {
    case 'damage': // патрон
      g.fillRect(-3, -7, 6, 12);
      g.fillTriangle(-3, -7, 3, -7, 0, -12);
      g.fillRect(-4, 6, 8, 3);
      break;
    case 'fireRate': // очередь — три пули
      for (const x of [-7, 0, 7]) g.fillRect(x - 1.5, -8 + Math.abs(x) * 0.6, 3, 9);
      break;
    case 'missile': // ракета
      g.fillRect(-2.5, -6, 5, 12);
      g.fillTriangle(-2.5, -6, 2.5, -6, 0, -12);
      g.fillTriangle(-2.5, 6, -7, 10, -2.5, 2);
      g.fillTriangle(2.5, 6, 7, 10, 2.5, 2);
      break;
    case 'hp': // щит
      g.fillPoints([{ x: -9, y: -9 }, { x: 9, y: -9 }, { x: 8, y: 2 }, { x: 0, y: 11 }, { x: -8, y: 2 }], true);
      break;
    case 'flares': // разлёт ловушек
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.lineBetween(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 11, Math.sin(a) * 11);
      }
      g.fillCircle(0, 0, 3);
      break;
    case 'bombs': // три бомбочки
      for (const x of [-6, 0, 6]) {
        g.fillCircle(x, 2 + Math.abs(x) * 0.3, 3.2);
        g.fillTriangle(x - 2, -2 + Math.abs(x) * 0.3, x + 2, -2 + Math.abs(x) * 0.3, x, -7 + Math.abs(x) * 0.3);
      }
      break;
    case 'napalm': // пламя
      g.fillTriangle(-8, 9, 8, 9, 0, -11);
      g.fillStyle(PAPER, 0.6).fillTriangle(-4, 9, 4, 9, 0, -2);
      break;
    case 'rockets': // блок: три ракеты в ряд
      for (const x of [-6, 0, 6]) {
        g.fillRect(x - 1.5, -4, 3, 11);
        g.fillTriangle(x - 1.5, -4, x + 1.5, -4, x, -9);
      }
      break;
    case 'gas': // облако
      g.fillCircle(-5, 2, 5).fillCircle(3, 0, 6).fillCircle(7, 4, 4).fillRect(-6, 3, 13, 5);
      break;
    case 'speed': // шевроны
      for (const x of [-5, 3]) g.strokePoints([{ x: x - 3, y: -7 }, { x: x + 4, y: 0 }, { x: x - 3, y: 7 }]);
      break;
    case 'magnet': // подкова
      g.beginPath();
      g.arc(0, 0, 8, 0, Math.PI, false);
      g.strokePath();
      g.lineBetween(-8, 0, -8, -9);
      g.lineBetween(8, 0, 8, -9);
      break;
  }
}
