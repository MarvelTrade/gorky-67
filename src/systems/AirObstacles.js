import * as Phaser from 'phaser';
import { AIR, CITY, FX, WORLD } from '../config.js';
import { DEPTH } from '../depth.js';
import { sfx } from './Sfx.js';

// Воздушные препятствия: без них небо пустое и висеть над городом можно где угодно.
//  - Высокие сооружения (радиовышка, водонапорные башни, колокольни, трубы) — стена без урона
//    для вертолёта и для наземных врагов: обходить, а не пролетать.
//  - Провода между домами напротив друг друга — риск, а не стена: пролёт стоит AIR.wires.damage,
//    провод рвётся. Можно прорваться, спасаясь от орды.
export class AirObstacles {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.towers = scene.physics.add.staticGroup();
    this.wires = [];
    this.wireGfx = scene.add.graphics().setDepth(DEPTH.wires);
    this.cut = 0; // для замеров: сколько проводов порвал вертолёт
  }

  // Вызывается после drawGround: дома уже в scene.nav.rects
  build(rnd = Phaser.Math.RND) {
    // Только дома: башни тоже попадут в nav.rects, но провода к ним не тянут
    this.buildings = this.scene.nav.rects.slice();
    const placed = [];
    for (const [kind, def] of Object.entries(AIR.towers)) {
      for (let i = 0; i < def.count; i++) {
        const spot = this.findSpot(rnd, placed, def.radius);
        if (!spot) continue;
        placed.push(spot);
        this.addTower(kind, def, spot.x, spot.y);
      }
    }
    this.buildWires(rnd);
    this.drawWires();
  }

  // Случайная точка внутри квартала: не на улице, не в доме, не у старта и не рядом с другой башней
  findSpot(rnd, placed, radius) {
    const s = CITY.tile;
    const rects = this.buildings;
    const m = AIR.buildingMargin + radius;
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    for (let tries = 0; tries < 400; tries++) {
      const tx = rnd.between(0, WORLD.width / s - 1) * s;
      const ty = rnd.between(0, WORLD.height / s - 1) * s;
      const x = tx + rnd.between(AIR.roadMargin, s - AIR.roadMargin);
      const y = ty + rnd.between(AIR.roadMargin, s - AIR.roadMargin);
      if (Math.hypot(x - cx, y - cy) < AIR.startClear) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < AIR.towerGap)) continue;
      if (rects.some(([rx, ry, rw, rh]) => x > rx - m && x < rx + rw + m && y > ry - m && y < ry + rh + m)) continue;
      return { x, y };
    }
    return null;
  }

  addTower(kind, def, x, y) {
    const sh = AIR.shadow;
    this.scene.add
      .image(x + sh.x, y + sh.y, def.texture)
      .setTint(0x000000)
      .setAlpha(sh.alpha)
      .setScale(1.1, 1.6)
      .setDepth(DEPTH.towerShadow);
    this.scene.add.image(x, y, def.texture).setDepth(DEPTH.towers);
    const zone = this.scene.add.zone(x, y, def.radius * 2, def.radius * 2);
    this.towers.add(zone);
    zone.body.setCircle(def.radius);
    zone.kind = kind;
    // Башня — препятствие и для наземных врагов
    const r = def.radius;
    this.scene.nav.rects.push([x - r, y - r, r * 2, r * 2]);
    this.scene.nav.markBlocked([x - r, y - r, r * 2, r * 2]);
  }

  // Провод тянут между стенами двух домов, стоящих друг напротив друга через улицу или двор
  buildWires(rnd) {
    const W = AIR.wires;
    const rects = this.buildings;
    const cands = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const [ax, ay, aw, ah] = rects[i];
        const [bx, by, bw, bh] = rects[j];
        // По горизонтали: b правее a (или наоборот), перекрытие по вертикали
        const oy0 = Math.max(ay, by);
        const oy1 = Math.min(ay + ah, by + bh);
        const gapX = bx > ax ? bx - (ax + aw) : ax - (bx + bw);
        if (oy1 - oy0 >= W.minOverlap && gapX >= W.minGap && gapX <= W.maxGap) {
          const y = (oy0 + oy1) / 2;
          const x1 = bx > ax ? ax + aw : bx + bw;
          cands.push([x1, y, x1 + gapX, y]);
        }
        const ox0 = Math.max(ax, bx);
        const ox1 = Math.min(ax + aw, bx + bw);
        const gapY = by > ay ? by - (ay + ah) : ay - (by + bh);
        if (ox1 - ox0 >= W.minOverlap && gapY >= W.minGap && gapY <= W.maxGap) {
          const x = (ox0 + ox1) / 2;
          const y1 = by > ay ? ay + ah : by + bh;
          cands.push([x, y1, x, y1 + gapY]);
        }
      }
    }
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    rnd.shuffle(cands);
    for (const w of cands) {
      if (this.wires.length >= W.count) break;
      const mx = (w[0] + w[2]) / 2;
      const my = (w[1] + w[3]) / 2;
      if (Math.hypot(mx - cx, my - cy) < AIR.startClear / 2) continue;
      // Не скучивать пролёты: середины не ближе 150 px
      if (this.wires.some((o) => Math.hypot((o.x1 + o.x2) / 2 - mx, (o.y1 + o.y2) / 2 - my) < 150)) continue;
      this.wires.push({ x1: w[0], y1: w[1], x2: w[2], y2: w[3], alive: true });
    }
  }

  // Два провода с изоляторами на стенах и тенью на земле (видно, что висят в воздухе).
  // Тонкий провод на телефоне терялся — толщина 2 px и тень обязательны.
  drawWires() {
    const g = this.wireGfx.clear();
    const sh = AIR.wires.shadow;
    for (const w of this.wires) {
      if (!w.alive) continue;
      const nx = w.y2 === w.y1 ? 0 : 3; // смещение второго провода поперёк пролёта
      const ny = w.y2 === w.y1 ? 3 : 0;
      g.lineStyle(2, 0x000000, 0.25);
      g.lineBetween(w.x1 + sh.x, w.y1 + sh.y, w.x2 + sh.x, w.y2 + sh.y);
      g.lineStyle(2, 0x0e1012, 1);
      g.lineBetween(w.x1 - nx, w.y1 - ny, w.x2 - nx, w.y2 - ny);
      g.lineBetween(w.x1 + nx, w.y1 + ny, w.x2 + nx, w.y2 + ny);
      g.fillStyle(0xe8e2d0);
      for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) g.fillCircle(x, y, 3.5);
    }
  }

  // Пролёт через провод: урон (с обычной неуязвимостью), искры, провод рвётся
  update() {
    const p = this.player;
    if (!p.alive) return;
    const R = this.scene.player.body.halfWidth + AIR.wires.hitPad;
    let changed = false;
    for (const w of this.wires) {
      if (!w.alive || distToSegment(p.x, p.y, w) > R) continue;
      w.alive = false;
      changed = true;
      this.cut++;
      p.takeDamage(AIR.wires.damage, 'wire');
      this.scene.fx?.debris?.explode(10, p.x, p.y);
      this.scene.cameras.main.shake(FX.hitShake.duration, FX.hitShake.intensity);
      sfx.play('hit');
    }
    if (changed) this.drawWires();
  }
}

function distToSegment(px, py, w) {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / len2));
  return Math.hypot(px - (w.x1 + t * dx), py - (w.y1 + t * dy));
}
