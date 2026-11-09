import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { LEVELS, isBuilt } from '../levels.js';
import { meta } from '../meta.js';
import { CAMPAIGN } from '../config.js';
import { onTap } from '../ui/tap.js';
import { BRASS } from '../ui/paper.js';

// Карта кампании — планшет экипажа «Сокола»: топографическая карта Трансславии. Железная дорога идёт
// от Горького-67 (юг) на север к Славограду; прямой путь через Чапово и Пушково разрушен — эшелон
// уходит в обход через порт на западе, у Трансславянского залива. Пройденные станции выжжены,
// за ними ползёт газ; у каждой — время вылета: с 06:00 у Горького-67 до 18:00 у Славограда,
// и карта темнеет к ночи. Рельеф и леса — из фиксированного зерна: карта всегда одна и та же.

// Станции: доли карты (x — запад→восток, y — север→юг), с какой стороны подпись
const STATIONS = {
  1: { x: 0.62, y: 0.9, side: 'r' },
  2: { x: 0.5, y: 0.8, side: 'l' },
  3: { x: 0.68, y: 0.7, side: 'r' },
  4: { x: 0.52, y: 0.6, side: 'l' },
  5: { x: 0.62, y: 0.5, side: 'r' },
  6: { x: 0.74, y: 0.46, side: 'r' },
  7: { x: 0.2, y: 0.38, side: 'r' },
  8: { x: 0.3, y: 0.28, side: 'r' },
  9: { x: 0.43, y: 0.2, side: 'r' },
  10: { x: 0.56, y: 0.13, side: 'r' },
  11: { x: 0.74, y: 0.06, side: 'l' },
};
// Разрушенная прямая ветка: от нефтезавода через Чапово и Пушково к Славограду
const CUT = [
  { x: 0.8, y: 0.35, key: 'mapChapovo' },
  { x: 0.8, y: 0.2, key: 'mapPushkovo' },
];
const HILLS = [
  [0.36, 0.66, 0.13], [0.82, 0.58, 0.1], [0.46, 0.36, 0.1], [0.88, 0.24, 0.08], [0.3, 0.12, 0.08], [0.66, 0.84, 0.07],
];
const FORESTS = [
  [0.4, 0.86, 0.06], [0.3, 0.74, 0.05], [0.58, 0.56, 0.05], [0.86, 0.46, 0.06], [0.5, 0.26, 0.05], [0.66, 0.2, 0.04],
  [0.9, 0.08, 0.05], [0.36, 0.5, 0.04], [0.76, 0.74, 0.04],
];
const RAVINES = [
  [[0.92, 0.96], [0.84, 0.86], [0.86, 0.76], [0.8, 0.66]],
  [[0.22, 0.92], [0.3, 0.84], [0.28, 0.72], [0.36, 0.6]],
  [[0.6, 0.36], [0.52, 0.3], [0.56, 0.22], [0.5, 0.16]],
];
const START_HOUR = 6; // Горький-67 — на рассвете
const TOTAL_HOURS = 12; // до Славограда — к ночи

// Время вылета на уровень n: от 06:00 до 18:00 равными шагами
function hourOf(n) {
  return START_HOUR + ((n - 1) / (LEVELS.length - 1)) * TOTAL_HOURS;
}
function clock(h) {
  const m = Math.round(h * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#141810');
    this.frame = this.add.graphics(); // корпус планшета
    this.map = this.add.graphics(); // топографическая карта
    this.marks = this.add.graphics(); // поверх карты: газ, выжженные станции, медали
    this.title = this.add.text(0, 0, t('mapTitle'), { fontFamily: 'monospace', fontSize: '16px', color: '#d8e0c0', fontStyle: 'bold' });
    this.sub = this.add.text(0, 0, t('mapSub'), { fontFamily: 'monospace', fontSize: '11px', color: '#9aa486' });
    this.clockText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '16px', color: '#f0d890', fontStyle: 'bold' }).setOrigin(1, 0);
    this.labels = []; // подписи карты без действий (залив, Чапово, Пушково, «путь разрушен»)
    this.sea = this.label(t('mapSea'), 11, '#3a6a86', true).setAngle(-90);
    this.cutLabels = CUT.map((c) => this.label(t(c.key), 10, '#6a5a46', true));
    this.cutNote = this.label(t('mapCut'), 9, '#a83a2a', true);
    this.nodes = LEVELS.map((L) => this.makeNode(L));

    this.back = this.add
      .text(0, 0, t('back'), { fontFamily: 'sans-serif', fontSize: '16px', color: '#c8d8b0', padding: { x: 10, y: 6 } })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });
    onTap(this.back, () => true, () => this.scene.start('MenuScene'));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
    // Клавиатура одной рукой: ↑/→/W/D — следующая доступная станция (на север), ↓/←/S/A — предыдущая,
    // Enter или пробел — вылет. Выбранная станция — в латунном кольце
    this.sel = this.current();
    this.selRing = this.add.graphics();
    this.keyHint = this.add
      .text(0, 0, t('mapKeys'), { fontFamily: 'sans-serif', fontSize: '12px', color: '#7a846a' })
      .setOrigin(1, 1)
      .setVisible(!this.sys.game.device.input.touch);
    this.input.keyboard.on('keydown', (e) => {
      const next = ['ArrowUp', 'ArrowRight', 'KeyW', 'KeyD'].includes(e.code);
      const prev = ['ArrowDown', 'ArrowLeft', 'KeyS', 'KeyA'].includes(e.code);
      if (next || prev) this.moveSel(next ? 1 : -1);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') this.go(this.sel);
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  label(text, size, color, italic = false) {
    const l = this.add.text(0, 0, text, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, fontStyle: italic ? 'italic' : 'normal' }).setOrigin(0.5);
    this.labels.push(l);
    return l;
  }

  reached() {
    return meta.levelReached ?? 1;
  }

  // Куда лететь по умолчанию: самый дальний открытый и построенный уровень
  current() {
    let n = 1;
    for (const L of LEVELS) if (isBuilt(L.n) && L.n <= this.reached()) n = L.n;
    return n;
  }

  state(n) {
    if (!isBuilt(n)) return 'soon';
    if (n < this.reached()) return 'cleared';
    if (n > this.reached() && !CAMPAIGN.openAll) return 'locked';
    return n === this.current() ? 'next' : 'open';
  }

  makeNode(L) {
    const st = this.state(L.n);
    const c = this.add.container(0, 0);
    const ring = this.add.circle(0, 0, 13, 0xf2ecd8).setStrokeStyle(3, 0x2a2418);
    const num = this.add.text(0, 0, String(L.n), { fontFamily: 'monospace', fontSize: '13px', color: '#2a2418', fontStyle: 'bold' }).setOrigin(0.5);
    // Подписи на бумажной плашке — как на топокарте: читаются поверх линий рельефа и дороги
    const plate = 'rgba(236,231,206,0.88)';
    const name = this.add.text(0, 0, t(`lvl_name_${L.n}`), { fontFamily: 'sans-serif', fontSize: '13px', color: '#1e1a12', fontStyle: 'bold', backgroundColor: plate, padding: { x: 3, y: 1 } });
    const info = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#4a4232', backgroundColor: plate, padding: { x: 3, y: 1 } });
    if (st === 'soon' || st === 'locked') {
      ring.setFillStyle(0xc8c2ae).setStrokeStyle(2, 0x8a826e);
      num.setColor('#8a826e');
      name.setColor('#6a6250').setFontStyle('normal');
    } else if (st === 'cleared') {
      ring.setFillStyle(0x3a2e22).setStrokeStyle(2, 0x1a140e);
      num.setColor('#e8c890');
    } else if (st === 'next') {
      ring.setStrokeStyle(4, 0xb03024);
      name.setColor('#8a1e14');
    }
    const kind = t(`lvl_kind_${L.n}`);
    // Недостроенные станции — просто бледное название на карте, без «не готово» (модерация: признаки незавершённости)
    const tail = st === 'soon' ? '' : st === 'cleared' ? t('mapCleared') : st === 'next' ? `${t('mapGo')} ←` : '';
    const time = clock(hourOf(L.n));
    // Полная строка и короткая — для узкого экрана (без рода места)
    info.long = `${kind} · ${time}${tail ? ` · ${tail}` : ''}`;
    info.short = `${time}${tail ? ` · ${tail}` : ''}`;
    info.setText(info.long);
    if (st === 'cleared') info.setColor('#8a2a1e');
    c.add([ring, num, name, info]);
    Object.assign(c, { L, st, ring, name, info, side: STATIONS[L.n].side });
    if (st !== 'soon' && st !== 'locked') {
      for (const o of [ring, name]) {
        o.setInteractive({ useHandCursor: true });
        onTap(o, () => true, () => this.go(L.n));
      }
      // Следующая станция пульсирует — туда и лететь
      if (st === 'next') this.tweens.add({ targets: ring, scale: { from: 1, to: 1.2 }, yoyo: true, repeat: -1, duration: 600 });
    }
    return c;
  }

  // Доступные станции — те, на которые можно нажать
  playable() {
    return this.nodes.filter((nd) => nd.st !== 'soon' && nd.st !== 'locked').map((nd) => nd.L.n);
  }

  moveSel(dir) {
    const list = this.playable();
    const i = list.indexOf(this.sel);
    this.sel = list[Phaser.Math.Clamp((i < 0 ? 0 : i) + dir, 0, list.length - 1)] ?? this.sel;
    this.drawSel();
  }

  drawSel() {
    const node = this.nodes.find((nd) => nd.L.n === this.sel);
    const g = this.selRing.clear();
    if (!node) return;
    g.lineStyle(3, 0xf2c94c, 1).strokeCircle(node.x, node.y, 21 * node.scaleX);
    this.children.bringToTop(g);
  }

  go(n) {
    this.registry.set('level', n);
    this.scene.start('BriefingScene');
  }

  layout() {
    const { width, height } = this.scale;
    const pad = 6;
    const bez = Math.min(16, Math.round(Math.min(width, height) * 0.035));
    const head = 40;
    const foot = 30;
    // Корпус планшета: резиновая рамка цвета хаки, винты по углам
    const fx = pad;
    const fy = pad;
    const fw = width - pad * 2;
    const fh = height - pad * 2;
    const f = this.frame.clear();
    f.fillStyle(0x2f3527).fillRoundedRect(fx, fy, fw, fh, 18);
    f.lineStyle(2, 0x4a5238).strokeRoundedRect(fx + 2, fy + 2, fw - 4, fh - 4, 16);
    for (const [vx, vy] of [[fx + 9, fy + 9], [fx + fw - 9, fy + 9], [fx + 9, fy + fh - 9], [fx + fw - 9, fy + fh - 9]]) {
      f.fillStyle(0x6a705a).fillCircle(vx, vy, 3);
      f.lineStyle(1, 0x2a2e22).lineBetween(vx - 2, vy, vx + 2, vy);
    }
    // Экран: шапка с названием и часами, карта, низ с кнопкой «Назад»
    const sx = fx + bez;
    const sy = fy + bez;
    const sw = fw - bez * 2;
    const sh = fh - bez * 2;
    f.fillStyle(0x10140c).fillRect(sx, sy, sw, sh);
    const mx = sx + 4;
    const my = sy + head;
    const mw = sw - 8;
    const mh = sh - head - foot;
    this.title.setPosition(sx + 10, sy + 6);
    this.sub.setPosition(sx + 10, sy + 25).setVisible(sw > 330);
    const n = this.current();
    const h = hourOf(n);
    this.clockText.setPosition(sx + sw - 10, sy + 10).setText(`${h < 17 ? '☀' : '☾'} ${clock(h)}`);
    this.back.setPosition(sx + 2, sy + sh + 2);
    // Подсказка клавиш — только без сенсора и если не наезжает на «Назад»
    this.keyHint.setPosition(sx + sw - 10, sy + sh - 8);
    this.keyHint.setAlpha(this.keyHint.width + this.back.width + 30 < sw ? 1 : 0);

    this.drawMap(mx, my, mw, mh, n);
    const P = (p) => ({ x: mx + p.x * mw, y: my + p.y * mh });

    // Подписи без действий
    this.sea.setPosition(mx + mw * 0.05, my + mh * 0.6);
    CUT.forEach((c, i) => this.cutLabels[i].setPosition(P(c).x + 26, P(c).y));
    const a = P(CUT[0]);
    const b = P(CUT[1]);
    // «Путь разрушен» — сбоку от полотна, не поверх креста: справа, а если не влезает — слева
    const cy = (a.y + b.y) / 2 + 4;
    const right = Math.max(a.x, b.x) + 12;
    if (right + this.cutNote.width < mx + mw - 4) this.cutNote.setOrigin(0, 0.5).setPosition(right, cy);
    else this.cutNote.setOrigin(1, 0.5).setPosition(Math.min(a.x, b.x) - 12, cy);

    const small = Math.min(mw, mh) < 330;
    const narrow = mw < 520;
    for (const node of this.nodes) {
      const p = P(STATIONS[node.L.n]);
      const k = small ? 0.82 : 1;
      node.setPosition(p.x, p.y).setScale(k);
      node.name.setFontSize(small ? 11 : 13);
      node.info.setFontSize(small ? 9 : 10).setText(narrow ? node.info.short : node.info.long);
      // Сторона подписи: задуманная, а если не влезает в карту — другая
      const w = (Math.max(node.name.width, node.info.width) + 18) * k;
      let side = STATIONS[node.L.n].side;
      if (side === 'r' && p.x + w > mx + mw) side = 'l';
      else if (side === 'l' && p.x - w < mx) side = 'r';
      node.side = side;
      if (node.side === 'l') {
        node.name.setOrigin(1, 1).setPosition(-18, 2);
        node.info.setOrigin(1, 0).setPosition(-18, 2);
      } else {
        node.name.setOrigin(0, 1).setPosition(18, 2);
        node.info.setOrigin(0, 0).setPosition(18, 2);
      }
    }
    this.drawSel();
  }

  // Топографическая карта: бумага, сетка, рельеф горизонталями, леса, овраги, залив, железная дорога,
  // газ над пройденным и ночь, которая наступает к Славограду
  drawMap(mx, my, mw, mh, cur) {
    const g = this.map.clear();
    const P = (x, y) => ({ x: mx + x * mw, y: my + y * mh });
    const rnd = new Phaser.Math.RandomDataGenerator(['gorky-67-map']);
    g.fillStyle(0xe4dfc4).fillRect(mx, my, mw, mh);
    // Километровая сетка
    g.lineStyle(1, 0x8a9aa8, 0.25);
    for (let i = 1; i < 10; i++) {
      g.lineBetween(mx + (mw * i) / 10, my, mx + (mw * i) / 10, my + mh);
      g.lineBetween(mx, my + (mh * i) / 10, mx + mw, my + (mh * i) / 10);
    }
    // Леса: зелёные пятна из кругов
    for (const [fx, fy, fr] of FORESTS) {
      for (let k = 0; k < 9; k++) {
        const a = rnd.angle() * (Math.PI / 180);
        const r = fr * rnd.realInRange(0, 0.8);
        const p = P(fx + Math.cos(a) * r * 0.8, fy + Math.sin(a) * r);
        g.fillStyle(0xb4c896, 0.9).fillCircle(p.x, p.y, Math.min(mw, mh) * fr * rnd.realInRange(0.35, 0.6));
      }
    }
    // Рельеф: горизонтали вокруг холмов, неровные кольца
    for (const [hx, hy, hr] of HILLS) {
      const ph = rnd.realInRange(0, 6);
      for (let k = 0; k < 4; k++) {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const th = (i / 40) * Math.PI * 2;
          const r = hr * (1 - k * 0.22) * (1 + 0.14 * Math.sin(3 * th + ph) + 0.07 * Math.sin(5 * th + ph * 2));
          pts.push(P(hx + Math.cos(th) * r * 0.8, hy + Math.sin(th) * r));
        }
        g.lineStyle(k === 0 ? 1.5 : 1, 0xa87848, k === 0 ? 0.6 : 0.45).strokePoints(pts, true);
      }
    }
    // Овраги — тонкие синие ручьи
    g.lineStyle(1.5, 0x5a8aa8, 0.7);
    for (const path of RAVINES) g.strokePoints(path.map(([x, y]) => P(x, y)));
    // Залив на западе: изрезанный берег, штриховка воды
    const coast = [];
    for (let i = 0; i <= 30; i++) {
      const v = i / 30;
      const bulge = Math.exp(-(((v - 0.42) / 0.12) ** 2)) * 0.06; // бухта у порта
      coast.push(P(0.1 + 0.02 * Math.sin(v * 17) + bulge, v));
    }
    g.fillStyle(0xa8cadc).fillPoints([P(0, 0), ...coast, P(0, 1)], true);
    g.lineStyle(1, 0x7aa8c4, 0.6);
    for (let y = 0.03; y < 1; y += 0.035) g.lineBetween(mx + 2, my + y * mh, P(0.06, y).x, my + y * mh);
    g.lineStyle(1.5, 0x4a7a96).strokePoints(coast);
    // Населённые пункты: кварталы-квадратики у станций и у разрушенных деревень
    for (const p of [...Object.values(STATIONS), ...CUT]) {
      const c = P(p.x, p.y);
      for (let k = 0; k < 6; k++) {
        g.fillStyle(0x8a7a66, 0.8).fillRect(c.x + rnd.between(-16, 12), c.y + rnd.between(-14, 10), rnd.between(3, 6), rnd.between(3, 6));
      }
    }
    // Железная дорога: чёрная линия с белыми вставками, как на картах
    const route = LEVELS.map((L) => P(STATIONS[L.n].x, STATIONS[L.n].y));
    this.rail(g, route, false);
    // Прямая ветка через Чапово и Пушково разрушена: серая, с красными крестами
    const cut = [route[5], P(CUT[0].x, CUT[0].y), P(CUT[1].x, CUT[1].y), route[10]];
    this.rail(g, cut, true);
    for (let i = 0; i < cut.length - 1; i++) {
      const m = { x: (cut[i].x + cut[i + 1].x) / 2, y: (cut[i].y + cut[i + 1].y) / 2 };
      g.lineStyle(3, 0xb03024).lineBetween(m.x - 6, m.y - 6, m.x + 6, m.y + 6).lineBetween(m.x - 6, m.y + 6, m.x + 6, m.y - 6);
    }
    this.drawMarks(mw, mh, route);
    // Ночь: чем ближе к Славограду, тем темнее карта (по времени текущего вылета)
    const night = (hourOf(cur) - START_HOUR) / TOTAL_HOURS;
    if (night > 0) g.fillStyle(0x0a1838, night * 0.38).fillRect(mx, my, mw, mh);
  }

  rail(g, pts, broken) {
    g.lineStyle(5, broken ? 0x8a8478 : 0x1e1a14).strokePoints(pts);
    // Белые вставки по длине — штрих железной дороги
    g.lineStyle(2, 0xf2ecd8);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 4; d < len - 4; d += 16) {
        const k0 = d / len;
        const k1 = Math.min(1, (d + 8) / len);
        g.lineBetween(a.x + (b.x - a.x) * k0, a.y + (b.y - a.y) * k0, a.x + (b.x - a.x) * k1, a.y + (b.y - a.y) * k1);
      }
    }
  }

  // Газ ползёт за эшелоном: жёлтые облака по пройденному пути; выжженные станции — гарь и медаль экипажу
  drawMarks(mw, mh, route) {
    const g = this.marks.clear();
    const last = Math.min(this.reached(), route.length) - 1;
    for (let i = 0; i <= last; i++) {
      const p = route[i];
      const r = Math.min(mw, mh) * (i === last ? 0.07 : 0.1);
      g.fillStyle(0xd8c040, i === last ? 0.18 : 0.26).fillCircle(p.x, p.y, r);
      g.fillStyle(0xd8c040, 0.14).fillCircle(p.x + r * 0.5, p.y + r * 0.3, r * 0.8);
    }
    for (const node of this.nodes) {
      if (node.st !== 'cleared') continue;
      const p = route[node.L.n - 1];
      g.fillStyle(0x2a1a10, 0.55).fillCircle(p.x, p.y, 22); // гарь
      g.fillStyle(0x4a2a16, 0.35).fillCircle(p.x + 6, p.y - 4, 16);
      // Медаль за уровень: лента и латунный кружок над станцией
      const ox = node.side === 'l' ? 16 : -16;
      g.fillStyle(0xb03024).fillTriangle(p.x + ox - 5, p.y - 22, p.x + ox + 5, p.y - 22, p.x + ox, p.y - 12);
      g.fillStyle(0x2a5aa8).fillRect(p.x + ox - 1, p.y - 22, 2, 9);
      g.fillStyle(BRASS).fillCircle(p.x + ox, p.y - 10, 5);
      g.lineStyle(1, 0x6a5428).strokeCircle(p.x + ox, p.y - 10, 5);
    }
    this.children.bringToTop(this.marks);
    for (const l of this.labels) this.children.bringToTop(l);
    for (const node of this.nodes) this.children.bringToTop(node);
  }
}
