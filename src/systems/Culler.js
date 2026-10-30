import { CULL } from '../config.js';

// Прячет неподвижные декорации за пределами экрана: Phaser рисует каждый видимый объект,
// даже если он за кадром, а карта 4000×4000 — на экране ~1/30 её. Замер: 553 из 1089 объектов
// за кадром, без них отрисовка на 20–40% дешевле.
// Только то, что зарегистрировали: земля, дома, обломки, башни, склады, следы — и группы-пулы
// кристаллов и врагов (показываем только активных, неактивный слот пула не всплывёт в кадре).
// Пулы, где видимость сама по себе признак «занят» (ящики, вспышки, ракеты), сюда не попадают.
export class Culler {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.groups = [];
    this.frame = 0;
    this.lastX = Infinity;
    this.lastY = Infinity;
  }

  add(obj) {
    this.list.push(obj);
    return obj;
  }

  // Пул (Phaser Group): у его объектов видимость = «активен и на экране»
  addGroup(group) {
    this.groups.push(group);
  }

  update() {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    // Раз в несколько кадров или когда камера заметно сдвинулась
    const moved = Math.abs(v.x - this.lastX) + Math.abs(v.y - this.lastY);
    if (++this.frame < CULL.every && moved < CULL.moveStep) return;
    this.frame = 0;
    this.lastX = v.x;
    this.lastY = v.y;
    const m = CULL.margin;
    const left = v.x - m;
    const right = v.right + m;
    const top = v.y - m;
    const bottom = v.bottom + m;
    const inView = (o) => {
      // Границы с учётом точки привязки; поворот — с запасом в половину большей стороны
      const dw = o.displayWidth;
      const dh = o.displayHeight;
      const r = Math.max(dw, dh) * 0.5;
      const ox = o.x - (o.originX ?? 0.5) * dw + dw / 2;
      const oy = o.y - (o.originY ?? 0.5) * dh + dh / 2;
      return ox + r >= left && ox - r <= right && oy + r >= top && oy - r <= bottom;
    };
    let w = 0;
    for (let i = 0; i < this.list.length; i++) {
      const o = this.list[i];
      if (!o.scene) continue; // уничтожен (кольцо разбитого склада)
      this.list[w++] = o;
      const show = inView(o);
      if (o.visible !== show) o.setVisible(show);
    }
    this.list.length = w;
    for (const group of this.groups) {
      const items = group.getChildren();
      for (let i = 0; i < items.length; i++) {
        const o = items[i];
        if (!o.active) continue; // свободный слот пула прячет сам пул
        const show = inView(o);
        if (o.visible !== show) o.setVisible(show);
      }
    }
  }
}
