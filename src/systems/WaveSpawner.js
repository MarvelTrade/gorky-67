import * as Phaser from 'phaser';
import { ENEMIES, SPAWN, WAVES, WAVE_LENGTH, WORLD } from '../config.js';

// Спавнит врагов кольцом сразу за краем экрана по расписанию из WAVES.
// У каждого типа свой таймер; новая волна каждые WAVE_LENGTH секунд.
export class WaveSpawner {
  constructor(scene, enemies, target) {
    this.scene = scene;
    this.enemies = enemies;
    this.target = target;
    this.elapsed = 0;
    this.waveIndex = -1;
    this.timers = {};
  }

  get wave() {
    return WAVES[this.waveIndex];
  }

  update(dt) {
    this.elapsed += dt;
    const index = Math.min(WAVES.length - 1, Math.floor(this.elapsed / WAVE_LENGTH));
    if (index !== this.waveIndex) {
      this.waveIndex = index;
      // Новые типы появляются сразу, а не через полный интервал
      for (const type of Object.keys(ENEMIES)) this.timers[type] = 0;
      this.scene.events.emit('wave-changed', index + 1);
    }

    const wave = this.wave;
    for (const type of Object.keys(ENEMIES)) {
      const rule = wave[type];
      if (!rule) continue;
      this.timers[type] -= dt;
      if (this.timers[type] > 0) continue;
      this.timers[type] = rule.interval;
      for (let i = 0; i < rule.batch; i++) this.spawn(type);
    }
  }

  spawn(type) {
    const enemy = this.enemies.get();
    if (!enemy) return;

    // Размер камеры, а не worldView: тот в первом кадре ещё нулевой
    const cam = this.scene.cameras.main;
    const radius = Math.hypot(cam.width, cam.height) / cam.zoom / 2 + SPAWN.margin;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = Phaser.Math.Clamp(this.target.x + Math.cos(angle) * radius, 0, WORLD.width);
    const y = Phaser.Math.Clamp(this.target.y + Math.sin(angle) * radius, 0, WORLD.height);

    enemy.spawn(type, ENEMIES[type], x, y, this.target, this.wave.hpMul);
  }
}
