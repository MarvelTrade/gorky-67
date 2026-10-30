import { CITY, NAV, WORLD } from '../config.js';
import { BUILDINGS } from '../cityLayout.js';

// Наземные враги обходят дома: сетка проходимости + карта путей (поиск в ширину от вертолёта).
// Вертолёт летает над крышами, поэтому если он над домом, путь ведёт к стене под ним.
// Дома ещё и физические стены (walls) — на случай рывка джипа, отбрасывания и толчеи.
export class CityNav {
  constructor(scene) {
    this.scene = scene;
    this.cell = NAV.cell;
    this.cols = Math.ceil(WORLD.width / this.cell);
    this.rows = Math.ceil(WORLD.height / this.cell);
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    this.dist = new Int32Array(n).fill(-1);
    this.queue = new Int32Array(n);
    this.rects = []; // дома в координатах мира: [x, y, w, h]
    this.timer = 0;
    this.goal = -1;
  }

  // Дома квартала (вид variant, поворот quarter × 90° вокруг центра) — в сетку и в список стен
  addTile(variant, quarter, tileX, tileY) {
    const half = CITY.tile / 2;
    const a = (quarter * Math.PI) / 2;
    const cos = Math.round(Math.cos(a));
    const sin = Math.round(Math.sin(a));
    for (const [x, y, w, h] of BUILDINGS[variant]) {
      const xs = [];
      const ys = [];
      for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        const lx = cx - half;
        const ly = cy - half;
        xs.push(tileX + half + lx * cos - ly * sin);
        ys.push(tileY + half + lx * sin + ly * cos);
      }
      const rx = Math.min(...xs);
      const ry = Math.min(...ys);
      const rect = [rx, ry, Math.max(...xs) - rx, Math.max(...ys) - ry];
      this.rects.push(rect);
      this.markBlocked(rect);
    }
  }

  // Клетка закрыта, если дом (с запасом NAV.margin на толщину врага) задевает её центр
  markBlocked([x, y, w, h]) {
    const m = NAV.margin;
    const c = this.cell;
    const c0 = Math.max(0, Math.floor((x - m) / c));
    const c1 = Math.min(this.cols - 1, Math.floor((x + w + m) / c));
    const r0 = Math.max(0, Math.floor((y - m) / c));
    const r1 = Math.min(this.rows - 1, Math.floor((y + h + m) / c));
    for (let r = r0; r <= r1; r++) {
      for (let col = c0; col <= c1; col++) {
        const px = (col + 0.5) * c;
        const py = (r + 0.5) * c;
        if (px > x - m && px < x + w + m && py > y - m && py < y + h + m) this.blocked[r * this.cols + col] = 1;
      }
    }
  }

  // Невидимые стены домов; collider с врагами ставит GameScene (кроме «Объекта» — он проламывает)
  makeWalls() {
    const walls = this.scene.physics.add.staticGroup();
    for (const [x, y, w, h] of this.rects) {
      const zone = this.scene.add.zone(x + w / 2, y + h / 2, w, h);
      walls.add(zone);
    }
    walls.refresh();
    return walls;
  }

  index(x, y) {
    const col = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell)));
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell)));
    return row * this.cols + col;
  }

  isBlocked(x, y) {
    return this.blocked[this.index(x, y)] === 1;
  }

  // Ближайшая к точке свободная клетка (спираль по сетке) — враги не появляются внутри домов
  nearestFree(x, y) {
    const i = this.index(x, y);
    if (!this.blocked[i]) return { x, y };
    const col0 = i % this.cols;
    const row0 = (i / this.cols) | 0;
    for (let rad = 1; rad < 40; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (const dc of Math.abs(dr) === rad ? range(-rad, rad) : [-rad, rad]) {
          const r = row0 + dr;
          const c = col0 + dc;
          if (r < 0 || c < 0 || r >= this.rows || c >= this.cols || this.blocked[r * this.cols + c]) continue;
          return { x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell };
        }
      }
    }
    return { x, y };
  }

  // Карта путей пересчитывается, когда вертолёт сменил клетку, но не чаще NAV.refresh
  update(dt, x, y) {
    this.timer -= dt;
    const goal = this.index(x, y);
    if (goal === this.goal || this.timer > 0) return;
    this.goal = goal;
    this.timer = NAV.refresh;
    this.bfs(goal);
  }

  // Поиск в ширину по 8 направлениям без срезания углов домов. Из закрытой клетки под вертолётом
  // можно идти по закрытым, пока не выйдем на улицу, — так путь приводит к стене под ним.
  bfs(start) {
    const { cols, rows, blocked, dist, queue } = this;
    dist.fill(-1);
    dist[start] = 0;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++];
      const r = (i / cols) | 0;
      const c = i - r * cols;
      const fromBlocked = blocked[i];
      for (let k = 0; k < 8; k++) {
        const nr = r + DR[k];
        const nc = c + DC[k];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const j = nr * cols + nc;
        if (dist[j] !== -1 || (blocked[j] && !fromBlocked)) continue;
        // Диагональ — только если обе соседние клетки свободны, иначе враги режут угол дома
        if (k >= 4 && (blocked[r * cols + nc] || blocked[nr * cols + c]) && !fromBlocked) continue;
        dist[j] = dist[i] + 1;
        queue[tail++] = j;
      }
    }
  }

  // Куда идти от (x, y): угол на клетку на NAV.lookahead шагов вперёд по карте путей.
  // null — карты нет или враг уже рядом с целью: тогда идти напрямую.
  heading(x, y) {
    let i = this.index(x, y);
    if (this.dist[i] <= 1) return null;
    const { cols } = this;
    for (let s = 0; s < NAV.lookahead; s++) {
      const r = (i / cols) | 0;
      const c = i - r * cols;
      let best = i;
      for (let k = 0; k < 8; k++) {
        const nr = r + DR[k];
        const nc = c + DC[k];
        if (nr < 0 || nc < 0 || nr >= this.rows || nc >= cols) continue;
        const j = nr * cols + nc;
        if (this.dist[j] >= 0 && this.dist[j] < this.dist[best]) best = j;
      }
      if (best === i) break;
      i = best;
    }
    const tx = ((i % cols) + 0.5) * this.cell;
    const ty = (((i / cols) | 0) + 0.5) * this.cell;
    return Math.atan2(ty - y, tx - x);
  }
}

const DR = [-1, 1, 0, 0, -1, -1, 1, 1];
const DC = [0, 0, -1, 1, -1, 1, -1, 1];

function range(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}
