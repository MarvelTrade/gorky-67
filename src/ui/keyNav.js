// Управление экранами с клавиатуры одной рукой: стрелки или WASD — к ближайшей кнопке в эту сторону
// (подходит и для списка, и для сетки «Ангара»), Enter или пробел — нажать. Выбранное — латунной рамкой.
// items: [{ obj, activate }] — obj даёт границы (getBounds), скрытые пропускаются.
const DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export class KeyNav {
  // enabled() — можно ли сейчас управлять (экран не перекрыт другим, не идёт анимация)
  constructor(scene, enabled = () => true) {
    this.scene = scene;
    this.enabled = enabled;
    this.items = [];
    this.index = 0;
    this.ring = scene.add.graphics().setDepth(1000);
    this.onKey = (e) => {
      if (!this.enabled() || !this.items.length) return;
      const d = DIRS[e.code];
      if (d) {
        this.move(d[0], d[1]);
        return;
      }
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        const it = this.current();
        if (it) it.activate();
      }
    };
    scene.input.keyboard.on('keydown', this.onKey);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', this.onKey));
  }

  setItems(items) {
    const prev = this.current()?.obj;
    this.items = items;
    const keep = items.findIndex((it) => it.obj === prev);
    this.index = keep >= 0 ? keep : Math.min(this.index, items.length - 1);
    this.refresh();
  }

  visible() {
    return this.items.filter((it) => it.obj.visible !== false && (it.obj.parentContainer?.visible ?? true));
  }

  current() {
    const it = this.items[this.index];
    return it && it.obj.visible !== false ? it : this.visible()[0];
  }

  center(it) {
    const b = it.obj.getBounds();
    return { x: b.centerX, y: b.centerY, b };
  }

  // Ближайшая кнопка в нужную сторону: вдоль направления — расстояние, поперёк — штраф вдвое
  move(dx, dy) {
    const cur = this.current();
    if (!cur) return;
    const c = this.center(cur);
    let best = null;
    let bs = Infinity;
    for (const it of this.visible()) {
      if (it === cur) continue;
      const p = this.center(it);
      const along = (p.x - c.x) * dx + (p.y - c.y) * dy;
      if (along <= 4) continue;
      const across = Math.abs((p.x - c.x) * dy - (p.y - c.y) * dx);
      const score = along + across * 2;
      if (score < bs) {
        bs = score;
        best = it;
      }
    }
    if (best) this.index = this.items.indexOf(best);
    this.refresh();
  }

  refresh() {
    const g = this.ring.clear();
    const cur = this.current();
    if (!cur) return;
    const { b } = this.center(cur);
    g.lineStyle(3, 0xf2c94c, 1).strokeRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8);
    this.scene.children.bringToTop(g);
  }
}
