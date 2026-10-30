import * as Phaser from 'phaser';
import { UPGRADES, ORDNANCE } from '../config.js';
import { t } from '../i18n/index.js';

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
  flares: (s) => {
    s.flares.level++;
  },
  missile: (s) => {
    const st = s.missiles.stats;
    if (st.count > 0) st.cooldown *= UPGRADES.missileCooldownMul;
    st.count++;
  },
  bombs: (s) => s.ordnance.level.bombs++,
  napalm: (s) => s.ordnance.level.napalm++,
  rockets: (s) => s.ordnance.level.rockets++,
  gas: (s) => s.ordnance.level.gas++,
};

// Виды доп. оружия — их можно взять не больше ORDNANCE.slots за забег
const SLOT_WEAPONS = ['missile', 'bombs', 'napalm', 'rockets', 'gas'];

// Категория — цвет рамки и иконка карточки: оружие / защита / манёвр (Ходент: различимость выбора)
export const CATEGORY = {
  damage: 'weapon',
  fireRate: 'weapon',
  missile: 'weapon',
  bombs: 'weapon',
  napalm: 'weapon',
  rockets: 'weapon',
  gas: 'weapon',
  hp: 'defense',
  flares: 'defense',
  speed: 'move',
  magnet: 'move',
};

// Крупные числа — целыми («387», не «387.2»), мелкие — с десятыми («8.4»)
const fmt = (v) => (v >= 50 || Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

// Подвесное оружие: «— → 3» для нового, дальше «3 → 4»
function ordPreview(s, kind, key, unit) {
  const lv = s.ordnance.level[kind];
  const v = ORDNANCE[kind][key];
  return [lv ? v[lv - 1] : '—', v[lv], unit];
}

// «Было → стало» в цифрах, а не «+25%»: игрок видит, что именно получит
const PREVIEW = {
  damage: (s) => [s.gun.stats.damage, s.gun.stats.damage * UPGRADES.damageMul, ''],
  fireRate: (s) => [s.gun.stats.fireRate, s.gun.stats.fireRate * UPGRADES.fireRateMul, t('perSec')],
  speed: (s) => [s.player.stats.maxSpeed, s.player.stats.maxSpeed * UPGRADES.speedMul, ''],
  magnet: (s) => [s.player.stats.magnetRadius, s.player.stats.magnetRadius + UPGRADES.magnetAdd, ''],
  hp: (s) => [s.player.maxHp, s.player.maxHp + UPGRADES.hpAdd, ''],
  missile: (s) => {
    const st = s.missiles.stats;
    // Первая ракета — «0 → 1», дальше растёт залп и короче перезарядка
    return st.count === 0 ? [0, 1, ''] : [st.count, st.count + 1, ''];
  },
  bombs: (s) => ordPreview(s, 'bombs', 'count', ''),
  napalm: (s) => ordPreview(s, 'napalm', 'dps', t('perSec')),
  rockets: (s) => ordPreview(s, 'rockets', 'count', ''),
  gas: (s) => ordPreview(s, 'gas', 'dps', t('perSec')),
  flares: (s) => {
    const lv = s.flares.level;
    const cd = UPGRADES.flares.cooldown;
    return [cd[lv - 1], cd[Math.min(lv, cd.length - 1)], t('sec')];
  },
};

export class Upgrades {
  constructor(scene) {
    this.scene = scene;
    this.levels = {};
  }

  // До n случайных разных улучшений, которые ещё не на максимуме
  roll(n) {
    // Слоты оружия заняты — новых видов не предлагаем, только прокачку взятых
    const owned = SLOT_WEAPONS.filter((id) => this.level(id) > 0).length;
    const ids = Object.keys(DEFS).filter(
      (id) => this.level(id) < UPGRADES.maxLevel[id] && !(SLOT_WEAPONS.includes(id) && this.level(id) === 0 && owned >= ORDNANCE.slots)
    );
    return Phaser.Utils.Array.Shuffle(ids)
      .slice(0, n)
      .map((id) => ({
        id,
        name: t(`upg_${id}`),
        desc: t(`upg_${id}_desc`),
        level: this.level(id) + 1,
        max: UPGRADES.maxLevel[id],
        category: CATEGORY[id],
        preview: this.preview(id),
      }));
  }

  // «Калибр 10 → 13», «Ловушки: — → 6 с»
  preview(id) {
    // Первые ловушки: «было» нет — пишем, что появится
    if (id === 'flares' && this.scene.flares.level === 0) {
      return `${t('stat_flares_new')} ${fmt(UPGRADES.flares.cooldown[0])} ${t('sec')}`;
    }
    const [from, to, unit] = PREVIEW[id](this.scene);
    const f = typeof from === 'number' ? fmt(from) : from;
    return `${t(`stat_${id}`)} ${f} → ${fmt(to)}${unit ? (unit.startsWith('/') ? unit : ' ' + unit) : ''}`;
  }

  level(id) {
    return this.levels[id] ?? 0;
  }

  apply(id) {
    this.levels[id] = this.level(id) + 1;
    DEFS[id](this.scene);
  }
}
