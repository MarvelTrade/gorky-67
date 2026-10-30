import * as Phaser from 'phaser';
import { PALETTE as P } from '../config.js';
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

  // rects — пятна домов в координатах мира [x, y, w, h]
  build(rects) {
    this.roofs = [];
    for (const [x, y, w, h] of rects) {
      const H = buildingHeight(w, h);
      const key = this.texture(w, h, H);
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

  texture(w, h, H) {
    const key = `bld_${w}x${h}_${H}`;
    if (this.scene.textures.exists(key)) return key;
    const rnd = new Phaser.Math.RandomDataGenerator([key]);
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
        // Большинство окон тёмные (эвакуация), редкие горят, редкие выбиты
        g.fillStyle(r < 0.12 ? 0xffd27a : r < 0.2 ? 0x1b1d20 : 0x7d8b96);
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
