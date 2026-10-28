import * as Phaser from 'phaser';
import { DEPTH } from '../depth.js';
import { findNearest } from '../systems/AutoAim.js';

// Самонаводящаяся ракета из пула. Если цель умерла — ищет новую.
// Взрывом задевает всех врагов в радиусе splash.
export class Missile extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'missile');
    this.setDepth(DEPTH.bullets);
  }

  fire(x, y, angle, stats, target, enemies) {
    this.stats = stats;
    this.target = target;
    this.enemies = enemies;
    this.life = stats.life;
    this.enableBody(true, x, y, true, true);
    this.rotation = angle;
    this.body.setVelocity(Math.cos(angle) * stats.speed, Math.sin(angle) * stats.speed);
  }

  explode() {
    if (!this.active) return;
    const { splash, damage } = this.stats;
    const r2 = splash * splash;
    const list = this.enemies.getChildren();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (dx * dx + dy * dy <= r2) e.hit(damage);
    }
    this.scene.events.emit('explosion', this.x, this.y, splash);
    this.disableBody(true, true);
  }

  update(time, delta) {
    if (!this.active) return;
    const dt = delta / 1000;
    this.life -= dt;
    if (this.life <= 0) {
      this.explode();
      return;
    }

    if (!this.target || !this.target.active) {
      this.target = findNearest(this.enemies, this.x, this.y, this.stats.range);
    }
    if (this.target) {
      const aim = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, aim, this.stats.turnRate * dt);
    }
    const sp = this.stats.speed;
    this.body.setVelocity(Math.cos(this.rotation) * sp, Math.sin(this.rotation) * sp);
  }
}
