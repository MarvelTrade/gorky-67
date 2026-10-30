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
    this.towerImages = []; // для порядка отрисовки: вертолёт перед башней или за ней
    this.wires = [];
    this.wireGfx = scene.add.graphics().setDepth(DEPTH.wires);
    // Ток по проводам: бегущие искры и редкие дуги — видно, что под напряжением
    this.currentGfx = scene.add.graphics().setDepth(DEPTH.wires).setBlendMode(Phaser.BlendModes.ADD);
    this.time = 0;
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
    // Спрайт из Blender в 3/4 (как дома): основание внизу кадра, originY — из towers.json.
    // Нет файла — плоский значок сверху из BootScene, центр по центру.
    const meta = this.scene.cache.json.get('towers')?.[def.texture];
    const originY = meta ? meta.originY : 0.5;
    const height = meta ? meta.h * originY - def.radius : def.radius * 3;
    this.drawTowerShadow(x, y, def.radius, height);
    const img = this.scene.add.image(x, y, def.texture).setOrigin(0.5, originY).setDepth(DEPTH.towers + y / 1e5);
    this.towerImages.push(img);
    this.scene.culler?.add(img);
    // Столкновение — на высоте полёта, выше основания по экрану; наземным врагам мешает основание (nav ниже)
    const zone = this.scene.add.zone(x, y - AIR.flightLift, def.radius * 2, def.radius * 2);
    this.towers.add(zone);
    zone.body.setCircle(def.radius);
    zone.kind = kind;
    // Башня — препятствие и для наземных врагов
    const r = def.radius;
    this.scene.nav.rects.push([x - r, y - r, r * 2, r * 2]);
    this.scene.nav.markBlocked([x - r, y - r, r * 2, r * 2]);
  }

  // Длинная тень по земле вправо-вниз: полоса шириной в основание, длина пропорциональна высоте
  drawTowerShadow(x, y, r, height) {
    const sh = AIR.shadow;
    const g = (this.shadowGfx ??= this.scene.add.graphics().setDepth(DEPTH.towerShadow));
    const len = height * sh.length;
    const ex = x + len * Math.cos(sh.angle);
    const ey = y + len * Math.sin(sh.angle);
    const nx = -Math.sin(sh.angle) * r;
    const ny = Math.cos(sh.angle) * r;
    g.fillStyle(0x000000, sh.alpha);
    g.fillPoints([{ x: x + nx, y: y + ny }, { x: ex + nx * 0.6, y: ey + ny * 0.6 }, { x: ex - nx * 0.6, y: ey - ny * 0.6 }, { x: x - nx, y: y - ny }], true);
    g.fillCircle(x, y, r);
  }

  // Троллейбусная сеть: маршруты идут вдоль улиц (по линиям между кварталами), контактная пара висит
  // над дорогой на высоте AIR.wires.lift (в 3/4 — выше по экрану). Рвётся пролётами между перекрёстками.
  // Центральные улицы, через точку старта, без проводов — первые секунды без риска.
  buildWires(rnd) {
    const W = AIR.wires;
    const s = CITY.tile;
    const lines = WORLD.width / s;
    const mid = lines / 2;
    const pick = (n) => rnd.shuffle(range(1, lines - 1).filter((k) => Math.abs(k - mid) > 1)).slice(0, n);
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    const routes = [...pick(W.routes.vertical).map((k) => ['v', k]), ...pick(W.routes.horizontal).map((k) => ['h', k])];
    for (const [dir, k] of routes) {
      for (let i = 0; i < lines; i++) {
        const a = i * s;
        const b = a + s;
        const span = dir === 'v'
          ? { x1: k * s, y1: a - W.lift, x2: k * s, y2: b - W.lift }
          : { x1: a, y1: k * s - W.lift, x2: b, y2: k * s - W.lift };
        if (Math.hypot((span.x1 + span.x2) / 2 - cx, (span.y1 + span.y2) / 2 - cy) < AIR.startClear) continue;
        this.wires.push({ ...span, dir, alive: true, phase: rnd.frac() });
      }
    }
  }

  // Контактная пара над дорогой, опоры по обе стороны улицы на каждом перекрёстке, тень на асфальте.
  // Тонкий провод на телефоне терялся — толщина 2 px и тень обязательны.
  drawWires() {
    const W = AIR.wires;
    const g = this.wireGfx.clear();
    const sh = W.shadow;
    for (const w of this.wires) {
      const [nx, ny] = w.dir === 'v' ? [W.gap, 0] : [0, W.gap];
      // Опоры: у тротуаров по обе стороны, в 3/4 — столб от земли до подвеса
      for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]]) {
        for (const side of [-1, 1]) {
          const ox = px + (w.dir === 'v' ? side * (CITY.road - 4) : 0);
          const oy = py + (w.dir === 'h' ? side * (CITY.road - 4) : 0);
          g.fillStyle(0x000000, 0.25);
          g.fillRect(ox + 2, oy + W.lift, 6, 3);
          g.fillStyle(0x3b4046);
          g.fillRect(ox - 1.5, oy, 3, W.lift);
        }
      }
      if (!w.alive) {
        // Оборванный пролёт: обрывки свисают с опор
        g.lineStyle(2, 0x0e1012, 1);
        g.lineBetween(w.x1, w.y1, w.x1 + (w.x2 - w.x1) * 0.15, w.y1 + (w.y2 - w.y1) * 0.15 + 10);
        g.lineBetween(w.x2, w.y2, w.x2 - (w.x2 - w.x1) * 0.15, w.y2 - (w.y2 - w.y1) * 0.15 + 10);
        continue;
      }
      g.lineStyle(2, 0x000000, 0.25);
      g.lineBetween(w.x1 + sh.x, w.y1 + sh.y, w.x2 + sh.x, w.y2 + sh.y);
      g.lineStyle(2, 0x0e1012, 1);
      g.lineBetween(w.x1 - nx, w.y1 - ny, w.x2 - nx, w.y2 - ny);
      g.lineBetween(w.x1 + nx, w.y1 + ny, w.x2 + nx, w.y2 + ny);
      // Поперечины-растяжки между опорами
      g.lineStyle(1, 0x2a2e33, 1);
      for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]]) {
        if (w.dir === 'v') g.lineBetween(px - CITY.road + 4, py, px + CITY.road - 4, py);
        else g.lineBetween(px, py - CITY.road + 4, px, py + CITY.road - 4);
      }
    }
  }

  // Бегущие по проводам искры и случайные дуги; только для пролётов в кадре
  drawCurrent(dt) {
    const E = AIR.wires.current;
    this.time += dt;
    const g = this.currentGfx.clear();
    const view = this.scene.cameras.main.worldView;
    for (const w of this.wires) {
      if (!w.alive) continue;
      if (Math.max(w.x1, w.x2) < view.x - 20 || Math.min(w.x1, w.x2) > view.right + 20) continue;
      if (Math.max(w.y1, w.y2) < view.y - 20 || Math.min(w.y1, w.y2) > view.bottom + 20) continue;
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const n = Math.max(1, Math.round(len / E.spacing));
      for (let i = 0; i < n; i++) {
        const t = ((this.time * E.speed) / len + i / n + w.phase) % 1;
        const x = w.x1 + (w.x2 - w.x1) * t;
        const y = w.y1 + (w.y2 - w.y1) * t;
        g.fillStyle(E.glow, 0.35);
        g.fillCircle(x, y, 4);
        g.fillStyle(E.core, 1);
        g.fillCircle(x, y, 1.6);
      }
      // Дуга у изолятора: ломаная из коротких отрезков, мигает
      if (Math.sin(this.time * 9 + w.phase * 40) > E.arcThreshold) {
        const [ex, ey] = Math.sin(w.phase * 99) > 0 ? [w.x1, w.y1] : [w.x2, w.y2];
        g.lineStyle(1.5, E.arc, 0.9);
        g.beginPath();
        g.moveTo(ex, ey);
        for (let k = 1; k <= 3; k++) g.lineTo(ex + Phaser.Math.Between(-7, 7), ey + Phaser.Math.Between(-7, 7));
        g.strokePath();
      }
    }
  }

  // Пролёт через провод: урон (с обычной неуязвимостью), искры, провод рвётся
  update(dt) {
    this.drawCurrent(dt);
    const p = this.player;
    // 3/4: вертолёт южнее башни (его точка на земле ниже основания) — он перед ней, рисуем поверх
    for (const img of this.towerImages) {
      if (Math.abs(img.x - p.x) > 200 || Math.abs(img.y - p.y) > 300) continue;
      // setDepth пересортировывает всю сцену (~1000 объектов) — только когда порядок правда сменился
      const d = p.y + AIR.flightLift > img.y ? DEPTH.player - 0.5 : DEPTH.towers + img.y / 1e5;
      if (img.depth !== d) img.setDepth(d);
    }
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

function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

function distToSegment(px, py, w) {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / len2));
  return Math.hypot(px - (w.x1 + t * dx), py - (w.y1 + t * dy));
}
