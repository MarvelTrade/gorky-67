import * as Phaser from 'phaser';
import { CHAOS, PALETTE as P } from '../config.js';
import { DEPTH } from '../depth.js';
import { buildingHeight } from '../cityLayout.js';

// Дома в виде 3/4: пятно на земле (по нему ходят враги и считаются столкновения) не меняется,
// а рисуется крыша, поднятая на высоту дома, и южный фасад с окнами и подъездами под ней.
// Вид строго сверху читался как плоские плиты, а высокие сооружения — как люки.
// Текстура — одна на каждый размер дома; домов ~170, размеров — несколько.
export class Buildings {
  constructor(scene) {
    this.scene = scene;
    this.shadows = scene.add.graphics().setDepth(DEPTH.ground + 1);
  }

  // rects — пятна домов в координатах мира [x, y, w, h]. Часть домов горит, часть со следами обстрела —
  // город в катастрофе. fires — точки огня на крышах горящих домов (их поджигает Wrecks).
  build(rects, rnd = Phaser.Math.RND) {
    this.roofs = [];
    this.fires = [];
    for (const [x, y, w, h] of rects) {
      const H = buildingHeight(w, h);
      const r = rnd.frac();
      const state = r < CHAOS.burningHouses ? 'burning' : r < CHAOS.burningHouses + CHAOS.shelledHouses ? 'shelled' : 'ok';
      const key = this.texture(w, h, H, state);
      if (state === 'burning') {
        const n = Math.max(1, Math.round(Math.max(w, h) / 120));
        for (let i = 0; i < n; i++) {
          const fx = w >= h ? x + ((i + 0.5) * w) / n : x + w / 2;
          const fy = (w >= h ? y + h / 2 : y + ((i + 0.5) * h) / n) - H;
          this.fires.push({ x: fx, y: fy, big: true });
        }
      }
      // Тень на земле — вправо-вниз от пятна
      this.shadows.fillStyle(0x000000, 0.3);
      this.shadows.fillRect(x + 10, y + 8, w, h);
      // Южнее — ближе к зрителю: перекрывает северного соседа (в пределах слоя домов)
      this.scene.add.image(x, y - H, key).setOrigin(0, 0).setDepth(DEPTH.buildings + (y + h) / 1e5);
      // Центр крыши на экране — туда падают ящики снабжения
      this.roofs.push({ x: x + w / 2, y: y + h / 2 - H });
    }
    return this.roofs;
  }

  texture(w, h, H, state = 'ok') {
    const key = `bld_${w}x${h}_${H}_${state}`;
    if (this.scene.textures.exists(key)) return key;
    const rnd = new Phaser.Math.RandomDataGenerator([key]);
    const burning = state === 'burning';
    const shelled = state === 'shelled';
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

    // Фасад: стена, ряды окон по этажам, подъезды внизу
    const floorH = 6;
    const floors = Math.floor((H - 6) / floorH);
    g.fillStyle(0x5d6269);
    g.fillRect(0, h, w, H);
    g.fillStyle(0x4a4f55);
    g.fillRect(0, h + H - 4, w, 4); // цоколь
    for (let f = 0; f < floors; f++) {
      const wy = h + 3 + f * floorH;
      for (let wx = 5; wx < w - 5; wx += 9) {
        const r = rnd.frac();
        // Большинство окон тёмные (эвакуация), редкие горят, редкие выбиты.
        // Горящий дом — окна в огне; после обстрела — больше выбитых
        const lit = burning ? (r < 0.45 ? 0xff7a2e : 0x1b1d20) : r < 0.12 ? 0xffd27a : null;
        const broken = r < (shelled ? 0.55 : 0.2);
        g.fillStyle(lit ?? (broken ? 0x1b1d20 : 0x7d8b96));
        g.fillRect(wx, wy, 5, 3);
      }
    }
    const sections = Math.max(1, Math.round(w / 46));
    g.fillStyle(0x2c3034);
    for (let i = 0; i < sections; i++) g.fillRect((i + 0.5) * (w / sections) - 3, h + H - 9, 6, 5);

    // Крыша: как раньше — секции и выходы на крышу
    g.fillStyle(P.panel);
    g.fillRect(0, 0, w, h);
    const long = w >= h;
    const len = long ? w : h;
    const sec = Math.max(1, Math.round(len / 46));
    const step = len / sec;
    g.lineStyle(1, P.panelDark, 0.7);
    for (let i = 1; i < sec; i++) {
      if (long) g.lineBetween(i * step, 0, i * step, h);
      else g.lineBetween(0, i * step, w, i * step);
    }
    g.fillStyle(P.panelDark);
    for (let i = 0; i < sec; i++) {
      const cx = long ? (i + 0.5) * step : w / 2;
      const cy = long ? h / 2 : (i + 0.5) * step;
      g.fillRect(cx - 4, cy - 4, 8, 8);
    }
    // Горящий дом: крыша обуглена пятнами, копоть ползёт по фасаду вверх
    if (burning) {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0x1a1a1a, 0.55);
        g.fillCircle(rnd.between(8, w - 8), rnd.between(6, h - 6), rnd.between(10, 22));
      }
      g.fillStyle(0x111111, 0.35);
      for (let i = 0; i < 3; i++) g.fillRect(rnd.between(4, w - 20), h, rnd.between(10, 18), H - 4);
    }
    // После обстрела: воронки-пробоины на крыше с обломками вокруг, отбитый угол
    if (shelled) {
      for (let i = 0; i < 2; i++) {
        const cx = rnd.between(14, w - 14);
        const cy = rnd.between(10, h - 10);
        g.fillStyle(0x6c6f73);
        for (let k = 0; k < 6; k++) g.fillRect(cx + rnd.between(-16, 14), cy + rnd.between(-12, 10), 3, 3);
        g.fillStyle(0x2a2a2a);
        g.fillCircle(cx, cy, rnd.between(7, 11));
        g.fillStyle(0x0d0d0d);
        g.fillCircle(cx + 1, cy + 1, 4);
      }
      g.fillStyle(0x2e3134); // отбитый угол — сквозь него видно асфальт
      g.fillTriangle(w, 0, w - rnd.between(14, 26), 0, w, rnd.between(10, 18));
    }
    // Кромка крыши светлее — читается грань между крышей и фасадом
    g.fillStyle(0xa9aeb4);
    g.fillRect(0, h - 2, w, 2);
    g.lineStyle(2, 0x2a2e33);
    g.strokeRect(1, 1, w - 2, h + H - 2);

    g.generateTexture(key, w, h + H);
    g.destroy();
    return key;
  }
}
