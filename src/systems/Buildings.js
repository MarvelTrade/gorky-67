import * as Phaser from 'phaser';
import { CHAOS, RUINS, PALETTE as P } from '../config.js';
import { DEPTH } from '../depth.js';
import { sfx } from './Sfx.js';
import { buildingHeight } from '../cityLayout.js';

// Дома в виде 3/4: пятно на земле (по нему ходят враги и считаются столкновения) не меняется,
// а рисуется крыша, поднятая на высоту дома, и южный фасад с окнами и подъездами под ней.
// Вид строго сверху читался как плоские плиты, а высокие сооружения — как люки.
// Текстура — одна на каждый размер дома; домов ~170, размеров — несколько.
const RUIN_H = 6; // px — высота груды обломков на экране

// Цвета стен, цоколя и крыши по виду дома
const STYLES = {
  panel: { wall: 0x5d6269, base: 0x4a4f55, roof: P.panel },
  factory: { wall: 0x7a4e3c, base: 0x4e3226, roof: 0x55504a },
  barrack: { wall: 0x6b5a40, base: 0x4a3e2c, roof: 0x5b4a36 },
  dk: { wall: 0xd8cfb8, base: 0xa89e88, roof: 0xb8b0a0 },
  stalin: { wall: 0xc9a97a, base: 0x8a6e4a, roof: 0x6e5c50 }, // крыша — крашеное кровельное железо, скатная
  hospital: { wall: 0xe6eaea, base: 0xa8b0b0, roof: 0xc8cccc },
  school: { wall: 0xe0b46a, base: 0x9a7a4a, roof: 0x8a8c90 },
  kinder: { wall: 0xf0dcae, base: 0xb09a70, roof: 0x9a6a5a },
  fire: { wall: 0xa04a3a, base: 0x6a2e24, roof: 0x7a7c80 },
  police: { wall: 0xd8d0a8, base: 0x8a8468, roof: 0x8a8c90 },
  shop: { wall: 0xc8ccd0, base: 0x7a7e84, roof: 0x9a9ea4 },
  gov: { wall: 0xd6cab0, base: 0x9a8c70, roof: 0x8a8478 },
  garage: { wall: 0x7a7e80, base: 0x56585a, roof: 0x5e6264 },
  station: { wall: 0x8a9298, base: 0x5a6268, roof: 0x9aa2a8 },
  // Деревня (уровень 2): сруб, белёное сельское здание, коровник/гараж
  izba: { wall: 0x6e5636, base: 0x4a3a26, roof: 0x6e726e },
  rural: { wall: 0xbcb8aa, base: 0x7a7468, roof: 0x6e726e },
  barn: { wall: 0xaaa69a, base: 0x6a665c, roof: 0x666a68 },
};

// Деревенские дома одноэтажные — ниже городских (px на экране)
const LOW_H = { garage: 12, izba: 16, rural: 18, barn: 20 };
// Сколько вариантов отделки у стиля (крыша избы, кирпич/доски коровника, цвет вывески)
const VARIANTS = { izba: 3, rural: 3, barn: 2 };
// Деревянные дома рушатся в бурые обломки, белёные — в светлые
const RUIN_COLORS = {
  wood: { base: 0x3a3024, bits: [0x6e5636, 0x5a4630, 0x4a3a26, 0x7a6a50], wall: 0x5a4630 },
  white: { base: 0x4a4740, bits: [0xa8a49a, 0x8a867c, 0x6e6a62, 0x7a5040], wall: 0x8a867c },
  stone: { base: 0x3e4144, bits: [0x8a8f95, 0x6c7176, 0x5d6269, 0x9aa0a6], wall: 0x5d6269 },
};
const RUIN_KIND = { izba: 'wood', barrack: 'wood', rural: 'white', barn: 'white' };

export class Buildings {
  constructor(scene) {
    this.scene = scene;
    this.shadows = scene.add.graphics().setDepth(DEPTH.ground + 1);
  }

  // rects — пятна домов в координатах мира [x, y, w, h]. Часть домов горит, часть со следами обстрела —
  // город в катастрофе. fires — точки огня на крышах горящих домов (их поджигает Wrecks).
  build(rects, rnd = Phaser.Math.RND) {
    this.roofs = [];
    this.fires = [];
    this.list = []; // дома с HP — для разрушений
    rects.forEach(([x, y, w, h], i) => {
      const style = this.scene.nav?.rectStyles?.[i] ?? 'panel';
      // Гаражи и деревенские дома одноэтажные — низкие и в 3/4
      const H = LOW_H[style] ?? buildingHeight(w, h);
      const variant = VARIANTS[style] ? rnd.between(0, VARIANTS[style] - 1) : 0;
      const r = rnd.frac();
      const state = r < CHAOS.burningHouses ? 'burning' : r < CHAOS.burningHouses + CHAOS.shelledHouses ? 'shelled' : 'ok';
      const key = this.texture(w, h, H, state, style, variant);
      if (state === 'burning') {
        const n = Math.max(1, Math.round(Math.max(w, h) / 120));
        for (let i = 0; i < n; i++) {
          const fx = w >= h ? x + ((i + 0.5) * w) / n : x + w / 2;
          const fy = (w >= h ? y + h / 2 : y + ((i + 0.5) * h) / n) - H;
          this.fires.push({ x: fx, y: fy, big: true });
        }
      }
      // Тень на земле — вправо-вниз от пятна
      this.shadows.fillStyle(0x000000, 0.3);
      this.shadows.fillRect(x + 10, y + 8, w, h);
      // Южнее — ближе к зрителю: перекрывает северного соседа (в пределах слоя домов)
      const img = this.scene.add.image(x, y - H, key).setOrigin(0, 0).setDepth(DEPTH.buildings + (y + h) / 1e5);
      this.scene.culler?.add(img);
      // Центр крыши на экране — туда падают ящики снабжения
      const roof = { x: x + w / 2, y: y + h / 2 - H };
      this.roofs.push(roof);
      const maxHp = w * h * RUINS.hpPerArea;
      // Дом «после обстрела» уже потрёпан — рушится быстрее
      this.list.push({ x, y, w, h, H, img, roof, state, style, variant, maxHp, hp: state === 'shelled' ? maxHp * RUINS.damaged : maxHp });
    });
    return this.roofs;
  }

  // Взрыв: урон всем домам, чьё пятно задевает круг
  damageAt(x, y, r, amount) {
    for (const b of this.list) {
      if (b.state === 'ruined') continue;
      const nx = Phaser.Math.Clamp(x, b.x, b.x + b.w);
      const ny = Phaser.Math.Clamp(y, b.y, b.y + b.h);
      if ((nx - x) ** 2 + (ny - y) ** 2 <= r * r) this.hit(b, amount);
    }
  }

  // Дом под точкой (x, y) или null
  at(x, y) {
    for (const b of this.list) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  hit(b, amount) {
    if (b.state === 'ruined') return;
    b.hp -= amount;
    if (b.hp <= 0) this.collapse(b);
    else if (b.hp < b.maxHp * RUINS.damaged && b.state === 'ok') this.setState(b, 'shelled');
  }

  setState(b, state) {
    b.state = state;
    b.img.setTexture(this.texture(b.w, b.h, b.H, state, b.style, b.variant));
  }

  // Руины: дом становится низкой грудой обломков на земле — ниже врагов и следов,
  // крыши больше нет (ящики туда не падают), поднимается пыль
  collapse(b) {
    b.state = 'ruined';
    b.hp = 0;
    b.img.setTexture(this.ruinTexture(b.w, b.h, RUIN_KIND[b.style])).setPosition(b.x, b.y - RUIN_H).setDepth(DEPTH.ground + 1.4);
    const i = this.roofs.indexOf(b.roof);
    if (i >= 0) this.roofs.splice(i, 1);
    this.scene.dust?.(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) / 2);
    sfx.play('crumble');
  }

  // Груда обломков на месте дома: плиты, куски стен по краю, копоть
  ruinTexture(w, h, kind = 'stone') {
    const C = RUIN_COLORS[kind] ?? RUIN_COLORS.stone;
    const key = `ruin_${w}x${h}_${kind}`;
    if (this.scene.textures.exists(key)) return key;
    const rnd = new Phaser.Math.RandomDataGenerator([key]);
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(C.base);
    g.fillRect(0, RUIN_H, w, h);
    g.fillStyle(0x1c1d1f, 0.6);
    for (let i = 0; i < 3; i++) g.fillCircle(rnd.between(6, w - 6), RUIN_H + rnd.between(6, h - 6), rnd.between(10, 20));
    const n = Math.round((w * h) / 280); // реже — иначе груда рябит
    for (let i = 0; i < n; i++) {
      g.fillStyle(rnd.pick(C.bits));
      g.fillRect(rnd.between(0, w - 8), RUIN_H + rnd.between(0, h - 6), rnd.between(4, 12), rnd.between(3, 7));
    }
    // Обломки стен по южному краю — видно, что тут стоял дом
    g.fillStyle(C.wall);
    for (let x = 2; x < w - 6; x += rnd.between(10, 22)) {
      const sh = rnd.between(3, RUIN_H + 4);
      g.fillRect(x, RUIN_H + h - sh, rnd.between(4, 9), sh);
    }
    g.lineStyle(1, 0x2a2e33, 0.8);
    g.strokeRect(0, RUIN_H, w, h);
    g.generateTexture(key, w, h + RUIN_H);
    g.destroy();
    return key;
  }

  // Стекло окна: большинство тёмные (эвакуация), редкие горят, у горящего дома — огонь
  winColor(r, burning, shelled) {
    if (burning) return r < 0.45 ? 0xff7a2e : 0x1b1d20;
    if (r < 0.06) return 0xd8b878;
    return r < (shelled ? 0.55 : 0.2) ? 0x1b1d20 : 0x56646e;
  }

  // Фасады деревни: izba — сруб из брёвен, наличники и ставни, крыльцо у торца;
  // rural — белёная штукатурка, окна в рамах, вывеска без надписи, крыльцо с козырьком;
  // barn — коровник/гараж: белёный кирпич или доски, узкие окна под крышей, ворота
  villageFacade(g, rnd, w, h, H, style, variant, burning, shelled) {
    const win = () => this.winColor(rnd.frac(), burning, shelled);
    if (style === 'izba') {
      for (let y = h + 1; y < h + H - 4; y += 3) {
        g.fillStyle(0x866a46, 0.6).fillRect(0, y, w, 1);
        g.fillStyle(0x3a2c1c, 0.7).fillRect(0, y + 2, w, 1);
      }
      g.fillStyle(0x8a7450); // торцы венцов на углах
      for (let y = h + 2; y < h + H - 4; y += 3) g.fillCircle(1.5, y, 1.4).fillCircle(w - 1.5, y, 1.4);
      const frame = [0xbcb8a8, 0x5a7890, 0x5a7a5a][variant] ?? 0xbcb8a8; // наличники: белые, синие, зелёные
      const n = w >= 56 ? 3 : 2;
      const span = w - 20;
      for (let i = 0; i < n; i++) {
        const x = Math.round(6 + ((i + 0.5) * span) / n) - 3;
        const y = h + 5;
        g.fillStyle(frame).fillRect(x - 3, y, 2, 6).fillRect(x + 7, y, 2, 6); // ставни
        g.fillRect(x - 1, y - 2, 8, 2).fillTriangle(x - 1, y - 2, x + 7, y - 2, x + 3, y - 4); // резной верх
        g.fillStyle(win()).fillRect(x, y, 6, 6);
        g.fillStyle(frame).fillRect(x + 2.5, y, 1, 6).fillRect(x - 1, y + 6, 8, 1);
      }
      g.fillStyle(0x3a2c1c).fillRect(w - 12, h + H - 13, 6, 9); // дверь
      g.fillStyle(0x5a4630).fillRect(w - 14, h + H - 5, 10, 2);  // ступенька крыльца
      g.fillStyle(0x5a4630).fillRect(w - 14, h + H - 15, 10, 2); // навес
      return;
    }
    if (style === 'rural') {
      g.fillStyle(0x000000, 0.18).fillRect(0, h, w, 2); // тень под свесом крыши
      g.lineStyle(1, 0x8a8678, 0.6);
      for (let i = 0; i < 3; i++) {
        const x = rnd.between(4, Math.max(5, w - 10));
        g.lineBetween(x, h + 3, x + rnd.between(-3, 3), h + 3 + rnd.between(3, 8));
      }
      const dx = Math.round(w / 2) - 4;
      for (let x = 7; x < w - 12; x += 14) {
        if (x > dx - 14 && x < dx + 16) continue;
        g.fillStyle(0x6a7a88).fillRect(x - 1, h + 4, 8, 9);
        g.fillStyle(win()).fillRect(x, h + 5, 6, 7);
        g.fillStyle(0x6a7a88).fillRect(x + 2.5, h + 5, 1, 7).fillRect(x, h + 8, 6, 1);
      }
      const sign = [0x7a3a30, 0x3a5470, 0x46623e][variant] ?? 0x7a3a30;
      const sw = Math.min(Math.round(w * 0.4), 52);
      g.fillStyle(sign).fillRect(w / 2 - sw / 2, h + 2, sw, 4);
      g.fillStyle(0xd0c8b0, 0.6);
      for (let x = w / 2 - sw / 2 + 3; x < w / 2 + sw / 2 - 3; x += 5) g.fillRect(x, h + 3, 3, 2); // «буквы» — не читаются
      g.fillStyle(0x3a3428).fillRect(dx, h + H - 12, 8, 8);
      g.fillStyle(0x6e726e).fillRect(dx - 3, h + H - 14, 14, 2); // козырёк
      g.fillStyle(0x000000, 0.25).fillRect(dx - 3, h + H - 12, 14, 1);
      g.fillStyle(0x8a8a84).fillRect(dx - 4, h + H - 4, 16, 2).fillRect(dx - 2, h + H - 2, 12, 2); // ступени
      return;
    }
    // barn
    if (variant === 0) {
      g.fillStyle(0x000000, 0.08);
      for (let y = h + 2; y < h + H - 4; y += 3) g.fillRect(0, y, w, 1);
      g.fillStyle(0x7a5040, 0.35); // побелка облезла — проступает кирпич
      for (let i = 0; i < Math.max(2, Math.round(w / 60)); i++) g.fillRect(rnd.between(2, Math.max(3, w - 16)), h + rnd.between(3, H - 10), rnd.between(6, 14), rnd.between(3, 5));
    } else {
      g.fillStyle(0x6b5a40).fillRect(0, h, w, H - 4);
      g.lineStyle(1, 0x4a3c28, 0.8);
      for (let x = 3; x < w; x += 4) g.lineBetween(x, h, x, h + H - 4);
    }
    const n = Math.max(1, Math.round(w / 120));
    const gates = [];
    for (let i = 0; i < n; i++) gates.push(Math.round(((i + 0.5) * w) / n));
    for (let x = 10; x < w - 8; x += 18) {
      if (gates.some((c) => Math.abs(x + 3 - c) < 16)) continue;
      g.fillStyle(win()).fillRect(x, h + 3, 6, 3);
    }
    for (const c of gates) {
      const gx = c - 9;
      const gy = h + 5;
      const gh = H - 9;
      g.fillStyle(0x1e1c18).fillRect(gx, gy, 18, gh);
      g.fillStyle(0x5a4a34).fillRect(gx, gy, 9, gh); // одна створка закрыта
      g.lineStyle(1, 0x3a2e20).lineBetween(gx, gy, gx + 9, gy + gh).lineBetween(gx + 9, gy, gx, gy + gh);
    }
  }

  // Двускатные крыши деревни: конёк вдоль длинной стороны, северный скат в тени.
  // Шифер — частая волна поперёк конька, кровельное железо (у изб — крашеное) — редкие фальцы
  villageRoof(g, w, h, style, variant) {
    const IZBA = [[0x5a5e5a, 0x767a74, 'shifer'], [0x3e5240, 0x4e6650, 'iron'], [0x5a382c, 0x74483a, 'iron']];
    const [dark, light, kind] = style === 'izba' ? IZBA[variant] ?? IZBA[0] : style === 'barn' ? [0x545856, 0x6c706c, 'shifer'] : [0x5a5e5a, 0x767a74, 'shifer'];
    const long = w >= h;
    if (long) g.fillStyle(dark).fillRect(0, 0, w, h / 2).fillStyle(light).fillRect(0, h / 2, w, h - h / 2);
    else g.fillStyle(light).fillRect(0, 0, w / 2, h).fillStyle(dark).fillRect(w / 2, 0, w - w / 2, h);
    const step = kind === 'shifer' ? 3 : 7;
    g.lineStyle(1, kind === 'shifer' ? 0x000000 : 0xffffff, kind === 'shifer' ? 0.18 : 0.12);
    if (long) for (let x = step; x < w; x += step) g.lineBetween(x, 1, x, h - 1);
    else for (let y = step; y < h; y += step) g.lineBetween(1, y, w - 1, y);
    g.lineStyle(2, 0x8a8c86);
    if (long) g.lineBetween(0, h / 2, w, h / 2);
    else g.lineBetween(w / 2, 0, w / 2, h);
    const len = long ? w : h;
    const at = (k) => (long ? [k, h / 2] : [w / 2, k]);
    if (style === 'barn') {
      // Вентиляционные шахты по коньку
      for (let k = 30; k < len - 12; k += 50) {
        const [x, y] = at(k);
        g.fillStyle(0x000000, 0.3).fillRect(x - 1, y - 1, 8, 8);
        g.fillStyle(0x8a8c86).fillRect(x - 4, y - 4, 8, 8);
        g.fillStyle(0x2a2a28).fillRect(x - 2, y - 2, 4, 4);
      }
      return;
    }
    // Печная труба у конька; на избе — телевизионная антенна
    const [cx, cy] = at(Math.round(len * 0.62));
    g.fillStyle(0x000000, 0.3).fillRect(cx - 1, cy - 2, 7, 7);
    g.fillStyle(0x7a4e3c).fillRect(cx - 3, cy - 4, 6, 6);
    g.fillStyle(0x2a2220).fillRect(cx - 2, cy - 3, 4, 2);
    if (style === 'izba') {
      const [ax, ay] = at(Math.round(len * 0.25));
      g.lineStyle(1, 0x2a2a28).lineBetween(ax, ay, ax, ay - 9).lineBetween(ax - 5, ay - 8, ax + 5, ay - 8).lineBetween(ax - 3, ay - 5, ax + 3, ay - 5);
    }
  }

  // style: panel — панелька, factory — цех (кирпич, ленты окон, световые фонари на крыше),
  // barrack — барак (доски, мелкие окна), dk — Дворец культуры (светлый, колонны)
  texture(w, h, H, state = 'ok', style = 'panel', variant = 0) {
    const key = `bld_${w}x${h}_${H}_${state}_${style}${variant ? `_${variant}` : ''}`;
    const S = STYLES[style] ?? STYLES.panel;
    if (this.scene.textures.exists(key)) return key;
    const rnd = new Phaser.Math.RandomDataGenerator([key]);
    const burning = state === 'burning';
    const shelled = state === 'shelled';
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

    // Фасад: стена, ряды окон по этажам, подъезды внизу
    const floorH = 6;
    const floors = Math.floor((H - 6) / floorH);
    g.fillStyle(S.wall);
    g.fillRect(0, h, w, H);
    g.fillStyle(S.base);
    g.fillRect(0, h + H - 4, w, 4); // цоколь
    if (style === 'dk') {
      // Колоннада по фасаду
      for (let x = 8; x < w - 6; x += 16) {
        g.fillStyle(0xf2ecdc).fillRect(x, h + 4, 6, H - 8);
        g.fillStyle(0x000000, 0.18).fillRect(x + 5, h + 4, 2, H - 8);
      }
    }
    if (style === 'factory') {
      // Ленты окон во всю длину, по ленте на этаж
      for (let wy = h + 5; wy < h + H - 8; wy += 10) {
        g.fillStyle(shelled ? 0x1b1d20 : 0x6f8290).fillRect(4, wy, w - 8, 4);
        g.fillStyle(0x4a3226);
        for (let x = 4; x < w - 4; x += 12) g.fillRect(x, wy, 1, 4);
      }
    }
    // Сталинка: окна реже и крупнее, карниз под крышей
    if (style === 'barrack') {
      // Барак: стена из вертикальных досок, редкие маленькие окна в один ряд, без подъездов
      g.lineStyle(1, 0x4a3c28, 0.8);
      for (let x = 3; x < w; x += 4) g.lineBetween(x, h, x, h + H - 4);
      for (let x = 14; x < w - 10; x += 26) {
        g.fillStyle(0x2a2a24).fillRect(x, h + Math.round(H * 0.35), 5, 4);
        g.fillStyle(0x8a7a5a).fillRect(x - 1, h + Math.round(H * 0.35) + 4, 7, 1); // подоконник
      }
    }
    // Фасады общественных зданий
    if (style === 'police') g.fillStyle(0x2a5aa8).fillRect(0, h + 3, w, 3); // синяя полоса милиции
    if (style === 'kinder') {
      const colors = [0x9a6058, 0x5a7a92, 0x5e8058, 0x9a8a5a]; // выгоревшая краска, не ярче врагов
      for (let x = 4, i = 0; x < w - 8; x += 18, i++) g.fillStyle(colors[i % 4]).fillRect(x, h + 2, 10, 3); // цветные панели
    }
    if (style === 'fire') {
      // Гаражные ворота пожарных машин
      for (let x = 8; x < w - 30; x += 34) {
        g.fillStyle(0x2a2a2e).fillRect(x, h + H - 18, 26, 14);
        g.fillStyle(0x8e2e26).fillRect(x, h + H - 18, 26, 3);
      }
    }
    if (style === 'shop') {
      // Витрины во всю длину и красная вывеска над ними
      g.fillStyle(0x7890a0).fillRect(3, h + H - 16, w - 6, 10);
      g.fillStyle(0xb03024).fillRect(3, h + H - 22, w - 6, 5);
      g.fillStyle(0xf0e0b0);
      for (let x = 10; x < w - 14; x += 12) g.fillRect(x, h + H - 21, 6, 3); // буквы вывески
    }
    if (style === 'garage') {
      // Ряд железных ворот, без окон
      for (let x = 2; x < w - 10; x += 14) {
        g.fillStyle(0x4a4e52).fillRect(x, h + 2, 11, H - 4);
        g.fillStyle(0x8a8e92).fillRect(x, h + 2, 11, 1);
      }
    }
    if (style === 'gov') {
      // Портик с колоннами по центру фасада и часы над входом
      const pw = Math.round(w * 0.4);
      const px = (w - pw) / 2;
      g.fillStyle(0xeae2cc).fillRect(px - 4, h, pw + 8, 4);
      for (let x = px; x < px + pw; x += 12) {
        g.fillStyle(0xf2ecdc).fillRect(x, h + 6, 6, H - 10);
        g.fillStyle(0x000000, 0.18).fillRect(x + 5, h + 6, 2, H - 10);
      }
      g.fillStyle(0xf0ece0).fillCircle(w / 2, h + 3, 5);
      g.lineStyle(1, 0x2a2418).strokeCircle(w / 2, h + 3, 5).lineBetween(w / 2, h + 3, w / 2, h);
    }
    if (style === 'izba' || style === 'rural' || style === 'barn') this.villageFacade(g, rnd, w, h, H, style, variant, burning, shelled);
    const windowStep = style === 'stalin' || style === 'hospital' || style === 'school' || style === 'gov' ? 11 : 9;
    if (style === 'stalin') {
      g.fillStyle(0xe8d8b8).fillRect(0, h, w, 3); // карниз
      g.fillStyle(0x7a6040).fillRect(0, h + 3, w, 1); // тень под карнизом
      g.fillStyle(0xa88a60).fillRect(0, h + H - 10, w, 6); // рустованный первый этаж
    }
    const ownFacade = ['factory', 'dk', 'barrack', 'shop', 'fire', 'garage', 'izba', 'rural', 'barn'];
    for (let f = 0; !ownFacade.includes(style) && f < floors; f++) {
      const wy = h + 3 + f * floorH;
      for (let wx = 5; wx < w - 5; wx += windowStep) {
        const r = rnd.frac();
        // Большинство окон тёмные (эвакуация), редкие горят, редкие выбиты.
        // Горящий дом — окна в огне; после обстрела — больше выбитых
        const lit = burning ? (r < 0.45 ? 0xff7a2e : 0x1b1d20) : r < 0.07 ? 0xd8b878 : null;
        const broken = r < (shelled ? 0.55 : 0.2);
        g.fillStyle(lit ?? (broken ? 0x1b1d20 : 0x7d8b96));
        g.fillRect(wx, wy, 5, 3);
      }
    }
    // Панелька: швы между панелями по этажам — сразу видно сборный дом
    if (style === 'panel') {
      g.lineStyle(1, 0x000000, 0.2);
      for (let f = 0; f < floors; f++) g.lineBetween(0, h + 7.5 + f * floorH, w, h + 7.5 + f * floorH);
    }
    const sections = Math.max(1, Math.round(w / 46));
    g.fillStyle(0x2c3034);
    // Подъезды; у барака — одна дверь с торца
    if (style === 'barrack') g.fillStyle(0x3a2c1c).fillRect(4, h + H - 12, 7, 8);
    else if (VARIANTS[style]) {
      // деревня: двери и ворота рисует villageFacade
    } else for (let i = 0; i < sections; i++) g.fillRect((i + 0.5) * (w / sections) - 3, h + H - 9, 6, 5);

    // Крыша: как раньше — секции и выходы на крышу
    g.fillStyle(S.roof);
    g.fillRect(0, 0, w, h);
    if (style === 'factory') {
      // Шедовая крыша «пилой»: узкая полоса мутного стекла, за ней освещённый скат и тень.
      // Светлые полосы во всю крышу читались как зебра — стекло приглушено и уже
      for (let x = 6; x < w - 14; x += 22) {
        g.fillStyle(0x625c55).fillRect(x + 6, 4, 14, h - 8);   // скат
        g.fillStyle(0x5c6c74).fillRect(x, 4, 6, h - 8);        // стекло
        g.fillStyle(0x8a9aa0).fillRect(x, 4, 6, 1);
        g.fillStyle(0x000000, 0.3).fillRect(x + 19, 4, 3, h - 8); // тень гребня
      }
    } else if (style === 'barrack') {
      // Скатная крыша из рубероида: два ската, конёк посередине, полосы рулонов, печная труба
      g.fillStyle(0x3e3a34).fillRect(0, 0, w, h / 2);
      g.fillStyle(0x4a4640).fillRect(0, h / 2, w, h / 2);
      g.lineStyle(1, 0x2a2622, 0.6);
      for (let x = 8; x < w; x += 10) g.lineBetween(x, 0, x, h);
      g.lineStyle(2, 0x5a564e).lineBetween(0, h / 2, w, h / 2); // конёк
      g.fillStyle(0x6a3a2a).fillRect(w * 0.3, h / 2 - 6, 6, 6);  // печная труба
      g.fillStyle(0x6a3a2a).fillRect(w * 0.7, h / 2 - 6, 6, 6);
    } else if (style === 'izba' || style === 'rural' || style === 'barn') {
      this.villageRoof(g, w, h, style, variant);
    } else if (style === 'gov') {
      // Парапет и флагшток над входом
      g.lineStyle(3, 0xa49c8a).strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle(0x2a2418).fillRect(w / 2 - 1, 6, 2, 20);
      g.fillStyle(0xb03024).fillRect(w / 2 + 1, 6, 14, 8);
    } else if (style === 'garage') {
      // Плоская кровля с рубероидом, стыки над каждым гаражом
      g.lineStyle(1, 0x46494c, 0.8);
      for (let x = 14; x < w; x += 14) g.lineBetween(x, 0, x, h);
    } else if (style === 'hospital') {
      // Зелёный крест на крыше (красный — охраняемая эмблема Красного Креста), видно с вертолёта
      if (w >= 120 || h >= 120) {
        g.fillStyle(0xd8dcd8).fillRect(w / 2 - 14, h / 2 - 14, 28, 28);
        g.fillStyle(0x2f8a4a).fillRect(w / 2 - 4, h / 2 - 11, 8, 22).fillRect(w / 2 - 11, h / 2 - 4, 22, 8);
      }
    } else if (style === 'fire') {
      // Рукавная башня на углу и мигалка
      g.fillStyle(0x8a3a2e).fillRect(w - 24, 2, 20, 20);
      g.fillStyle(0x5a2a22).fillRect(w - 20, 6, 12, 12);
      g.fillStyle(0x9a3a30).fillCircle(w - 14, 12, 3); // мигалка выключена — яркий красный только у снарядов
    } else if (style === 'police') {
      g.fillStyle(0x2a5aa8).fillRect(w / 2 - 10, h / 2 - 4, 20, 8); // антенна связи
      g.fillStyle(0xd8dcdf).fillCircle(w / 2 + 20, h / 2, 5);
    } else if (style === 'school') {
      g.fillStyle(0xc03030).fillRect(w / 2 - 1, 4, 2, 14); // флаг над входом
      g.fillRect(w / 2 + 1, 4, 9, 5);
    } else if (style === 'station') {
      g.fillStyle(0xd8dcdf);
      for (const [x, y] of [[30, h / 2], [w - 40, h / 2]]) g.fillCircle(x, y, 12); // тарелки
      g.fillStyle(0x8a9298).fillCircle(30, h / 2, 6).fillCircle(w - 40, h / 2, 6);
    } else if (style === 'stalin') {
      // Вальмовая крыша: два длинных ската (северный в тени, южный на свету), торцевые скаты,
      // конёк и печные/вентиляционные трубы вдоль конька
      const quad = (a, b, c, d) => g.fillTriangle(a[0], a[1], b[0], b[1], c[0], c[1]).fillTriangle(a[0], a[1], c[0], c[1], d[0], d[1]);
      const d = Math.min(w, h) / 2;
      const dark = 0x584a40;
      const light = 0x806c5c;
      if (w >= h) {
        g.fillStyle(dark);
        quad([0, 0], [w, 0], [w - d, d], [d, d]);
        g.fillStyle(light);
        quad([0, h], [d, d], [w - d, d], [w, h]);
        g.lineStyle(2, 0x9a8676).lineBetween(d, d, w - d, d);
        g.lineStyle(1, 0x9a8676, 0.7).lineBetween(0, 0, d, d).lineBetween(0, h, d, d).lineBetween(w, 0, w - d, d).lineBetween(w, h, w - d, d);
      } else {
        g.fillStyle(light);
        quad([0, 0], [d, d], [d, h - d], [0, h]);
        g.fillStyle(dark);
        quad([w, 0], [w, h], [w - d, h - d], [w - d, d]);
        g.lineStyle(2, 0x9a8676).lineBetween(d, d, d, h - d);
        g.lineStyle(1, 0x9a8676, 0.7).lineBetween(0, 0, d, d).lineBetween(w, 0, d, d).lineBetween(0, h, d, h - d).lineBetween(w, h, d, h - d);
      }
      const len = Math.max(w, h) - 2 * d;
      for (let k = 18; k < len - 6; k += 34) {
        const cx = w >= h ? d + k : w / 2 + 6;
        const cy = w >= h ? h / 2 + 6 : d + k;
        g.fillStyle(0x000000, 0.3).fillRect(cx + 2, cy + 2, 6, 5);
        g.fillStyle(0x7a4e3c).fillRect(cx - 1, cy - 1, 6, 5); // кирпичная труба
        g.fillStyle(0x2a2422).fillRect(cx, cy, 4, 2);
      }
    } else if (style === 'dk') {
      g.lineStyle(3, 0xd8d0c0).strokeRect(3, 3, w - 6, h - 6); // парапет
      g.fillStyle(0xc03030).fillRect(w / 2 - 1, 6, 2, 16); // флагшток с флагом
      g.fillRect(w / 2 + 1, 6, 10, 6);
    }
    const long = w >= h;
    const len = long ? w : h;
    const sec = Math.max(1, Math.round(len / 46));
    const step = len / sec;
    g.lineStyle(1, P.panelDark, 0.7);
    for (let i = 1; style === 'panel' && i < sec; i++) {
      if (long) g.lineBetween(i * step, 0, i * step, h);
      else g.lineBetween(0, i * step, w, i * step);
    }
    g.fillStyle(P.panelDark);
    for (let i = 0; style === 'panel' && i < sec; i++) {
      const cx = long ? (i + 0.5) * step : w / 2;
      const cy = long ? h / 2 : (i + 0.5) * step;
      g.fillRect(cx - 4, cy - 4, 8, 8);
    }
    // Горящий дом: крыша обуглена пятнами, копоть ползёт по фасаду вверх
    if (burning) {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0x1a1a1a, 0.55);
        g.fillCircle(rnd.between(8, w - 8), rnd.between(6, h - 6), rnd.between(10, 22));
      }
      g.fillStyle(0x111111, 0.35);
      for (let i = 0; i < 3; i++) g.fillRect(rnd.between(4, w - 20), h, rnd.between(10, 18), H - 4);
    }
    // После обстрела: воронки-пробоины на крыше с обломками вокруг, отбитый угол
    if (shelled) {
      for (let i = 0; i < 2; i++) {
        const cx = rnd.between(14, w - 14);
        const cy = rnd.between(10, h - 10);
        g.fillStyle(0x6c6f73);
        for (let k = 0; k < 6; k++) g.fillRect(cx + rnd.between(-16, 14), cy + rnd.between(-12, 10), 3, 3);
        g.fillStyle(0x2a2a2a);
        g.fillCircle(cx, cy, rnd.between(7, 11));
        g.fillStyle(0x0d0d0d);
        g.fillCircle(cx + 1, cy + 1, 4);
      }
      g.fillStyle(RUIN_KIND[style] ? 0x3e3a2c : 0x2e3134); // отбитый угол — сквозь него видно землю/асфальт
      g.fillTriangle(w, 0, w - rnd.between(14, 26), 0, w, rnd.between(10, 18));
    }
    // Кромка крыши светлее — читается грань между крышей и фасадом
    g.fillStyle(0xa9aeb4);
    g.fillRect(0, h - 2, w, 2);
    g.lineStyle(2, 0x2a2e33);
    g.strokeRect(1, 1, w - 2, h + H - 2);

    g.generateTexture(key, w, h + H);
    g.destroy();
    return key;
  }
}
