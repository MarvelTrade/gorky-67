import * as Phaser from 'phaser';
import { RAIL, WORLD } from '../config.js';
import { DEPTH } from '../depth.js';

// Товарный поезд по заводской ветке: заходит с севера через ж/д ворота, проходит завод и уходит на юг.
// Чистая декорация — пули и враги сквозь него. Картинки состава создаются один раз
export class Train {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    this.cars = [];
    this.cars.push(scene.add.image(x, -1000, 'loco').setDepth(DEPTH.ground + 2.6));
    for (let i = 0; i < RAIL.wagons; i++) {
      const key = i % 3 === 2 ? 'tankcar' : 'wagon'; // каждый третий — цистерна
      this.cars.push(scene.add.image(x, -1000, key).setDepth(DEPTH.ground + 2.6));
    }
    this.y = -200;
    this.wait = Phaser.Math.FloatBetween(2, 8);
  }

  update(dt) {
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    this.y += RAIL.speed * dt;
    // Голова — внизу (едет на юг), вагоны тянутся следом
    let y = this.y;
    for (const c of this.cars) {
      c.setPosition(this.x, y);
      y -= c.height + 3;
    }
    if (y > WORLD.height + 100) {
      // Ушёл — следующий состав через паузу
      this.y = -200;
      this.wait = Phaser.Math.FloatBetween(RAIL.pause[0], RAIL.pause[1]);
    }
  }
}
