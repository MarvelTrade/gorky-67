import * as Phaser from 'phaser';
import { DEPTH } from '../depth.js';

// Пуля/снаряд из пула. Живёт life секунд, потом возвращается в пул.
export class Projectile extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet');
    this.setDepth(DEPTH.bullets);
  }

  // only — если задан, снаряд пролетает сквозь всех, кроме этой цели (выстрелы по «Объекту»)
  fire(x, y, angle, speed, damage, life, only = null) {
    this.damage = damage;
    this.life = life;
    this.only = only;
    this.enableBody(true, x, y, true, true);
    this.rotation = angle;
    this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill() {
    this.disableBody(true, true);
  }

  update(time, delta) {
    if (!this.active) return;
    this.life -= delta / 1000;
    if (this.life <= 0) this.kill();
  }
}

// Вражеский снаряд: то же самое, только текстура своя у каждого стрелка
export class EnemyShell extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.setTexture('shell');
  }

  fire(x, y, angle, speed, damage, life, texture = 'shell') {
    this.setTexture(texture);
    super.fire(x, y, angle, speed, damage, life);
    this.body.setCircle(5, this.width / 2 - 5, this.height / 2 - 5);
  }
}
