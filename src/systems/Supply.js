import * as Phaser from 'phaser';
import { SUPPLY, FX, XP } from '../config.js';
import { DEPTH } from '../depth.js';
import { t } from '../i18n/index.js';
import { sfx } from './Sfx.js';

// Ящики снабжения на крышах. Подбираются, только если вертолёт пролетел над ящиком
// (магнит их не тянет). Ящиков фиксированное число — SUPPLY.maxOnMap, объекты создаются один раз.
export class Supply {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.timer = SUPPLY.firstAt;
    this.first = true;
    this.picked = { repair: 0, magnet: 0, bomb: 0 };

    this.crates = [];
    for (let i = 0; i < SUPPLY.maxOnMap; i++) {
      const ring = scene.add.image(0, 0, 'beacon').setDepth(DEPTH.gems).setVisible(false);
      const img = scene.add.image(0, 0, 'crate').setDepth(DEPTH.gems + 1).setVisible(false);
      // Пульсирующий маячок, чтобы ящик был заметен на крыше
      scene.tweens.add({ targets: ring, scale: { from: 0.7, to: 1.3 }, alpha: { from: 0.9, to: 0.2 }, duration: 800, repeat: -1 });
      this.crates.push({ img, ring, active: false, x: 0, y: 0 });
    }
  }

  get active() {
    return this.crates.filter((c) => c.active);
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = SUPPLY.interval;
      this.spawn();
    }
    const p = this.player;
    for (const c of this.crates) {
      if (c.active && Math.hypot(c.x - p.x, c.y - p.y) < SUPPLY.pickupRadius) this.collect(c);
    }
  }

  // Случайная крыша на разумном расстоянии от вертолёта и не рядом с другим ящиком
  spawn() {
    const crate = this.crates.find((c) => !c.active);
    if (!crate) return;
    const p = this.player;
    const others = this.active;
    const roofs = this.scene.roofs.filter((r) => {
      const d = Math.hypot(r.x - p.x, r.y - p.y);
      return d >= SUPPLY.minDist && d <= SUPPLY.maxDist && others.every((o) => Math.hypot(o.x - r.x, o.y - r.y) > 60);
    });
    if (roofs.length === 0) return;
    const roof = Phaser.Utils.Array.GetRandom(roofs);
    Object.assign(crate, { active: true, x: roof.x, y: roof.y });
    crate.img.setPosition(roof.x, roof.y).setVisible(true);
    crate.ring.setPosition(roof.x, roof.y).setVisible(true);

    if (this.first) {
      this.first = false;
      this.scene.events.emit('radio', t('radio_supply'));
    }
  }

  collect(crate) {
    crate.active = false;
    crate.img.setVisible(false);
    crate.ring.setVisible(false);

    const type = this.roll();
    this.picked[type]++;
    const p = this.player;
    const scene = this.scene;
    sfx.play('supply');

    if (type === 'repair') {
      p.hp = Math.min(p.maxHp, p.hp + SUPPLY.repairHp);
      scene.fx.popup(p.x, p.y, `${t('supply_repair')} +${SUPPLY.repairHp}`, '#7dff8a');
      return;
    }

    const view = scene.cameras.main.worldView;
    if (type === 'magnet') {
      // Весь опыт на экране летит к вертолёту
      for (const g of scene.gems.getChildren()) {
        if (g.active && view.contains(g.x, g.y)) g.pull(XP.gemStartSpeed);
      }
      scene.fx.popup(p.x, p.y, t('supply_magnet'), '#4fd8ff');
      return;
    }

    // Бомбёжка: урон всем врагам на экране, вспышка и сильная тряска
    let booms = 0;
    for (const e of scene.enemies.getChildren()) {
      if (!e.active || !view.contains(e.x, e.y)) continue;
      if (booms++ < 8) scene.explosionFx(e.x, e.y, 40);
      e.hit(SUPPLY.bombDamage);
    }
    scene.cameras.main.flash(250, 255, 230, 170);
    scene.fx.shake(FX.bombShake);
    sfx.play('explosion');
    scene.fx.popup(p.x, p.y, t('supply_bomb'), '#ffd040');
  }

  roll() {
    const w = SUPPLY.weights;
    let r = Math.random() * (w.repair + w.magnet + w.bomb);
    for (const type of ['repair', 'magnet', 'bomb']) {
      r -= w[type];
      if (r < 0) return type;
    }
    return 'bomb';
  }
}
