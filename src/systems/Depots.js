import * as Phaser from 'phaser';
import { DEPOT, XP, MONUMENT, CITY } from '../config.js';
import { t } from '../i18n/index.js';
import { DEPTH } from '../depth.js';
import { sfx } from './Sfx.js';

// Полевые склады на улицах: штабель ящиков под брезентом. Подлетел ближе DEPOT.aimRange —
// пулемёт переключается на склад (MachineGun спрашивает target()), разбил — выпадают рубли
// и запчасти. Добыча тянется магнитом, как кристаллы; за забег копится в money / parts.
export class Depots {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.money = 0;
    this.parts = 0;
    this.broken = 0;
    this.list = [];
    this.loot = [];
    for (let i = 0; i < DEPOT.count; i++) {
      const p = scene.wrecks.roadPoint(); // не на машинах и не у старта
      if (!p) break;
      // Золотое кольцо цвета монет — чтобы склад не путался с обгоревшими машинами
      const ring = scene.add.circle(p.x, p.y, 34).setStrokeStyle(3, 0xf2c94c, 0.8).setDepth(DEPTH.ground + 2);
      scene.tweens.add({ targets: ring, scale: { from: 0.8, to: 1.25 }, alpha: { from: 0.9, to: 0.15 }, duration: 1100, repeat: -1 });
      const img = scene.add
        .image(p.x, p.y, 'depot')
        .setAngle(p.dir === 'v' ? 90 : 0)
        .setDepth(DEPTH.ground + 3);
      scene.culler?.add(ring);
      scene.culler?.add(img);
      this.list.push({ x: p.x, y: p.y, hp: DEPOT.hp, img, ring, active: true });
    }
  }

  // Памятник «Рабочему с шестернёй» в центре первой площади: сбивается, как склад, добыча больше
  addMonument() {
    const sq = this.scene.districts?.S?.[0];
    if (!sq) return;
    const x = sq.x + CITY.tile / 2;
    const y = sq.y + CITY.tile / 2;
    const img = this.scene.add.image(x, y, 'monument').setOrigin(0.5, 0.85).setDepth(DEPTH.buildings + y / 1e5);
    this.scene.culler?.add(img);
    this.list.push({ x, y, hp: MONUMENT.hp, img, ring: null, active: true, monument: true });
  }

  // Ближайший целый склад в радиусе прицела — или null
  target(x, y) {
    let best = null;
    let bd = DEPOT.aimRange;
    for (const d of this.list) {
      if (!d.active) continue;
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    return best;
  }

  update(dt) {
    const p = this.player;
    // Пули, пущенные по складу (only === склад, active — как у врага), летят сквозь врагов — попадание считаем здесь
    for (const d of this.list) {
      if (!d.active || Math.hypot(d.x - p.x, d.y - p.y) > 600) continue;
      for (const b of this.scene.bullets.getChildren()) {
        if (!b.active || b.only !== d) continue;
        if (Math.hypot(b.x - d.x, b.y - d.y) < DEPOT.radius) {
          b.kill();
          this.hit(d, b.damage);
          if (!d.active) break;
        }
      }
    }

    // Добыча: лежит, пока не попадёт в магнит, потом летит к вертолёту с ускорением
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      if (l.wait > 0) {
        l.wait -= dt;
        continue;
      }
      const dx = p.x - l.img.x;
      const dy = p.y - l.img.y;
      const dist = Math.hypot(dx, dy);
      if (!l.speed) {
        if (dist > p.stats.magnetRadius) continue;
        l.speed = XP.gemStartSpeed;
      }
      if (dist < DEPOT.pickupRadius) {
        this.collect(l);
        this.loot.splice(i, 1);
        continue;
      }
      l.speed += XP.gemAccel * dt;
      const step = Math.min(dist, l.speed * dt);
      l.img.x += (dx / dist) * step;
      l.img.y += (dy / dist) * step;
    }
  }

  hit(d, damage) {
    d.hp -= damage;
    // Короткий «вздрог» штабеля — видно, что попадаешь
    if (!this.scene.tweens.isTweening(d.img)) {
      this.scene.tweens.add({ targets: d.img, scale: 1.12, duration: 50, yoyo: true });
    }
    if (d.hp <= 0) this.breakOpen(d);
  }

  breakOpen(d) {
    d.active = false;
    this.broken++;
    this.scene.tweens.killTweensOf(d.img);
    if (d.monument) {
      // Памятник падает: пьедестал остаётся, фигура лежит рядом
      d.img.setTexture('monumentFallen').setScale(1);
      this.scene.events.emit('explosion', d.x, d.y, 40);
      this.scene.events.emit('radio', t('vova_monument'), 'vova', false);
      this.drop(d.x, d.y, MONUMENT.money, MONUMENT.parts);
      return;
    }
    d.img.setTexture('depotBroken').setScale(1);
    d.ring.destroy();
    this.scene.events.emit('explosion', d.x, d.y, 34);
    sfx.play('depot');
    const sum = Phaser.Math.Between(DEPOT.money[0], DEPOT.money[1]);
    const parts = Math.random() < DEPOT.partChance ? 1 : 0;
    this.drop(d.x, d.y, sum, parts);
  }

  // Рубли — несколькими монетами, запчасти — по одной
  drop(x, y, money, parts) {
    const coins = Math.min(DEPOT.coins, money);
    for (let i = 0; i < coins; i++) {
      const v = Math.floor(money / coins) + (i < money % coins ? 1 : 0);
      this.spawnLoot(x, y, 'coin', v);
    }
    for (let i = 0; i < parts; i++) this.spawnLoot(x, y, 'part', 1);
  }

  spawnLoot(x, y, kind, value) {
    const img = this.scene.add.image(x, y, kind).setDepth(DEPTH.gems);
    const a = Math.random() * Math.PI * 2;
    const r = DEPOT.scatter * (0.4 + Math.random() * 0.6);
    // Разлёт из склада, потом лежит — чтобы было видно, что выпало
    this.scene.tweens.add({ targets: img, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, duration: 300, ease: 'Quad.Out' });
    this.loot.push({ img, kind, value, wait: 0.35, speed: 0 });
  }

  collect(l) {
    if (l.kind === 'coin') this.money += l.value;
    else this.parts += l.value;
    l.img.destroy();
    sfx.play('pickup');
  }
}
