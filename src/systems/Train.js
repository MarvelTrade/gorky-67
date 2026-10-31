import { RAIL } from '../config.js';
import { DEPTH } from '../depth.js';
import { layout } from '../levels.js';

// Эвакуационный поезд на столицу: вывозит документы Объекта. Идёт по ветке на север, не останавливаясь;
// в городе стоит у станции и в начале забега трогается, в деревне уже идёт мимо. Один состав за уровень —
// ушёл за край карты, и всё. Чистая декорация — пули и враги сквозь него. Картинки создаются один раз
export class Train {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    const plan = layout.train ?? { y: 2000, stand: 2, moving: false };
    this.y = plan.y; // голова состава
    this.stand = plan.stand;
    this.v = plan.moving ? RAIL.speed : 0;
    this.gone = false;
    // Текстуры нарисованы носом на юг — переворачиваем: едем на север
    this.cars = [scene.add.image(x, 0, 'loco').setFlipY(true).setDepth(DEPTH.ground + 2.6)];
    for (let i = 0; i < RAIL.wagons; i++) {
      const key = i % 3 === 2 ? 'tankcar' : 'wagon'; // каждый третий — цистерна
      this.cars.push(scene.add.image(x, 0, key).setFlipY(true).setDepth(DEPTH.ground + 2.6));
    }
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
    return y;
  }

  update(dt) {
    if (this.gone) return;
    if (this.stand > 0) {
      this.stand -= dt;
      return;
    }
    this.v = Math.min(RAIL.speed, this.v + RAIL.accel * dt);
    this.y -= this.v * dt;
    const tail = this.place();
    if (tail < -40) {
      // Ушёл на столицу — дальше по ветке пусто
      this.gone = true;
      for (const c of this.cars) c.setVisible(false);
    }
  }
}
