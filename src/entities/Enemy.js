import * as Phaser from 'phaser';
import { DEPTH } from '../depth.js';

const FLASH_TIME = 0.06;

// Враг из пула. Тип задаётся конфигом из ENEMIES при spawn().
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'infantry');
    this.setDepth(DEPTH.enemies);
  }

  spawn(type, cfg, x, y, target) {
    this.type = type;
    this.cfg = cfg;
    this.target = target;
    this.hp = cfg.hp;
    this.damage = cfg.damage;
    this.speed = cfg.speed + Phaser.Math.FloatBetween(-cfg.speedJitter, cfg.speedJitter);
    this.flash = 0;

    this.setTexture(type);
    this.enableBody(true, x, y, true, true);
    this.body.setCircle(cfg.radius, this.width / 2 - cfg.radius, this.height / 2 - cfg.radius);
    this.clearTint();
  }

  hit(damage) {
    if (!this.active) return false;
    this.hp -= damage;
    this.flash = FLASH_TIME;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.disableBody(true, true);
    this.scene.events.emit('enemy-killed', this);
  }

  update(time, delta) {
    if (!this.active) return;
    const dt = delta / 1000;

    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.clearTint();
    }

    const t = this.target;
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    this.rotation = Math.atan2(dy, dx);
  }
}
