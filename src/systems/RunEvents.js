import { EVENTS, SPAWN } from '../config.js';
import { t } from '../i18n/index.js';
import { sfx } from './Sfx.js';

// Темп забега: орды на 1:30 и 3:30, затишье перед «Объектом».
// Вторая фаза босса тоже здесь — GameScene зовёт bossPhase2(), когда босс теряет половину HP.
export class RunEvents {
  constructor(scene) {
    this.scene = scene;
    this.hordes = EVENTS.horde.times.map((at) => ({ at, warned: false, started: false, done: false }));
    this.calm = { started: false, ended: false };
    // Урон, полученный во время орды, — без учёта лечения от ящиков и «Брони»
    scene.events.on('player-hurt', (amount) => {
      for (const h of this.hordes) if (h.started && !h.done) h.damage += amount;
    });
  }

  update(elapsed) {
    const H = EVENTS.horde;
    const p = this.scene.player;
    const spawner = this.scene.spawner;

    for (const h of this.hordes) {
      if (!h.warned && elapsed >= h.at - H.warn) {
        h.warned = true;
        this.scene.events.emit('radio', t('radio_horde'));
        this.scene.events.emit('alert', H.warn);
      }
      if (!h.started && elapsed >= h.at) {
        h.started = true;
        h.damage = 0;
        h.hpBefore = Math.round(p.hp);
        h.spawned = this.spawnRing(p.x, p.y, this.hordeRadius(), H.count, H.speed, H.hpMul, H.damage, h);
        spawner.infantryRate = H.spawnMul;
      }
      if (h.started && !h.done && elapsed >= h.at + H.duration) {
        h.done = true;
        h.hpAfter = Math.round(p.hp);
        spawner.infantryRate = 1;
      }
      if (h.done && elapsed >= h.at + H.duration + H.leftoverLife) this.expireLeftovers(h);
    }

    const C = EVENTS.calm;
    if (!this.calm.started && elapsed >= C.start) {
      this.calm.started = true;
      spawner.paused = true;
      this.scene.events.emit('radio', t('radio_calm'));
      sfx.duck(true);
    }
    if (this.calm.started && !this.calm.ended && elapsed >= C.start + C.duration) {
      this.calm.ended = true;
      spawner.paused = false;
      sfx.duck(false);
    }
  }

  // Кольцо орды всегда за краем экрана, даже на большом мониторе
  hordeRadius() {
    const cam = this.scene.cameras.main;
    const offscreen = Math.hypot(cam.width, cam.height) / cam.zoom / 2 + SPAWN.margin;
    return Math.max(EVENTS.horde.radius, offscreen);
  }

  // Вторая фаза «Объекта»: вспышка, тряска, реплика и рой вокруг него
  bossPhase2(boss) {
    const S = EVENTS.bossSwarm;
    this.scene.events.emit('radio', t('radio_bossPhase'));
    this.bossSwarm = this.spawnRing(boss.x, boss.y, S.radius, S.count, S.speed);
  }

  // Заражённые кольцом вокруг точки. Место в пуле освобождается заранее за счёт дальних рядовых
  spawnRing(cx, cy, radius, count, speed, hpMul = 1, damage = null, horde = null) {
    const { enemies, spawner } = this.scene;
    spawner.reserve(count);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const enemy = enemies.get();
      if (!enemy) break;
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      spawner.place(enemy, 'infantry', cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      enemy.speed = speed;
      enemy.hp *= hpMul;
      enemy.maxHp = enemy.hp;
      if (damage !== null) enemy.damage = damage;
      enemy.horde = horde;
      spawned++;
    }
    return spawned;
  }

  // Остатки орды, которые игрок уже не видит, тихо уходят (без опыта) — иначе слабая
  // сборка таскает за собой кольцо с утроенным HP до конца забега
  expireLeftovers(h) {
    const { enemies, spawner, cameras } = this.scene;
    const view = cameras.main.worldView;
    for (const e of enemies.getChildren()) {
      if (e.active && e.horde === h && !view.contains(e.x, e.y)) {
        e.despawn();
        spawner.stats.expired++;
      }
    }
  }

  // Для статистики: как прошла каждая орда к моменту конца забега
  summary() {
    const p = this.scene.player;
    return this.hordes
      .filter((h) => h.started)
      .map((h) => ({
        at: h.at,
        hpBefore: h.hpBefore,
        hpAfter: h.done ? h.hpAfter : Math.round(Math.max(0, p.hp)),
        survived: h.done,
        damage: h.damage,
        spawned: h.spawned,
      }));
  }
}
