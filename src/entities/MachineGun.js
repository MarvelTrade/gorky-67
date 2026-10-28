import * as Phaser from 'phaser';
import { GUN } from '../config.js';
import { findNearest } from '../systems/AutoAim.js';

// Стартовое оружие: сам стреляет в ближайшего врага в радиусе.
// Статы копируются из GUN, чтобы улучшения меняли их, не трогая конфиг.
export class MachineGun {
  constructor(scene, owner, bullets, enemies) {
    this.scene = scene;
    this.owner = owner;
    this.bullets = bullets;
    this.enemies = enemies;
    this.stats = { ...GUN };
    this.cooldown = 0;
  }

  update(dt) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const s = this.owner.sprite;
    const st = this.stats;
    const target = findNearest(this.enemies, s.x, s.y, st.range);
    if (!target) {
      this.cooldown = 0;
      return;
    }

    const bullet = this.bullets.get();
    if (!bullet) return;

    const mx = s.x + Math.cos(s.rotation) * st.muzzleOffset;
    const my = s.y + Math.sin(s.rotation) * st.muzzleOffset;
    const angle =
      Math.atan2(target.y - my, target.x - mx) + Phaser.Math.FloatBetween(-st.spread, st.spread);
    bullet.fire(mx, my, angle, st.bulletSpeed, st.damage, st.bulletLife);
    this.cooldown = 1 / st.fireRate;
  }
}
