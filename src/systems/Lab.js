import * as Phaser from 'phaser';
import { LAB } from '../config.js';
import { DEPTH } from '../depth.js';

// Подземная лаборатория «Объекта 67»: бетонная площадка с люком на одной из площадей.
// В 4:00 люк срывает, из-под земли выходит «Объект» — шар-вирус. Он катится к вертолёту,
// сминает дома на пути (Tracks) и тянет за собой шлейф газа «Заря».
export class Lab {
  constructor(scene) {
    this.scene = scene;
    this.pos = this.pick();
    this.gfx = scene.add.graphics().setDepth(DEPTH.ground + 1.5);
    this.label = scene.add
      // Трафарет на бетоне — часть мира (советский город), поэтому по-русски на любом языке
      .text(this.pos.x, this.pos.y + LAB.size / 2 - 12, 'ОБЪЕКТ 67', { fontFamily: 'monospace', fontSize: '11px', color: '#2a2418', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.ground + 1.55);
    this.draw(false);
    this.gas = scene.add
      .particles(0, 0, 'puff', {
        emitting: false,
        lifespan: { min: 1800, max: 2800 },
        speedX: { min: -12, max: 12 },
        speedY: { min: -12, max: 12 },
        scale: { start: 2.5, end: 6 },
        alpha: { start: 0.32, end: 0 },
        tint: [0xc8d860, 0xa8c050, 0xe0e890], // жёлто-зелёный газ «Зари»
      })
      .setDepth(DEPTH.ground + 1.8); // тяжёлый, стелется по земле: под домами и врагами
    this.gasT = 0;
  }

  // Площадь подальше от старта — дорога до лаборатории заметна; нет подходящей — самая дальняя
  pick() {
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

  // Люк сорван — «Объект» выходит из провала
  open(boss) {
    this.draw(true);
    boss.emerging = LAB.emerge;
    boss.setAlpha(0);
    this.scene.tweens.add({ targets: boss, alpha: 1, duration: LAB.emerge * 1000 });
    this.scene.cameras.main.shake(700, 0.012);
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
