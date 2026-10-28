import { MISSILE } from '../config.js';
import { findNearest } from '../systems/AutoAim.js';

// Ракетная установка. count = 0, пока улучшение не взято.
// Залп из count ракет раз в cooldown секунд, каждая — в свою цель, если хватает врагов.
export class MissileLauncher {
  constructor(scene, owner, missiles, enemies) {
    this.scene = scene;
    this.owner = owner;
    this.missiles = missiles;
    this.enemies = enemies;
    this.stats = { ...MISSILE, count: 0 };
    this.timer = 0;
  }

  update(dt) {
    if (this.stats.count === 0) return;
    this.timer -= dt;
    if (this.timer > 0) return;

    const s = this.owner.sprite;
    const st = this.stats;
    const taken = new Set();
    let fired = 0;
    for (let i = 0; i < st.count; i++) {
      const target = findNearest(this.enemies, s.x, s.y, st.range, taken);
      if (!target) break;
      taken.add(target);
      const missile = this.missiles.get();
      if (!missile) break;
      // Ракеты сходят с бортов веером, дальше доворачивают на цель
      const side = i % 2 ? 1 : -1;
      const angle = s.rotation + side * (0.9 + 0.25 * Math.floor(i / 2));
      missile.fire(s.x, s.y, angle, st, target, this.enemies);
      fired++;
    }
    // Нет целей — проверим снова скоро, а не через весь cooldown
    this.timer = fired ? st.cooldown : 0.2;
  }
}
