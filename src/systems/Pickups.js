import * as Phaser from 'phaser';
import { PICKUPS, XP } from '../config.js';
import { DEPTH } from '../depth.js';
import { t } from '../i18n/index.js';
import { meta } from '../meta.js';
import { sfx } from './Sfx.js';

// Находки с убитых врагов (как курица и сундук в Vampire Survivors):
//  - аптечка: чем меньше брони, тем чаще; подбирается магнитом, чинит броню;
//  - военный ящик: с тяжёлой техники; пролетел над ним — бесплатное улучшение,
//    иногда ещё и знак отличия (копится в meta.badges, показывается в итогах).
// Картинки из фиксированного пула — в бою объекты не создаются.
export class Pickups {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.badges = 0; // знаков за этот забег
    this.crates = 0;
    this.saidCrate = false;
    this.pool = { medkit: [], milcrate: [] };
    for (const kind of Object.keys(this.pool)) {
      for (let i = 0; i < PICKUPS[kind].max; i++) {
        const ring = scene.add.image(0, 0, 'beacon').setDepth(DEPTH.gems).setVisible(false).setTint(PICKUPS[kind].ring);
        const img = scene.add.image(0, 0, kind).setDepth(DEPTH.gems + 1).setVisible(false);
        scene.tweens.add({ targets: ring, scale: { from: 0.6, to: 1.15 }, alpha: { from: 0.9, to: 0.2 }, duration: 700, repeat: -1 });
        this.pool[kind].push({ kind, img, ring, active: false, x: 0, y: 0, life: 0, speed: 0 });
      }
    }
  }

  // Убит враг: аптечка — шанс растёт при малой броне; ящик — только с тяжёлой техники
  onKill(enemy) {
    const p = this.player;
    const M = PICKUPS.medkit;
    const low = p.hp / p.maxHp < M.lowHp;
    if (Math.random() < (low ? M.chanceLow : M.chance)) this.drop('medkit', enemy.x, enemy.y);
    const C = PICKUPS.milcrate;
    if (C.from.includes(enemy.type) && Math.random() < C.chance) this.drop('milcrate', enemy.x, enemy.y);
  }

  drop(kind, x, y) {
    const it = this.pool[kind].find((o) => !o.active);
    if (!it) return;
    Object.assign(it, { active: true, x, y, life: PICKUPS[kind].life, speed: 0 });
    it.img.setPosition(x, y).setVisible(true).setAlpha(1);
    it.ring.setPosition(x, y).setVisible(true);
    if (kind === 'milcrate' && !this.saidCrate) {
      this.saidCrate = true;
      this.scene.events.emit('radio', t('ivan_crate'), 'ivan');
    }
  }

  update(dt) {
    const p = this.player;
    for (const list of Object.values(this.pool)) {
      for (const it of list) {
        if (!it.active) continue;
        it.life -= dt;
        if (it.life <= 0) {
          this.hide(it);
          continue;
        }
        // Последние секунды мигает — скоро пропадёт
        if (it.life < 4) it.img.setAlpha(0.5 + 0.5 * Math.abs(Math.sin(it.life * 6)));
        const dx = p.x - it.x;
        const dy = p.y - it.y;
        const d = Math.hypot(dx, dy);
        // Аптечку тянет магнит, как кристаллы; ящик — только если пролететь над ним
        if (it.kind === 'medkit' && (it.speed || d < p.stats.magnetRadius)) {
          it.speed = (it.speed || XP.gemStartSpeed) + XP.gemAccel * dt;
          const step = Math.min(d, it.speed * dt);
          it.x += (dx / (d || 1)) * step;
          it.y += (dy / (d || 1)) * step;
          it.img.setPosition(it.x, it.y);
          it.ring.setPosition(it.x, it.y);
        }
        if (d < PICKUPS[it.kind].radius) this.collect(it);
      }
    }
  }

  collect(it) {
    this.hide(it);
    const p = this.player;
    const scene = this.scene;
    if (it.kind === 'medkit') {
      const heal = PICKUPS.medkit.heal;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      sfx.play('pickup');
      scene.fx.popup(p.x, p.y, `${t('pickup_medkit')} +${heal}`, '#7dff8a');
      return;
    }
    // Военный ящик: бесплатное улучшение из тех, что сейчас можно взять; всё на максимуме — ремонт
    this.crates++;
    sfx.play('levelUp');
    const [up] = scene.upgrades.roll(1);
    if (up) {
      scene.upgrades.apply(up.id);
      scene.picks.push({ id: up.id, t: Math.round(scene.spawner.elapsed), crate: true });
      scene.banner(`${t('milcrate')}: ${up.name} ${up.level}`, '#e8c860');
    } else {
      p.hp = p.maxHp;
      scene.banner(`${t('milcrate')}: ${t('pickup_medkit')}`, '#7dff8a');
    }
    if (Math.random() < PICKUPS.milcrate.badgeChance) {
      this.badges++;
      meta.badges = (meta.badges ?? 0) + 1;
      scene.fx.popup(p.x, p.y - 20, t('badgeGot'), '#ffd860');
    }
  }

  hide(it) {
    it.active = false;
    it.img.setVisible(false);
    it.ring.setVisible(false);
  }
}
