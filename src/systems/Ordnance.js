import * as Phaser from 'phaser';
import { ORDNANCE } from '../config.js';
import { DEPTH } from '../depth.js';
import { findNearest } from './AutoAim.js';

// Подвесное вооружение, берётся на барабанах (уровень 0 — не взято). Названия выдуманные:
//  bombs   — кассетные бомбы: сыплются под вертолёт, рвутся на земле (и ломают дома)
//  napalm  — зажигательные баки: лужа огня на земле, жжёт всех внутри
//  rockets — блок неуправляемых ракет: залп веером вперёд, рвутся при попадании
//  gas     — «Нейтрализатор»: реагент против «Зари» тянется шлейфом за вертолётом, жжёт и замедляет
// Всё рисуется в двух графиках (земля и облака), ракеты — пул картинок: без новых объектов в бою.
export class Ordnance {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.level = { bombs: 0, napalm: 0, rockets: 0, gas: 0 };
    this.timer = { bombs: 0, napalm: 0, rockets: 0, gas: 0 };
    this.falling = []; // бомбы и баки в полёте: { x, y, t, kind, img }
    this.pools = [];   // лужи огня: { x, y, r, left }
    this.clouds = [];  // облака реагента: { x, y, r, left }
    this.flying = []; // { img, vx, vy, left }
    this.tick = 0;
    this.ground = scene.add.graphics().setDepth(DEPTH.ground + 1.7);
    this.air = scene.add.graphics().setDepth(DEPTH.enemies + 0.5);
    this.flames = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 300, max: 600 },
        speedY: { min: -60, max: -20 },
        speedX: { min: -15, max: 15 },
        scale: { start: 1.3, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffe08a, 0xffa040, 0xff5a1f],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.enemies + 0.4);
  }

  // Сколько видов подвесного оружия уже взято — для лимита слотов на барабанах
  get taken() {
    return Object.values(this.level).filter((l) => l > 0).length;
  }

  stat(kind, key) {
    const v = ORDNANCE[kind][key];
    return Array.isArray(v) ? v[Math.min(this.level[kind], v.length) - 1] : v;
  }

  update(dt) {
    const p = this.player;
    if (!p.alive) return;
    for (const kind of Object.keys(this.level)) {
      if (!this.level[kind]) continue;
      this.timer[kind] -= dt;
      if (this.timer[kind] > 0) continue;
      this.timer[kind] = this.stat(kind, 'cooldown');
      this[kind]();
    }
    this.updateFalling(dt);
    this.updateRockets(dt);
    this.updateFields(dt);
  }

  // Кассета: count бомбочек россыпью под вертолётом
  bombs() {
    const p = this.player;
    const n = this.stat('bombs', 'count');
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * ORDNANCE.bombs.spread;
      this.drop('bomb', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, i * 0.06);
    }
  }

  napalm() {
    const p = this.player;
    // Бак летит туда, где гуще: к ближайшему врагу, если он недалеко
    const e = findNearest(this.scene.enemies, p.x, p.y, ORDNANCE.napalm.aim);
    this.drop('napalm', e ? e.x : p.x, e ? e.y : p.y, 0);
  }

  // Картинки бомб и баков — из пула: новый объект пересортировал бы всю сцену
  drop(kind, x, y, delay) {
    this.dropPool ??= [];
    let img = this.dropPool.find((i) => !i.visible);
    if (!img) {
      img = this.scene.add.image(0, 0, 'bullet').setDepth(DEPTH.bullets);
      this.dropPool.push(img);
    }
    img.setTexture(kind === 'bomb' ? 'bullet' : 'gem').setTint(kind === 'bomb' ? 0x2a2a2a : 0xd06020).setVisible(true);
    img.setPosition(this.player.x, this.player.y);
    this.falling.push({ x, y, t: -delay, kind, img, sx: this.player.x, sy: this.player.y });
  }

  updateFalling(dt) {
    const fall = ORDNANCE.fallTime;
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      const k = Phaser.Math.Clamp(f.t / fall, 0, 1);
      // Падает с высоты полёта к точке на земле, уменьшаясь
      f.img.setPosition(Phaser.Math.Linear(f.sx, f.x, k), Phaser.Math.Linear(f.sy, f.y, k)).setScale((f.kind === 'bomb' ? 1.6 : 1.2) * (1 - 0.4 * k));
      if (k < 1) continue;
      f.img.setVisible(false);
      this.falling.splice(i, 1);
      if (f.kind === 'bomb') this.blast(f.x, f.y, ORDNANCE.bombs.radius, this.stat('bombs', 'damage'));
      else this.pools.push({ x: f.x, y: f.y, r: this.stat('napalm', 'radius'), left: this.stat('napalm', 'duration') });
    }
  }

  // Взрыв на земле: урон всем в радиусе, вспышка и дома (explosionFx)
  blast(x, y, r, damage) {
    const r2 = r * r;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.active && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2) e.hit(damage);
    }
    this.scene.explosionFx(x, y, r);
  }

  // Залп неуправляемых ракет веером по носу
  rockets() {
    const p = this.player;
    const R = ORDNANCE.rockets;
    const n = this.stat('rockets', 'count');
    const nose = p.sprite.rotation;
    for (let i = 0; i < n; i++) {
      const a = nose + (i - (n - 1) / 2) * R.fan;
      let r = this.flying.find((x) => !x.img.visible);
      if (!r) {
        r = { img: this.scene.add.image(0, 0, 'missile').setDepth(DEPTH.bullets) };
        this.flying.push(r);
      }
      r.img.setPosition(p.x, p.y).setRotation(a).setVisible(true);
      r.vx = Math.cos(a) * R.speed;
      r.vy = Math.sin(a) * R.speed;
      r.left = R.range / R.speed;
    }
  }

  updateRockets(dt) {
    const R = ORDNANCE.rockets;
    const hit2 = R.hitRadius ** 2;
    const list = this.scene.enemies.getChildren();
    for (const r of this.flying) {
      if (!r.img.visible) continue;
      r.img.x += r.vx * dt;
      r.img.y += r.vy * dt;
      r.left -= dt;
      let boom = r.left <= 0;
      for (let i = 0; !boom && i < list.length; i++) {
        const e = list[i];
        if (e.active && (e.x - r.img.x) ** 2 + (e.y - r.img.y) ** 2 < hit2) boom = true;
      }
      if (!boom) continue;
      r.img.setVisible(false);
      this.blast(r.img.x, r.img.y, R.radius, this.stat('rockets', 'damage'));
    }
  }

  // «Нейтрализатор»: новое облако в шлейфе раз в cooldown
  gas() {
    const p = this.player;
    this.clouds.push({ x: p.x, y: p.y, r: this.stat('gas', 'radius'), left: ORDNANCE.gas.life });
  }

  // Лужи огня и облака: урон тиками, отрисовка
  updateFields(dt) {
    this.tick -= dt;
    const doTick = this.tick <= 0;
    if (doTick) this.tick = ORDNANCE.tick;
    const g = this.ground.clear();
    const c = this.air.clear();
    const enemies = this.scene.enemies.getChildren();
    const time = this.scene.time.now / 1000;

    for (let i = this.pools.length - 1; i >= 0; i--) {
      const f = this.pools[i];
      f.left -= dt;
      if (f.left <= 0) {
        this.pools.splice(i, 1);
        continue;
      }
      const fade = Math.min(1, f.left / 0.6);
      g.fillStyle(0x3a1a08, 0.55 * fade).fillCircle(f.x, f.y, f.r);
      g.fillStyle(0xff7a2e, (0.35 + 0.1 * Math.sin(time * 14 + f.x)) * fade).fillCircle(f.x, f.y, f.r * 0.8);
      if (Math.random() < 0.6) this.flames.emitParticleAt(f.x + (Math.random() - 0.5) * f.r * 1.4, f.y + (Math.random() - 0.5) * f.r * 1.4, 1);
      if (doTick) this.burn(enemies, f, this.stat('napalm', 'dps') * ORDNANCE.tick, 0);
    }

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const f = this.clouds[i];
      f.left -= dt;
      if (f.left <= 0) {
        this.clouds.splice(i, 1);
        continue;
      }
      const k = f.left / ORDNANCE.gas.life;
      c.fillStyle(0xd8f8e0, 0.22 * k).fillCircle(f.x, f.y, f.r * (1.15 - 0.15 * k));
      c.fillStyle(0xa8f0c0, 0.18 * k).fillCircle(f.x + 6, f.y - 4, f.r * 0.6);
      if (doTick) this.burn(enemies, f, this.stat('gas', 'dps') * ORDNANCE.tick, ORDNANCE.gas.slowTime);
    }
  }

  burn(enemies, f, damage, slow) {
    const r2 = f.r * f.r;
    for (const e of enemies) {
      if (!e.active || (e.x - f.x) ** 2 + (e.y - f.y) ** 2 > r2) continue;
      e.hit(damage, true);
      if (slow) e.slowT = slow;
    }
  }
}
