import * as Phaser from 'phaser';
import { EXTRACT, WORLD } from '../config.js';
import { DEPTH } from '../depth.js';
import { layout } from '../levels.js';
import { t } from '../i18n/index.js';
import { sfx } from './Sfx.js';

// Уход из района перед ядерным ударом (как вылет на буре в DRG Survivor): после «Объекта»
// или по таймеру у одного края карты открывается коридор. Долетел за EXTRACT.time с — выжил,
// не успел — удар.
const DIRS = {
  n: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  w: { dx: -1, dy: 0 },
  e: { dx: 1, dy: 0 },
};

export class Extraction {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.left = 0;
    this.gfx = scene.add.graphics().setDepth(DEPTH.buildings + 0.6);
  }

  start() {
    if (this.active) return;
    const p = this.scene.player;
    this.active = true;
    this.left = EXTRACT.time;
    this.t = 0;
    // Край не ближе minDist — иначе уходить слишком просто; из центра карты подходят все четыре
    const dist = { n: p.y, s: WORLD.height - p.y, w: p.x, e: WORLD.width - p.x };
    const far = Object.keys(dist).filter((d) => dist[d] >= EXTRACT.minDist);
    // Уровень может задать сторону (в деревне — север, к столице); иначе — любая далёкая
    this.dir = layout.exitDir ?? (far.length ? Phaser.Utils.Array.GetRandom(far) : Object.keys(dist).reduce((a, b) => (dist[a] > dist[b] ? a : b)));
    this.scene.events.emit('radio', t('cher_exit').replace('{dir}', t(`dir_${this.dir}`)), 'cheryomukha', true);
    this.scene.events.emit('alert', 3);
    sfx.play('radio');
  }

  // Ближайшая к вертолёту точка коридора — на неё указывает стрелка в HUD
  target() {
    const p = this.scene.player;
    const B = EXTRACT.band / 2;
    if (this.dir === 'n') return { x: p.x, y: B };
    if (this.dir === 's') return { x: p.x, y: WORLD.height - B };
    if (this.dir === 'w') return { x: B, y: p.y };
    return { x: WORLD.width - B, y: p.y };
  }

  inside() {
    const p = this.scene.player;
    const B = EXTRACT.band;
    if (this.dir === 'n') return p.y < B;
    if (this.dir === 's') return p.y > WORLD.height - B;
    if (this.dir === 'w') return p.x < B;
    return p.x > WORLD.width - B;
  }

  // 'escaped' — долетел, 'nuked' — время вышло, null — летим дальше
  update(dt) {
    if (!this.active) return null;
    this.left -= dt;
    this.t += dt;
    this.draw();
    if (this.inside()) return 'escaped';
    if (this.left <= 0) return 'nuked';
    return null;
  }

  // Полоса у края карты и шевроны наружу — «туда»
  draw() {
    const g = this.gfx.clear();
    const { dx, dy } = DIRS[this.dir];
    const B = EXTRACT.band;
    const W = WORLD.width;
    const H = WORLD.height;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
    const x0 = dx > 0 ? W - B : 0;
    const y0 = dy > 0 ? H - B : 0;
    const w = dx ? B : W;
    const h = dy ? B : H;
    g.fillStyle(EXTRACT.color, 0.1 + 0.1 * pulse);
    g.fillRect(x0, y0, w, h);
    // Внутренняя граница коридора
    const innerX = dx > 0 ? W - B : B;
    const innerY = dy > 0 ? H - B : B;
    g.lineStyle(4, EXTRACT.color, 0.6 + 0.4 * pulse);
    if (dx) g.lineBetween(innerX, 0, innerX, H);
    else g.lineBetween(0, innerY, W, innerY);
    // Шевроны бегут от внутренней границы к краю карты
    g.lineStyle(6, EXTRACT.color, 0.8);
    const along = dx ? H : W;
    const shift = (this.t * 60) % 60;
    for (let s = 60; s < along; s += 240) {
      for (let k = 0; k < 2; k++) {
        const o = 30 + k * 60 + shift;
        const c = dx ? { x: innerX + dx * o, y: s } : { x: s, y: innerY + dy * o };
        // остриё смотрит наружу
        const tip = { x: c.x + dx * 18, y: c.y + dy * 18 };
        g.lineBetween(c.x - dy * 24 - dx * 6, c.y - dx * 24 - dy * 6, tip.x, tip.y);
        g.lineBetween(c.x + dy * 24 - dx * 6, c.y + dx * 24 - dy * 6, tip.x, tip.y);
      }
    }
  }
}
