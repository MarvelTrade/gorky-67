import * as Phaser from 'phaser';
import { ENEMIES, SPAWN, WORLD } from '../config.js';

// Спавнит врагов кольцом сразу за краем экрана.
// Пока только пехота с постоянной частотой; волны по таймеру — шаг 4.
export class WaveSpawner {
  constructor(scene, enemies, target) {
    this.scene = scene;
    this.enemies = enemies;
    this.target = target;
    this.timer = 0;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = SPAWN.interval;
    for (let i = 0; i < SPAWN.batch; i++) this.spawn('infantry');
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

    enemy.spawn(type, ENEMIES[type], x, y, this.target);
  }
}
