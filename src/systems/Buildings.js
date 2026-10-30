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
  factory: { wall: 0x7a4e3c, base: 0x4e3226, roof: 0x5e5248 },
  barrack: { wall: 0x6b5a40, base: 0x4a3e2c, roof: 0x5b4a36 },
  dk: { wall: 0xd8cfb8, base: 0xa89e88, roof: 0xb8b0a0 },
};

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
      const H = buildingHeight(w, h);
      const r = rnd.frac();
      const state = r < CHAOS.burningHouses ? 'burning' : r < CHAOS.burningHouses + CHAOS.shelledHouses ? 'shelled' : 'ok';
      const key = this.texture(w, h, H, state, style);
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
      this.list.push({ x, y, w, h, H, img, roof, state, style, maxHp, hp: state === 'shelled' ? maxHp * RUINS.damaged : maxHp });
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
    b.img.setTexture(this.texture(b.w, b.h, b.H, state, b.style));
  }

  // Руины: дом становится низкой грудой обломков на земле — ниже врагов и следов,
  // крыши больше нет (ящики туда не падают), поднимается пыль
  collapse(b) {
    b.state = 'ruined';
    b.hp = 0;
    b.img.setTexture(this.ruinTexture(b.w, b.h)).setPosition(b.x, b.y - RUIN_H).setDepth(DEPTH.ground + 1.4);
    const i = this.roofs.indexOf(b.roof);
    if (i >= 0) this.roofs.splice(i, 1);
    this.scene.dust?.(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) / 2);
    sfx.play('crumble');
  }

  // Груда обломков на месте дома: плиты, куски стен по краю, копоть
  ruinTexture(w, h) {
    const key = `ruin_${w}x${h}`;
    if (this.scene.textures.exists(key)) return key;
    const rnd = new Phaser.Math.RandomDataGenerator([key]);
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x3e4144);
    g.fillRect(0, RUIN_H, w, h);
    g.fillStyle(0x1c1d1f, 0.6);
    for (let i = 0; i < 3; i++) g.fillCircle(rnd.between(6, w - 6), RUIN_H + rnd.between(6, h - 6), rnd.between(10, 20));
    const n = Math.round((w * h) / 280); // реже — иначе груда рябит
    for (let i = 0; i < n; i++) {
      g.fillStyle(rnd.pick([0x8a8f95, 0x6c7176, 0x5d6269, 0x9aa0a6]));
      g.fillRect(rnd.between(0, w - 8), RUIN_H + rnd.between(0, h - 6), rnd.between(4, 12), rnd.between(3, 7));
    }
    // Обломки стен по южному краю — видно, что тут стоял дом
    g.fillStyle(0x5d6269);
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

  // style: panel — панелька, factory — цех (кирпич, ленты окон, световые фонари на крыше),
  // barrack — барак (доски, мелкие окна), dk — Дворец культуры (светлый, колонны)
  texture(w, h, H, state = 'ok', style = 'panel') {
    const key = `bld_${w}x${h}_${H}_${state}_${style}`;
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
    const windowStep = style === 'barrack' ? 16 : 9;
    for (let f = 0; style !== 'factory' && style !== 'dk' && f < floors; f++) {
      const wy = h + 3 + f * floorH;
      for (let wx = 5; wx < w - 5; wx += windowStep) {
        const r = rnd.frac();
        // Большинство окон тёмные (эвакуация), редкие горят, редкие выбиты.
        // Горящий дом — окна в огне; после обстрела — больше выбитых
        const lit = burning ? (r < 0.45 ? 0xff7a2e : 0x1b1d20) : r < 0.12 ? 0xffd27a : null;
        const broken = r < (shelled ? 0.55 : 0.2);
        g.fillStyle(lit ?? (broken ? 0x1b1d20 : 0x7d8b96));
        g.fillRect(wx, wy, 5, 3);
      }
    }
    const sections = Math.max(1, Math.round(w / 46));
    g.fillStyle(0x2c3034);
    for (let i = 0; i < sections; i++) g.fillRect((i + 0.5) * (w / sections) - 3, h + H - 9, 6, 5);

    // Крыша: как раньше — секции и выходы на крышу
    g.fillStyle(S.roof);
    g.fillRect(0, 0, w, h);
    if (style === 'factory') {
      // Световые фонари — стеклянные полосы поперёк цеха
      for (let x = 10; x < w - 10; x += 26) {
        g.fillStyle(0x8fa6b0).fillRect(x, 6, 10, h - 12);
        g.fillStyle(0x000000, 0.25).fillRect(x + 10, 6, 3, h - 12);
      }
    } else if (style === 'barrack') {
      // Доски
      g.lineStyle(1, 0x3e3224, 0.7);
      for (let y = 4; y < h; y += 5) g.lineBetween(0, y, w, y);
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
      g.fillStyle(0x2e3134); // отбитый угол — сквозь него видно асфальт
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
