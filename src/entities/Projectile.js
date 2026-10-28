import * as Phaser from 'phaser';
import { DEPTH } from '../depth.js';

// Пуля/снаряд из пула. Живёт life секунд, потом возвращается в пул.
export class Projectile extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet');
    this.setDepth(DEPTH.bullets);
  }

  fire(x, y, angle, speed, damage, life) {
    this.damage = damage;
    this.life = life;
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
