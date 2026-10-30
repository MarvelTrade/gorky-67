import { RUINS } from '../config.js';
import { DEPTH } from '../depth.js';

// Следы тяжёлой техники: танки оставляют отпечатки гусениц на асфальте, а танки и «Объект»,
// проходя сквозь дом, ломают его (Buildings.hit) и оставляют полосу пролома.
// Отпечатки — пул картинок в отдельном слое: после RUINS.maxDecals старые переиспользуются.
// Слой — чтобы новый след не пересортировывал всю сцену (на телефоне это стоило ~7 FPS)
export class Tracks {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.next = 0;
    this.last = new Map(); // враг → где оставил последний след
    // Над руинами (ground + 1.4), под живыми домами и врагами
    this.layer = scene.add.layer().setDepth(DEPTH.ground + 1.6);
    this.makeTextures();
  }

  makeTextures() {
    if (this.scene.textures.exists('trackMark')) return;
    let g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x000000, 1);
    for (const y of [0, 14]) for (let x = 0; x < 10; x += 4) g.fillRect(x, y, 3, 4); // две гусеницы, траки
    g.generateTexture('trackMark', 10, 18);
    g.destroy();

    g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x2a2b2d, 1).fillEllipse(16, 12, 32, 24); // пролом: тёмное пятно и крошка вокруг
    g.fillStyle(0x7a7f85, 1);
    for (const [x, y] of [[4, 6], [26, 5], [8, 19], [24, 18], [15, 3], [16, 21]]) g.fillRect(x, y, 3, 3);
    g.generateTexture('crushMark', 32, 24);
    g.destroy();
  }

  update(dt) {
    const b = this.scene.buildings;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || (e.type !== 'tank' && e.type !== 'boss')) continue;
      const house = b.at(e.x, e.y);
      e.inHouse = !!house && house.state !== 'ruined';
      e.inWater = e.type === 'tank' && !!this.scene.river?.contains(e.x, e.y); // вброд
      if (e.inHouse) b.hit(house, RUINS.crush[e.type] * dt);
      // Отпечаток: в доме — пролом, на улице — гусеницы (у «Объекта» гусениц нет)
      const inside = !!house;
      if (!inside && e.type === 'boss') continue;
      const prev = this.last.get(e);
      const step = inside ? RUINS.trailEvery : RUINS.trackEvery;
      if (prev && prev.active === e.active && Math.hypot(prev.x - e.x, prev.y - e.y) < step) continue;
      this.last.set(e, { x: e.x, y: e.y, active: e.active });
      this.stamp(inside ? 'crushMark' : 'trackMark', e.x, e.y, e.rotation, e.type === 'boss' ? 2.2 : 1, inside ? 0.85 : 0.22);
    }
    // Ушедшие из пула враги не держат память
    if (this.last.size > 64) for (const k of this.last.keys()) if (!k.active) this.last.delete(k);
  }

  stamp(key, x, y, rotation, scale, alpha) {
    let img = this.pool[this.next];
    if (!img) {
      img = this.scene.make.image({ x: 0, y: 0, key }, false);
      this.layer.add(img);
      this.scene.culler?.add(img);
      this.pool[this.next] = img;
    }
    this.next = (this.next + 1) % RUINS.maxDecals;
    img.setTexture(key).setPosition(x, y).setRotation(rotation).setScale(scale).setAlpha(alpha).setVisible(true); // мог быть скрыт Culler
  }
}
