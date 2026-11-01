import { CONVOY } from '../config.js';
import { DEPTH } from '../depth.js';
import { layout, lt } from '../levels.js';
import { sfx } from './Sfx.js';

// Автобусная колонна эвакуации (уровень 1): с запада по главному проспекту — БТР, жёлтые автобусы,
// БТР замыкающий. Встаёт на проспекте, пока грузятся люди; БТР сопровождения сами отстреливают
// заражённых рядом. Вышел «Объект» — колонна разворачивается и уходит на запад. Заражённые у автобуса
// его портят; сгоревший автобус остаётся на дороге. В итогах — сколько автобусов ушло.
// Картинки создаются один раз; в бою ничего не создаётся.
export class Convoy {
  constructor(scene) {
    this.scene = scene;
    const C = CONVOY;
    const av = layout.AVENUES[0];
    this.y = av.at + C.lane; // южная полоса — едут на восток
    this.state = 'wait'; // wait → in → stop → out → gone
    this.total = C.buses;
    this.saved = 0;
    this.vehicles = [];
    const keys = ['btrOwn', ...Array.from({ length: C.buses }, () => 'cityBus'), 'btrOwn'];
    keys.forEach((key, i) => {
      const img = scene.add.image(-200, this.y, key).setDepth(DEPTH.enemies - 0.1).setVisible(false);
      // Стоят колонной: голова — у stopX, остальные — следом с шагом spacing
      this.vehicles.push({ img, bus: key === 'cityBus', hp: C.busHp, alive: true, slot: i, gunT: Math.random() * C.gun.every });
    });
    this.tracer = scene.add.graphics().setDepth(DEPTH.enemies + 0.5);
    this.flashT = 0;
    this.leaving = false;
    scene.events.on('boss-spawned', () => this.leave());
  }

  leave() {
    if (this.state === 'in' || this.state === 'stop') {
      this.state = 'out';
      this.scene.events.emit('radio', lt('convoy_leave'), 'beryoza', true);
      for (const e of this.scene.enemies.getChildren()) e.prey = null;
      // Разворот: северная полоса, на запад
      for (const v of this.vehicles) v.img.setFlipX(true).y = this.y - CONVOY.lane * 2;
    }
  }

  update(dt, elapsed) {
    const C = CONVOY;
    if (this.state === 'wait') {
      if (elapsed < C.at) return;
      this.state = 'in';
      for (const v of this.vehicles) v.img.setVisible(true).setPosition(-60 - v.slot * C.spacing, this.y);
      this.scene.events.emit('radio', lt('convoy_arrive'), 'beryoza', true);
      return;
    }
    if (this.state === 'gone') return;
    if (this.flashT > 0 && (this.flashT -= dt) <= 0) this.tracer.clear();
    if (this.state === 'stop') this.sendRaiders(dt);
    let moving = false;
    for (const v of this.vehicles) {
      const img = v.img;
      if (this.state === 'in') {
        const tx = C.stopX - v.slot * C.spacing;
        if (v.alive && img.x < tx) {
          img.x = Math.min(tx, img.x + C.speed * dt);
          moving = true;
        }
      } else if (this.state === 'out' && v.alive) {
        img.x -= C.speed * dt;
        if (img.x > -80) moving = true;
        else if (img.visible) {
          img.setVisible(false);
          if (v.bus) this.saved++;
        }
      }
      if (!v.alive) continue;
      if (v.bus) this.hurt(v, dt);
      else this.shoot(v, dt);
    }
    if (this.state === 'in' && !moving) {
      this.state = 'stop';
      this.scene.events.emit('radio', lt('convoy_stop'), 'cheryomukha');
    }
    if (this.state === 'out' && !moving) {
      this.state = 'gone';
      this.tracer.clear();
    }
  }

  // Пока колонна стоит, часть толпы рядом идёт на автобусы, а не на вертолёт: колонну правда надо прикрывать
  sendRaiders(dt) {
    const C = CONVOY;
    this.raidT = (this.raidT ?? 0) - dt;
    if (this.raidT > 0) return;
    this.raidT = C.raidEvery;
    const buses = this.vehicles.filter((v) => v.bus && v.alive);
    if (!buses.length) return;
    let busy = 0;
    const free = [];
    const head = this.vehicles[0].img;
    const r2 = C.raidRange * C.raidRange;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || e.cfg.behavior !== 'chase') continue;
      if (e.prey) busy++;
      else if ((e.x - head.x) ** 2 + (e.y - head.y) ** 2 < r2) free.push(e);
    }
    for (let i = 0; i < free.length && busy < C.raiders; i++, busy++) {
      const e = free[i];
      // Ближайший к заражённому живой автобус
      let best = buses[0];
      let bd = Infinity;
      for (const b of buses) {
        const d = (b.img.x - e.x) ** 2 + (b.img.y - e.y) ** 2;
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      e.prey = best;
    }
  }

  // Заражённые у автобуса — портят его; сгорел — остаётся на дороге остовом
  hurt(v, dt) {
    const C = CONVOY;
    const r2 = C.touch * C.touch;
    const { x, y } = v.img;
    let n = 0;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.active && e.cfg.behavior === 'chase' && (e.x - x) ** 2 + (e.y - y) ** 2 < r2) n++;
    }
    if (!n) return;
    v.hp -= n * C.touchDps * dt;
    if (v.hp > 0) return;
    v.alive = false;
    v.img.setTint(0x3a3a3a);
    this.scene.explosionFx(x, y, 40, false); // дома вокруг не ломает
    sfx.play('explosion');
    this.scene.events.emit('radio', lt('convoy_bus_lost'), 'cheryomukha', true);
  }

  // БТР сопровождения: раз в gun.every с — по ближайшему заражённому в радиусе (не по «Объекту»)
  shoot(v, dt) {
    const G = CONVOY.gun;
    v.gunT -= dt;
    if (v.gunT > 0) return;
    v.gunT = G.every;
    const { x, y } = v.img;
    let best = null;
    let bd = G.range * G.range;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || e.type === 'boss') continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return;
    this.tracer.lineStyle(2, 0xffe08a, 0.9).lineBetween(x, y, best.x, best.y);
    this.flashT = 0.06;
    best.hit(G.damage);
  }

  // Для итогов: «ушло автобусов / всего»; колонна не приезжала — null
  result() {
    if (this.state === 'wait') return null;
    const alive = this.vehicles.filter((v) => v.bus && v.alive).length;
    return { saved: this.state === 'gone' ? this.saved : alive, total: this.total };
  }
}
