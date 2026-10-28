import * as Phaser from 'phaser';
import { UPGRADES } from '../config.js';
import { t } from '../i18n.js';

// Что делает каждое улучшение. scene — GameScene.
const DEFS = {
  damage: (s) => {
    s.gun.stats.damage *= UPGRADES.damageMul;
  },
  fireRate: (s) => {
    s.gun.stats.fireRate *= UPGRADES.fireRateMul;
  },
  speed: (s) => {
    s.player.stats.maxSpeed *= UPGRADES.speedMul;
  },
  magnet: (s) => {
    s.player.stats.magnetRadius += UPGRADES.magnetAdd;
  },
  hp: (s) => {
    s.player.maxHp += UPGRADES.hpAdd;
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + UPGRADES.hpAdd);
  },
  missile: (s) => {
    const st = s.missiles.stats;
    if (st.count > 0) st.cooldown *= UPGRADES.missileCooldownMul;
    st.count++;
  },
};

export class Upgrades {
  constructor(scene) {
    this.scene = scene;
    this.levels = {};
  }

  // До n случайных разных улучшений, которые ещё не на максимуме
  roll(n) {
    const ids = Object.keys(DEFS).filter((id) => this.level(id) < UPGRADES.maxLevel[id]);
    return Phaser.Utils.Array.Shuffle(ids)
      .slice(0, n)
      .map((id) => ({
        id,
        name: t(`upg_${id}`),
        desc: t(`upg_${id}_desc`),
        level: this.level(id) + 1,
        max: UPGRADES.maxLevel[id],
      }));
  }

  level(id) {
    return this.levels[id] ?? 0;
  }

  apply(id) {
    this.levels[id] = this.level(id) + 1;
    DEFS[id](this.scene);
  }
}
