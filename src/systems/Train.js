import { RAIL } from '../config.js';
import { DEPTH } from '../depth.js';
import { layout, level } from '../levels.js';

// Военный эшелон на Славоград: тепловоз, вагон с пушкой и десять платформ под морские контейнеры.
// В Горьком-67 берёт первый контейнер (документы Объекта), на каждой следующей станции — ещё один:
// контейнеров на платформах столько, какой это уровень. Идёт на север, не останавливаясь; в городе
// стоит у станции и в начале забега трогается, дальше уже идёт мимо. Один состав за уровень.
// Пушка второго вагона сама отстреливает заражённых рядом с путями; остальное — декорация
export class Train {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    const plan = layout.train ?? { y: 2000, stand: 2, moving: false };
    this.y = plan.y; // голова состава
    this.stand = plan.stand;
    this.v = plan.moving ? RAIL.speed : 0;
    this.gone = false;
    const depth = DEPTH.ground + 2.6;
    // Текстуры нарисованы носом на юг — переворачиваем: едем на север
    this.cars = [scene.add.image(x, 0, 'loco').setFlipY(true).setDepth(depth)];
    this.gunCar = scene.add.image(x, 0, 'gunwagon').setFlipY(true).setDepth(depth);
    this.cars.push(this.gunCar);
    const loaded = Math.min(RAIL.wagons, level.n);
    for (let i = 0; i < RAIL.wagons; i++) {
      const key = i < loaded ? `flatcarBox${i % 3}` : 'flatcar';
      this.cars.push(scene.add.image(x, 0, key).setFlipY(true).setDepth(depth));
    }
    // Башня пушки — поверх вагона, поворачивается к цели; трассер — одна графика на весь состав
    this.turret = scene.add.image(x, 0, 'gunTurret').setDepth(depth + 0.05).setRotation(-Math.PI / 2);
    this.tracer = scene.add.graphics().setDepth(DEPTH.enemies + 0.5);
    this.gunT = 0;
    this.flashT = 0;
    this.place();
  }

  // Голова — вверху, вагоны тянутся следом на юг
  place() {
    let y = this.y;
    let prev = 0;
    for (const c of this.cars) {
      y += prev / 2 + c.height / 2 + (prev ? 3 : 0);
      c.setPosition(this.x, y - this.cars[0].height / 2);
      prev = c.height;
    }
    this.turret.setPosition(this.gunCar.x, this.gunCar.y);
    return y;
  }

  update(dt) {
    if (this.gone) return;
    this.updateGun(dt);
    if (this.stand > 0) {
      this.stand -= dt;
      return;
    }
    this.v = Math.min(RAIL.speed, this.v + RAIL.accel * dt);
    this.y -= this.v * dt;
    const tail = this.place();
    if (tail < -40) {
      // Ушёл на Славоград — дальше по ветке пусто
      this.gone = true;
      for (const c of this.cars) c.setVisible(false);
      this.turret.setVisible(false);
      this.tracer.clear();
    }
  }

  // Пушка: раз в gunEvery с — по ближайшему заражённому в gunRange от вагона (не по «Объекту»)
  updateGun(dt) {
    const G = RAIL.gun;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.tracer.clear();
    }
    this.gunT -= dt;
    if (this.gunT > 0) return;
    this.gunT = G.every;
    const gx = this.gunCar.x;
    const gy = this.gunCar.y;
    let best = null;
    let bd = G.range * G.range;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || e.type === 'boss') continue;
      const d = (e.x - gx) ** 2 + (e.y - gy) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return;
    const a = Math.atan2(best.y - gy, best.x - gx);
    this.turret.setRotation(a);
    this.tracer.clear().lineStyle(2, 0xffe08a, 0.9).lineBetween(gx + Math.cos(a) * 12, gy + Math.sin(a) * 12, best.x, best.y);
    this.flashT = 0.06;
    best.hit(G.damage);
  }
}
