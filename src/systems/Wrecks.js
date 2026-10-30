import * as Phaser from 'phaser';
import { CHAOS, CITY, WORLD } from '../config.js';
import { DEPTH } from '../depth.js';

// Горящая техника на улицах — видно, что город в хаосе. Только декор: не мешает ни врагам, ни вертолёту.
// Огонь и дым — два общих эмиттера; частицы выпускаются только у остовов в кадре.
export class Wrecks {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.timer = 0;
    this.fire = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 400, max: 750 },
        speedX: { min: -14, max: 14 },
        speedY: { min: -70, max: -30 },
        scale: { start: 1.8, end: 0.2 }, // 0.9 на телефоне было не разглядеть
        alpha: { start: 0.95, end: 0 },
        tint: [0xffe08a, 0xffa040, 0xff5a1f],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.enemies + 1);
    this.smoke = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 1400, max: 2200 },
        speedX: { min: 8, max: 28 },
        speedY: { min: -45, max: -25 },
        scale: { start: 1.6, end: 4.5 },
        alpha: { start: 0.5, end: 0 },
        tint: 0x2c2c2c,
      })
      .setDepth(DEPTH.enemies + 1);
  }

  // Остовы — на улицах (полоса дороги по краю квартала), не у старта и не кучей
  build(rnd = Phaser.Math.RND) {
    const s = CITY.tile;
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    for (let tries = 0; tries < 500 && this.list.length < CHAOS.wrecks; tries++) {
      const along = rnd.between(40, WORLD.width - 40);
      const line = rnd.between(1, WORLD.width / s - 1) * s + rnd.between(-CITY.road + 10, CITY.road - 10);
      const [x, y] = rnd.frac() < 0.5 ? [line, along] : [along, line];
      if (Math.hypot(x - cx, y - cy) < CHAOS.startClear) continue;
      if (this.list.some((w) => Math.hypot(w.x - x, w.y - y) < CHAOS.gap)) continue;
      const key = rnd.frac() < 0.25 ? 'tank' : 'jeep';
      this.scene.add
        .image(x, y, 'puff')
        .setTint(0x000000)
        .setAlpha(0.45)
        .setScale(key === 'tank' ? 4.5 : 3)
        .setDepth(DEPTH.ground + 1); // копоть на асфальте
      // Отсвет огня на асфальте — мерцает в update
      const glow = this.scene.add
        .image(x, y, 'puff')
        .setTint(0xff7a2e)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(key === 'tank' ? 6 : 4.5)
        .setDepth(DEPTH.ground + 1);
      this.scene.add
        .image(x, y, key)
        .setTint(0x3a2f2a)
        .setRotation(rnd.angle() * (Math.PI / 180))
        .setDepth(DEPTH.ground + 2);
      this.list.push({ x, y, big: key === 'tank', glow, phase: rnd.frac() * 10 });
    }
  }

  update(dt) {
    this.time = (this.time ?? 0) + dt;
    this.timer -= dt;
    const emit = this.timer <= 0;
    if (emit) this.timer = CHAOS.emitEvery;
    const view = this.scene.cameras.main.worldView;
    for (const w of this.list) {
      if (!view.contains(w.x, w.y) && Math.hypot(w.x - view.centerX, w.y - view.centerY) > view.width) continue;
      w.glow.setAlpha(0.35 + 0.15 * Math.sin(this.time * 13 + w.phase) + 0.1 * Math.sin(this.time * 31 + w.phase));
      if (!emit) continue;
      this.fire.emitParticleAt(w.x + Phaser.Math.Between(-6, 6), w.y + Phaser.Math.Between(-4, 4), w.big ? 3 : 2);
      if (Math.random() < 0.6) this.smoke.emitParticleAt(w.x, w.y - 6, 1);
    }
  }
}
