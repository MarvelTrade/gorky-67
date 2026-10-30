import * as Phaser from 'phaser';
import { ENEMIES, SPAWN, WAVES, WAVE_LENGTH, WORLD, BOSS_SPAWN } from '../config.js';

// Спавнит врагов кольцом сразу за краем экрана по расписанию из WAVES.
// У каждого типа свой таймер; новая волна каждые WAVE_LENGTH секунд.
// Число живых держится в коридоре wave.alive: выше максимума расписание пропускается,
// ниже минимума пехота идёт чаще.
export class WaveSpawner {
  constructor(scene, enemies, target) {
    this.scene = scene;
    this.enemies = enemies;
    this.target = target;
    this.elapsed = 0;
    this.waveIndex = -1;
    this.timers = {};
    this.bossSpawned = false;
    this.paused = false; // затишье перед боссом — новых врагов нет
    this.infantryRate = 1; // во время орды обычной пехоты меньше
    // Для замеров: сколько пропущено выше максимума, сколько убрано ради орды/босса,
    // сколько остатков орды ушло, сколько не влезло в пул и пик живых
    this.stats = { suppressed: 0, freed: 0, expired: 0, poolFull: 0, maxAlive: 0 };
  }

  get wave() {
    return WAVES[this.waveIndex];
  }

  update(dt) {
    this.elapsed += dt;
    const index = Math.min(WAVES.length - 1, Math.floor(this.elapsed / WAVE_LENGTH));
    if (index !== this.waveIndex) {
      this.waveIndex = index;
      // Новые типы появляются сразу (или через from секунд), а не через полный интервал
      for (const type of Object.keys(ENEMIES)) this.timers[type] = WAVES[index][type]?.from ?? 0;
      this.scene.events.emit('wave-changed', index + 1);
    }

    if (!this.bossSpawned && this.elapsed >= BOSS_SPAWN.at) {
      this.bossSpawned = true;
      this.spawnBoss();
    }

    const alive = this.enemies.countActive();
    this.stats.maxAlive = Math.max(this.stats.maxAlive, alive);
    if (this.paused) return;
    const wave = this.wave;
    const [minAlive, maxAlive] = wave.alive;
    for (const type of Object.keys(ENEMIES)) {
      const rule = wave[type];
      if (!rule) continue;
      const refill = type === 'infantry' && alive < minAlive ? SPAWN.refillBoost : 1;
      this.timers[type] -= dt * refill;
      if (this.timers[type] > 0) continue;
      this.timers[type] = rule.interval / (type === 'infantry' ? this.infantryRate : 1);
      if (alive >= maxAlive) {
        this.stats.suppressed += rule.batch;
        continue;
      }
      for (let i = 0; i < rule.batch; i++) this.spawn(type);
    }
  }

  // Освободить в пуле место под count врагов: убрать самых дальних рядовых (без опыта).
  // Орда и босс не должны тихо недоспавниваться из-за полного пула.
  reserve(count) {
    const free = SPAWN.maxEnemies - this.enemies.countActive();
    if (free >= count) return;
    const t = this.target;
    const victims = this.enemies
      .getChildren()
      .filter((e) => e.active && SPAWN.disposable.includes(e.type))
      .sort((a, b) => (b.x - t.x) ** 2 + (b.y - t.y) ** 2 - ((a.x - t.x) ** 2 + (a.y - t.y) ** 2))
      .slice(0, count - free);
    for (const e of victims) e.despawn();
    this.stats.freed += victims.length;
  }

  spawn(type) {
    const enemy = this.enemies.get();
    if (!enemy) {
      this.stats.poolFull++;
      return;
    }

    // Размер камеры, а не worldView: тот в первом кадре ещё нулевой
    const cam = this.scene.cameras.main;
    const radius = Math.hypot(cam.width, cam.height) / cam.zoom / 2 + SPAWN.margin;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.place(enemy, type, this.target.x + Math.cos(angle) * radius, this.target.y + Math.sin(angle) * radius);
  }

  // Поставить врага в точку (в пределах мира) с живучестью текущей волны
  place(enemy, type, x, y) {
    x = Phaser.Math.Clamp(x, 0, WORLD.width);
    y = Phaser.Math.Clamp(y, 0, WORLD.height);
    enemy.spawn(type, ENEMIES[type], x, y, this.target, this.wave.hpMul, this.wave.dmgMul ?? 1);
  }

  // Босс не должен потеряться из-за полного пула — освобождаем место за счёт рядового врага
  spawnBoss() {
    this.reserve(1);
    let boss = this.enemies.get();
    if (!boss) {
      // в пуле одна техника — убираем любого
      this.enemies.getFirst(true).despawn();
      boss = this.enemies.get();
    }
    const margin = ENEMIES.boss.radius * 2;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = Phaser.Math.Clamp(this.target.x + Math.cos(angle) * BOSS_SPAWN.dist, margin, WORLD.width - margin);
    const y = Phaser.Math.Clamp(this.target.y + Math.sin(angle) * BOSS_SPAWN.dist, margin, WORLD.height - margin);
    boss.spawn('boss', ENEMIES.boss, x, y, this.target);
    this.scene.events.emit('boss-spawned', boss);
  }
}
