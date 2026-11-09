import * as Phaser from 'phaser';
import { LAB, CITY } from '../config.js';
import { DEPTH } from '../depth.js';
import { sfx } from './Sfx.js';
import { layout } from '../levels.js';
import { t } from '../i18n/index.js';

// Подземная лаборатория «Объекта 67»: бетонная площадка с люком на одной из площадей.
// В 4:00 люк срывает, из-под земли выходит «Объект» — шар-вирус. Он катится к вертолёту,
// сминает дома на пути (Tracks) и тянет за собой шлейф газа «Заря».
// В деревне (layout.labStyle === 'pit') вместо площадки — навозохранилище, «Объект» выходит из ямы.
export class Lab {
  constructor(scene) {
    this.scene = scene;
    this.pos = this.pick();
    this.gfx = scene.add.graphics().setDepth(DEPTH.ground + 1.5);
    this.pit = layout.labStyle === 'pit';
    // Трафарет на бетоне — часть мира (советский город), поэтому по-русски на любом языке; у ямы его нет
    this.label = this.pit
      ? null
      : scene.add
          .text(this.pos.x, this.pos.y + LAB.size / 2 - 12, t('labSign'), { fontFamily: 'monospace', fontSize: '11px', color: '#2a2418', fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(DEPTH.ground + 1.55);
    this.draw(false);
    this.gas = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 1800, max: 2800 },
        speedX: { min: -12, max: 12 },
        speedY: { min: -12, max: 12 },
        scale: { start: 2.8, end: 5.5 },
        alpha: { start: 0.32, end: 0 },
        tint: [0xc8d860, 0xa8c050, 0xe0e890], // жёлто-зелёный газ «Зари»
      })
      .setDepth(DEPTH.ground + 1.8); // тяжёлый, стелется по земле: под домами и врагами
    this.gasT = 0;
  }

  // Площадь подальше от старта — дорога до лаборатории заметна; нет подходящей — самая дальняя
  pick() {
    // По плану города — квартал L (завод с лабораторией)
    const L = this.scene.districts?.L?.[0];
    if (L) return { x: L.x + CITY.tile / 2, y: L.y + CITY.tile / 2 };
    const { plazas } = this.scene;
    const cx = this.scene.player.x;
    const cy = this.scene.player.y;
    const d = (p) => Math.hypot(p.x - cx, p.y - cy);
    const ok = plazas.filter((p) => d(p) >= LAB.minDist && d(p) <= LAB.maxDist);
    if (ok.length) return Phaser.Utils.Array.GetRandom(ok);
    if (plazas.length) return plazas.reduce((a, b) => (d(a) > d(b) ? a : b));
    return { x: cx + LAB.minDist, y: cy };
  }

  // Площадка: бетон, жёлто-чёрная кромка, люк; open — сорванный люк и провал
  draw(open) {
    if (this.pit) return this.drawPit(open);
    const { x, y } = this.pos;
    const s = LAB.size;
    const g = this.gfx.clear();
    g.fillStyle(0x6a6e70).fillRect(x - s / 2, y - s / 2, s, s);
    // Кромка «опасная зона» — штрихи по периметру
    const stripe = 10;
    for (let i = 0; i < (s * 4) / stripe; i++) {
      g.fillStyle(i % 2 ? 0x1a1a1a : 0xffd23a);
      const k = i * stripe;
      const side = Math.floor(k / s);
      const o = k % s;
      if (side === 0) g.fillRect(x - s / 2 + o, y - s / 2, stripe, 6);
      else if (side === 1) g.fillRect(x + s / 2 - 6, y - s / 2 + o, 6, stripe);
      else if (side === 2) g.fillRect(x + s / 2 - o - stripe, y + s / 2 - 6, stripe, 6);
      else g.fillRect(x - s / 2, y + s / 2 - o - stripe, 6, stripe);
    }
    if (!open) {
      g.fillStyle(0x3a3e40).fillCircle(x, y, LAB.hatch);
      g.lineStyle(3, 0x24272a).strokeCircle(x, y, LAB.hatch);
      g.lineStyle(2, 0x24272a).lineBetween(x - LAB.hatch, y, x + LAB.hatch, y).lineBetween(x, y - LAB.hatch, x, y + LAB.hatch);
    } else {
      // Провал: чёрная дыра, вывороченный бетон, крышка люка отброшена
      g.fillStyle(0x0a0a0a).fillCircle(x, y, LAB.hatch + 8);
      g.fillStyle(0x4a4e50);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.fillRect(x + Math.cos(a) * (LAB.hatch + 12) - 4, y + Math.sin(a) * (LAB.hatch + 12) - 3, 8, 6);
      }
      g.fillStyle(0x3a3e40).fillCircle(x + LAB.hatch * 2.2, y - LAB.hatch * 0.8, LAB.hatch * 0.8);
    }
  }

  // Навозохранилище: земляные берега, тёмная жижа с коркой, доски-мостки, следы колёс.
  // open — яму разворотило: жижа раскидана брызгами, доски разлетелись, со дна светит газ «Зари».
  // Рисуется дважды за игру (старт и выход «Объекта») — не каждый кадр
  drawPit(open) {
    const { x, y } = this.pos;
    const s = LAB.size;
    const g = this.gfx.clear();
    const rnd = new Phaser.Math.RandomDataGenerator(['pit']);
    // Колеи тракторов-навозоразбрасывателей — с юга к краю ямы
    g.lineStyle(4, 0x2e261a, 0.7).lineBetween(x - 10, y + s * 0.42, x - 16, y + s * 0.9).lineBetween(x + 10, y + s * 0.42, x + 6, y + s * 0.9);
    // Берега: насыпь, северный край освещён
    g.fillStyle(0x4e4230).fillEllipse(x, y, s * 1.08, s * 0.92);
    g.fillStyle(0x6a5a40).fillEllipse(x - 3, y - 4, s * 0.98, s * 0.8);
    g.fillStyle(0x4a3e2c).fillEllipse(x + 2, y + 3, s * 0.9, s * 0.74);
    if (!open) {
      g.fillStyle(0x2a2216).fillEllipse(x, y + 2, s * 0.8, s * 0.62);   // жижа
      g.fillStyle(0x3c3220, 0.9);                                          // корка
      for (let i = 0; i < 9; i++) {
        const a = rnd.realInRange(0, Math.PI * 2);
        const r = rnd.realInRange(0, s * 0.26);
        g.fillEllipse(x + Math.cos(a) * r, y + 2 + Math.sin(a) * r * 0.75, rnd.between(10, 24), rnd.between(6, 12));
      }
      g.fillStyle(0x7a6e48, 0.6);                                          // солома на поверхности
      for (let i = 0; i < 14; i++) g.fillRect(x + rnd.between(-30, 30), y + rnd.between(-20, 22), 3, 1);
      g.lineStyle(1, 0x5a5236, 0.5).strokeEllipse(x - 8, y - 6, s * 0.3, s * 0.12); // маслянистый блик
      // Мостки: две доски с берега
      for (const [bx, by, a] of [[x - s * 0.36, y + s * 0.06, -0.15], [x - s * 0.34, y + s * 0.13, -0.1]]) {
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const pts = [[-14, -2], [14, -2], [14, 2], [-14, 2]].map(([px, py]) => ({ x: bx + px * c - py * sn, y: by + px * sn + py * c }));
        g.fillStyle(0x000000, 0.35).fillPoints(pts.map((p) => ({ x: p.x + 2, y: p.y + 2 })), true);
        g.fillStyle(0x7a6648).fillPoints(pts, true);
      }
      return;
    }
    // Развороченная яма: тёмный провал, по краю — газ «Зари» светится со дна
    g.fillStyle(0x14100a).fillEllipse(x, y + 2, s * 0.78, s * 0.6);
    g.fillStyle(0xa8c050, 0.28).fillEllipse(x, y + 2, s * 0.7, s * 0.52);
    g.fillStyle(0xc8d860, 0.4).fillEllipse(x, y + 2, s * 0.46, s * 0.34);
    g.fillStyle(0xe0e890, 0.55).fillEllipse(x, y + 2, s * 0.22, s * 0.16);
    // Брызги жижи и комья земли вокруг
    for (let i = 0; i < 22; i++) {
      const a = rnd.realInRange(0, Math.PI * 2);
      const r = rnd.realInRange(s * 0.5, s * 0.85);
      g.fillStyle(rnd.frac() < 0.6 ? 0x2a2216 : 0x5a4a34, 0.85).fillEllipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, rnd.between(6, 16), rnd.between(4, 10));
    }
    // Доски разлетелись
    for (let i = 0; i < 4; i++) {
      const a = rnd.realInRange(0, Math.PI * 2);
      const r = rnd.realInRange(s * 0.55, s * 0.9);
      const bx = x + Math.cos(a) * r;
      const by = y + Math.sin(a) * r;
      const t = rnd.realInRange(0, Math.PI);
      const c = Math.cos(t);
      const sn = Math.sin(t);
      const pts = [[-13, -2], [13, -2], [13, 2], [-13, 2]].map(([px, py]) => ({ x: bx + px * c - py * sn, y: by + px * sn + py * c }));
      g.fillStyle(0x6a5a40).fillPoints(pts, true);
    }
  }

  // Люк сорван — «Объект» выходит из провала
  open(boss) {
    this.draw(true);
    boss.emerging = LAB.emerge;
    boss.setAlpha(0);
    this.scene.tweens.add({ targets: boss, alpha: 1, duration: LAB.emerge * 1000 });
    this.scene.cameras.main.shake(700, 0.012);
    sfx.play('hatch');
    this.scene.dust(this.pos.x, this.pos.y, 120);
    this.scene.explosionFx(this.pos.x, this.pos.y, 70);
  }

  update(dt) {
    const b = this.scene.boss;
    if (!b?.active) return;
    // Шлейф газа: чем быстрее катится, тем гуще
    this.gasT -= dt;
    if (this.gasT <= 0) {
      this.gasT = LAB.gasEvery;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * LAB.gasRadius;
      this.gas.emitParticleAt(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 1);
    }
  }
}
