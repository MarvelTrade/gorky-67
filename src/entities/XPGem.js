import * as Phaser from 'phaser';
import { XP } from '../config.js';
import { DEPTH } from '../depth.js';

// Кристалл опыта из пула. Без физики: лежит, пока не попадёт в радиус магнита,
// потом летит к игроку с ускорением.
export class XPGem extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'gem');
    this.setDepth(DEPTH.gems);
  }

  drop(x, y, value, player) {
    this.value = value;
    this.player = player;
    this.attracted = false;
    this.speed = 0;
    this.setPosition(x, y).setActive(true).setVisible(true);
  }

  collect() {
    this.setActive(false).setVisible(false);
    this.scene.events.emit('xp-collected', this.value);
  }

  update(time, delta) {
    if (!this.active) return;
    const p = this.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (!this.attracted) {
      if (dist > p.stats.magnetRadius) return;
      this.attracted = true;
      this.speed = XP.gemStartSpeed;
    }

    if (dist < XP.pickupRadius) {
      this.collect();
      return;
    }

    const dt = delta / 1000;
    this.speed += XP.gemAccel * dt;
    const step = Math.min(dist, this.speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }
}
