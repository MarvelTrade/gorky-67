import { layout } from '../levels.js';
import { DEPTH } from '../depth.js';

// Река наискосок через юго-запад. Вода закрыта для наземных врагов (клетки CityNav),
// переходят только по мостам; танк — вброд, медленно; вертолёт летит над водой как над землёй.
// Дома, которые задела бы вода, не строятся — на их месте набережная
export class River {
  constructor(scene) {
    this.scene = scene;
    // Вода уровня: в городе — река с мостами, в деревне — озеро; нет воды — пустая ломаная
    this.R = layout.RIVER ?? { points: [], width: 0, bank: 0, bridges: [] };
    this.pts = this.R.points;
    this.half = this.R.width / 2;
    this.bridges = this.R.bridges.map((b) => this.makeBridge(b));
  }

  // Расстояние от точки до оси реки
  dist(x, y) {
    let best = Infinity;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const [x1, y1] = this.pts[i];
      const [x2, y2] = this.pts[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
    }
    return best;
  }

  // В воде (pad — запас: набережная, толщина врага)
  contains(x, y, pad = 0) {
    if (!this.pts.length) return false;
    return this.dist(x, y) < this.half + pad && !this.onBridge(x, y);
  }

  onBridge(x, y) {
    return this.bridges.some((b) => Math.abs(x - b.x) < b.width / 2 && Math.abs(y - b.y) < b.len / 2);
  }

  // Дом [x, y, w, h] задевает воду с набережной
  hitsRect([x, y, w, h]) {
    if (!this.pts.length) return false;
    const pad = this.half + this.R.bank + 6;
    for (let px = x; px <= x + w; px += 12) {
      for (let py = y; py <= y + h; py += 12) if (this.dist(px, py) < pad) return true;
    }
    return false;
  }

  // Мост поперёк улицы: где ось реки пересекает вертикальную линию x, какой длины мост
  makeBridge({ x, width }) {
    for (let i = 0; i < this.pts.length - 1; i++) {
      const [x1, y1] = this.pts[i];
      const [x2, y2] = this.pts[i + 1];
      if (x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
      const y = y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
      // Река идёт под углом — мост длиннее ширины воды
      const cos = Math.abs(x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
      return { x, y, width, len: (this.R.width + this.R.bank * 2) / cos + 40 };
    }
    return { x, y: -1e9, width, len: 0 };
  }

  // Вода и набережные — толстыми линиями по оси, кругами на изломах (без «зубцов»), мосты — картинками
  draw() {
    if (!this.pts.length) return;
    const g = this.scene.add.graphics().setDepth(DEPTH.ground + 0.45);
    const band = (w, color, alpha = 1) => {
      g.lineStyle(w, color, alpha);
      for (let i = 0; i < this.pts.length - 1; i++) g.lineBetween(...this.pts[i], ...this.pts[i + 1]);
      g.fillStyle(color, alpha);
      for (const [x, y] of this.pts) g.fillCircle(x, y, w / 2);
    };
    band(this.R.width + this.R.bank * 2 + 6, 0x5a5c58);   // откос
    band(this.R.width + this.R.bank * 2, 0x9a9c96);       // бетонная набережная
    band(this.R.width, 0x2a4656);                        // вода
    band(this.R.width * 0.55, 0x30526a, 0.8);            // стрежень светлее
    band(4, 0x6a8ea4, 0.5);                             // блик по середине
    this.makeBridgeTexture();
    for (const b of this.bridges) {
      if (b.len <= 0) continue;
      const img = this.scene.add.image(b.x, b.y, 'bridge').setDisplaySize(b.width, b.len).setDepth(DEPTH.ground + 0.5);
      this.scene.culler?.add(img);
    }
  }

  makeBridgeTexture() {
    if (this.scene.textures.exists('bridge')) return;
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    const W = 64;
    const H = 260;
    g.fillStyle(0x000000, 0.35).fillRect(6, 4, W, H);          // тень на воде
    g.fillStyle(0x3a3d40).fillRect(0, 0, W, H);                // настил
    g.fillStyle(0xb8b8b0).fillRect(0, 0, 4, H).fillRect(W - 4, 0, 4, H); // перила
    g.fillStyle(0x7a7a74);
    for (let y = 6; y < H; y += 14) g.fillRect(0, y, 4, 3).fillRect(W - 4, y, 4, 3); // столбики
    g.fillStyle(0x8a8670);
    for (let y = 10; y < H; y += 30) g.fillRect(W / 2 - 1, y, 2, 16); // разметка
    g.generateTexture('bridge', W + 6, H + 4);
    g.destroy();
  }

  // Вода закрыта для наземных врагов: клетки сетки проходимости в реке (с набережной) — стена
  blockNav(nav) {
    if (!this.pts.length) return;
    for (let r = 0; r < nav.rows; r++) {
      for (let c = 0; c < nav.cols; c++) {
        const x = (c + 0.5) * nav.cell;
        const y = (r + 0.5) * nav.cell;
        if (this.contains(x, y, this.R.bank)) nav.blocked[r * nav.cols + c] = 1;
      }
    }
  }
}
