import * as Phaser from 'phaser';
import { AIR, CHAOS, CITY, WORLD } from '../config.js';
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
      .setDepth(DEPTH.buildings + 0.5); // выше крыш: горят и дома, а дым поднимается над кварталом
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
      .setDepth(DEPTH.buildings + 0.5); // выше крыш: горят и дома, а дым поднимается над кварталом
  }

  // Улицы после катастрофы: сгоревшая военная техника, троллейбусы под сетью, заторы, аварии с телами.
  // Всё на проезжей части, не у старта; часть горит.
  build(rnd = Phaser.Math.RND) {
    this.rnd = rnd;
    this.spots = []; // занятые места — сцены не громоздятся друг на друга
    const C = CHAOS;
    // Сгоревшая военная техника
    for (let i = 0; i < C.military; i++) {
      const p = this.roadPoint();
      if (!p) break;
      const key = rnd.frac() < 0.3 ? 'tank' : 'jeep';
      this.put(key, p.x, p.y, rnd.angle() * (Math.PI / 180), true, true, key === 'tank');
    }
    // Троллейбусы встали под оборванной сетью: под пролётами троллейбусных маршрутов
    const spans = rnd.shuffle((this.scene.air?.wires ?? []).slice()).slice(0, C.trolleys);
    for (const w of spans) {
      const t = rnd.realInRange(0.25, 0.75);
      const lane = rnd.pick([-1, 1]) * 13;
      const x = w.x1 + (w.x2 - w.x1) * t + (w.dir === 'v' ? lane : 0);
      const y = w.y1 + (w.y2 - w.y1) * t + AIR.wires.lift + (w.dir === 'h' ? lane : 0);
      const angle = (w.dir === 'v' ? Math.PI / 2 : 0) + (rnd.frac() < 0.5 ? Math.PI : 0) + rnd.realInRange(-0.15, 0.15);
      this.put('trolley', x, y, angle, rnd.frac() < C.trolleyBurn, rnd.frac() < 0.5, true);
      this.spots.push({ x, y });
    }
    // Заторы: цепочка брошенных машин вдоль улицы, одна-две горят
    for (let i = 0; i < C.jams; i++) {
      const p = this.roadPoint();
      if (!p) break;
      const n = rnd.between(3, 6);
      for (let k = 0; k < n; k++) {
        const d = (k - n / 2) * 32;
        const lane = rnd.pick([-1, 1]) * rnd.between(6, 16);
        const x = p.x + (p.dir === 'v' ? lane : d);
        const y = p.y + (p.dir === 'v' ? d : lane);
        const angle = (p.dir === 'v' ? Math.PI / 2 : 0) + (rnd.frac() < 0.5 ? Math.PI : 0) + rnd.realInRange(-0.35, 0.35);
        this.put(`car${rnd.between(0, 4)}`, x, y, angle, rnd.frac() < 0.2, rnd.frac() < 0.15);
      }
    }
    // Аварии: две машины носами друг к другу, рядом накрытые тела
    for (let i = 0; i < C.crashes; i++) {
      const p = this.roadPoint();
      if (!p) break;
      const a = rnd.angle() * (Math.PI / 180);
      this.put(`car${rnd.between(0, 4)}`, p.x - Math.cos(a) * 13, p.y - Math.sin(a) * 13, a, rnd.frac() < 0.5, true);
      this.put(`car${rnd.between(0, 4)}`, p.x + Math.cos(a) * 13, p.y + Math.sin(a) * 13, a + Math.PI + rnd.realInRange(-0.6, 0.6), false, rnd.frac() < 0.4);
      for (let k = rnd.between(1, 2); k > 0; k--) {
        this.scene.culler?.add(
          this.scene.add
            .image(p.x + rnd.between(-26, 26), p.y + rnd.between(-26, 26), 'covered')
            .setRotation(rnd.angle() * (Math.PI / 180))
            .setDepth(DEPTH.ground + 2)
        );
      }
    }
  }

  // Точка на проезжей части: линия между кварталами ± полоса, не у старта и не впритык к другим сценам
  roadPoint() {
    const rnd = this.rnd;
    const s = CITY.tile;
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    for (let tries = 0; tries < 300; tries++) {
      const along = rnd.between(60, WORLD.width - 60);
      const line = rnd.between(1, WORLD.width / s - 1) * s + rnd.between(-CITY.road + 12, CITY.road - 12);
      const dir = rnd.frac() < 0.5 ? 'v' : 'h';
      const [x, y] = dir === 'v' ? [line, along] : [along, line];
      if (Math.hypot(x - cx, y - cy) < CHAOS.startClear) continue;
      if (this.scene.river?.contains(x, y, 40)) continue; // не в реке
      if (this.spots.some((o) => Math.hypot(o.x - x, o.y - y) < CHAOS.gap)) continue;
      this.spots.push({ x, y });
      return { x, y, dir };
    }
    return null;
  }

  // Машина на улице; burnt — обуглена и с копотью, burning — горит (огонь, дым, отсвет)
  put(key, x, y, angle, burnt, burning, big = false) {
    if (burnt || burning) {
      this.scene.culler?.add(this.scene.add.image(x, y, 'puff').setTint(0x000000).setAlpha(0.4).setScale(big ? 4.5 : 3).setDepth(DEPTH.ground + 1));
    }
    let glow = null;
    if (burning) {
      glow = this.scene.add
        .image(x, y, 'puff')
        .setTint(0xff7a2e)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(big ? 6 : 4.5)
        .setDepth(DEPTH.ground + 1);
      this.scene.culler?.add(glow);
    }
    const img = this.scene.add.image(x, y, key).setRotation(angle).setDepth(DEPTH.ground + 2);
    this.scene.culler?.add(img);
    if (burnt || burning) img.setTint(0x3a2f2a);
    if (burning) this.list.push({ x, y, big, glow, phase: this.rnd.frac() * 10 });
  }

  // Горящий дом: огонь из окон и на крыше (Buildings отмечает такие дома)
  addFire(x, y, big = false) {
    this.list.push({ x, y, big, glow: null, phase: Math.random() * 10 });
  }

  update(dt) {
    this.time = (this.time ?? 0) + dt;
    this.timer -= dt;
    const emit = this.timer <= 0;
    if (emit) this.timer = CHAOS.emitEvery;
    const view = this.scene.cameras.main.worldView;
    for (const w of this.list) {
      if (!view.contains(w.x, w.y) && Math.hypot(w.x - view.centerX, w.y - view.centerY) > view.width) continue;
      w.glow?.setAlpha(0.35 + 0.15 * Math.sin(this.time * 13 + w.phase) + 0.1 * Math.sin(this.time * 31 + w.phase));
      if (!emit) continue;
      this.fire.emitParticleAt(w.x + Phaser.Math.Between(-6, 6), w.y + Phaser.Math.Between(-4, 4), w.big ? 3 : 2);
      if (Math.random() < 0.6) this.smoke.emitParticleAt(w.x, w.y - 6, 1);
    }
  }
}
