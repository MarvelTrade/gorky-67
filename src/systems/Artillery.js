import * as Phaser from 'phaser';
import { ARTILLERY } from '../config.js';
import { DEPTH } from '../depth.js';
import { t } from '../i18n/index.js';
import { sfx } from './Sfx.js';

// Артобстрел: на земле появляется круг, «Черёмуха» предупреждает по рации, через ARTILLERY.warn с
// по кругу ложатся снаряды — урон всем внутри, и врагам, и вертолёту. Обычно рядом с игроком,
// во время боя с «Объектом» — на ближайшую площадь: босса можно заманить под удар (не обязательно).
export class Artillery {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.zones = [];
    this.next = ARTILLERY.firstAt;
    this.lured = false;
    this.gfx = scene.add.graphics().setDepth(DEPTH.buildings + 0.6);
    this.hits = 0; // для замеров: сколько раз накрыло вертолёт
  }

  update(dt, elapsed) {
    const A = ARTILLERY;
    const boss = this.scene.boss?.active ? this.scene.boss : null;
    if (elapsed >= this.next && !this.scene.spawner.paused) {
      this.next = elapsed + (boss ? A.bossEvery : A.every);
      this.call(boss);
    }
    const g = this.gfx.clear();
    for (const z of this.zones) {
      z.left -= dt;
      const k = 1 - Math.max(0, z.left) / A.warn; // 0 → 1 к удару
      if (z.left > 0) {
        // Круг краснеет и заполняется к удару; кольцо пульсирует чаще к концу
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * (6 + 14 * k));
        g.fillStyle(0xff2d2d, 0.08 + 0.22 * k);
        g.fillCircle(z.x, z.y, A.radius);
        g.lineStyle(3, 0xff3b30, 0.5 + 0.5 * pulse);
        g.strokeCircle(z.x, z.y, A.radius);
        g.lineStyle(2, 0xff3b30, 0.8);
        g.strokeCircle(z.x, z.y, A.radius * (1 - k)); // сжимающееся кольцо — отсчёт до удара
        continue;
      }
      // Залп: снаряды падают по кругу в течение ARTILLERY.salvo с; урон — один раз, на первом снаряде
      z.salvo -= dt;
      while (z.shells > 0 && z.salvo <= (A.salvo * (z.shells - 1)) / A.shells) {
        z.shells--;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * A.radius * 0.85;
        this.scene.explosionFx(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 60);
        sfx.play('explosion');
        if (!z.hit) {
          z.hit = true;
          this.damage(z);
        }
      }
    }
    this.zones = this.zones.filter((z) => z.shells > 0);
  }

  call(boss) {
    const A = ARTILLERY;
    const p = this.player;
    let spot = null;
    if (boss) {
      // По ближайшей к вертолёту площади — заманить «Объект» под удар
      spot = nearest(this.scene.plazas ?? [], p.x, p.y, A.plazaRange);
      if (spot && !this.lured) {
        this.lured = true;
        this.scene.events.emit('radio', t('cher_lure'), 'cheryomukha', true);
      }
    }
    if (!spot) {
      // Рядом с игроком, но не прямо под ним — есть время уйти
      const a = Math.random() * Math.PI * 2;
      const d = Phaser.Math.Between(A.near[0], A.near[1]);
      spot = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
    }
    this.zones.push({ x: spot.x, y: spot.y, left: A.warn, salvo: A.salvo, shells: A.shells, hit: false });
    if (!boss || this.lured) this.scene.events.emit('radio', t('cher_artillery'), 'cheryomukha', true);
    this.scene.events.emit('alert', A.warn);
  }

  damage(z) {
    const A = ARTILLERY;
    const r2 = A.radius * A.radius;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active || (e.x - z.x) ** 2 + (e.y - z.y) ** 2 > r2) continue;
      e.hit(e.type === 'boss' ? A.bossDamage : A.enemyDamage);
    }
    const p = this.player;
    if ((p.x - z.x) ** 2 + (p.y - z.y) ** 2 <= r2) {
      this.hits++;
      p.takeDamage(A.playerDamage, 'artillery');
    }
    this.scene.cameras.main.shake(400, 0.012);
  }
}

function nearest(points, x, y, maxDist) {
  let best = null;
  let bd = maxDist;
  for (const pt of points) {
    const d = Math.hypot(pt.x - x, pt.y - y);
    if (d < bd) {
      bd = d;
      best = pt;
    }
  }
  return best;
}
