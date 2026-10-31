import * as Phaser from 'phaser';
import { LEVELUP, ORDNANCE, PLAYER, UPGRADES, HUD_GAUGES } from '../config.js';
import { CATEGORY } from '../systems/Upgrades.js';
import { t } from '../i18n/index.js';
import { drawIcon } from './icons.js';
import { FONT, KHAKI, BRASS } from './paper.js';

// Нижняя панель как в Deep Rock Galactic Survivor: слева — оружие (пулемёт и ячейки подвесного,
// пустая ячейка — пунктир с «+»: видно, сколько ещё можно взять), справа мельче — пассивные улучшения,
// которые ячеек не занимают. Перерисовывается, только когда взяли улучшение.
// По бокам экрана — шкалы брони (слева) и хода (справа): видно, что вертолёт стал крепче и быстрее.
const SLOT_WEAPONS = ['missile', 'bombs', 'napalm', 'rockets', 'gas'];
const PASSIVES = ['hp', 'flares', 'speed', 'magnet'];

export class WeaponBar {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics(); // подложки ячеек
    this.icons = [];
    this.levels = [];
    const n = 1 + ORDNANCE.slots + PASSIVES.length;
    for (let i = 0; i < n; i++) {
      this.icons.push(scene.add.graphics());
      this.levels.push(
        scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: '#f0e6c8', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(1, 1)
      );
    }
    this.gauges = scene.add.graphics();
    const gs = { fontFamily: FONT, fontSize: '10px', color: '#d8d0b8', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' };
    this.armorLabel = scene.add.text(0, 0, t('gaugeArmor'), gs).setOrigin(0, 0);
    this.speedLabel = scene.add.text(0, 0, t('gaugeSpeed'), gs).setOrigin(1, 0);
    this.sig = '';
  }

  // Что показывать: пулемёт, подвесное по порядку взятия, пассивные — всегда (невзятые — бледно)
  slots(gs) {
    const up = gs.upgrades;
    const taken = [];
    for (const p of gs.picks) if (SLOT_WEAPONS.includes(p.id) && !taken.includes(p.id)) taken.push(p.id);
    const gunLv = 1 + up.level('damage') + up.level('fireRate');
    const weapons = [{ id: 'damage', level: gunLv, max: 1 + UPGRADES.maxLevel.damage + UPGRADES.maxLevel.fireRate, cat: 'weapon' }];
    for (let i = 0; i < ORDNANCE.slots; i++) {
      const id = taken[i];
      weapons.push(id ? { id, level: up.level(id), max: UPGRADES.maxLevel[id], cat: CATEGORY[id] } : null);
    }
    const passives = PASSIVES.map((id) => ({ id, level: up.level(id), max: UPGRADES.maxLevel[id], cat: CATEGORY[id] }));
    return { weapons, passives };
  }

  layout(gs, width, height) {
    const sig = `${width}x${height}:${gs.picks.length}`;
    if (sig === this.sig) return;
    this.sig = sig;
    const { weapons, passives } = this.slots(gs);
    const S = width < 480 ? 34 : 42; // ячейка оружия
    const P = Math.round(S * 0.72); // ячейка пассивного
    const gap = 4;
    const sep = 12;
    const total = weapons.length * (S + gap) + sep + passives.length * (P + gap) - gap;
    let x = (width - total) / 2;
    const y = height - S - 8;
    const g = this.gfx.clear();
    // Общая плашка — хаки с латунной окантовкой, как плашка рации
    g.fillStyle(KHAKI, 0.72).fillRoundedRect(x - 6, y - 5, total + 12, S + 10, 6);
    g.lineStyle(1, BRASS, 0.7).strokeRoundedRect(x - 6, y - 5, total + 12, S + 10, 6);
    let i = 0;
    const put = (slot, size, top) => {
      const ic = this.icons[i];
      const lv = this.levels[i];
      ic.clear().setPosition(x + size / 2, top + size / 2).setScale(size / 42);
      if (!slot) {
        // Пустая ячейка подвесного: пунктир и «+»
        g.lineStyle(1.5, 0x8a8a70, 0.8);
        for (let k = 0; k < size; k += 6) {
          g.lineBetween(x + k, top, x + Math.min(size, k + 3), top);
          g.lineBetween(x + k, top + size, x + Math.min(size, k + 3), top + size);
          g.lineBetween(x, top + k, x, top + Math.min(size, k + 3));
          g.lineBetween(x + size, top + k, x + size, top + Math.min(size, k + 3));
        }
        g.lineStyle(2, 0x8a8a70, 0.8).lineBetween(x + size / 2 - 5, top + size / 2, x + size / 2 + 5, top + size / 2);
        g.lineBetween(x + size / 2, top + size / 2 - 5, x + size / 2, top + size / 2 + 5);
        lv.setText('');
      } else {
        const color = LEVELUP.categories[slot.cat]?.color ?? 0xffffff;
        const on = slot.level > 0;
        g.fillStyle(0x10140c, 0.85).fillRect(x, top, size, size);
        g.lineStyle(1.5, color, on ? 0.9 : 0.25).strokeRect(x, top, size, size);
        drawIcon(ic, slot.id, on ? color : 0x6a6a5a);
        ic.setAlpha(on ? 1 : 0.45);
        lv.setText(on ? (slot.level >= slot.max ? 'MAX' : String(slot.level)) : '');
        lv.setPosition(x + size - 1, top + size + 1).setFontSize(size < 30 ? 9 : 11);
      }
      x += size + gap;
      i++;
    };
    for (const w of weapons) put(w, S, y);
    x += sep - gap;
    for (const p of passives) put(p, P, y + S - P);
    this.top = y - 5; // верх панели — выше неё ничего не ставим
  }

  // Шкалы по бокам: броня — длина растёт с запасом брони, заливка — сколько осталось;
  // ход — насколько вертолёт быстрее базового. С половины шкалы — реактивные ускорители (Player)
  drawGauges(gs, width, height) {
    const p = gs.player;
    const G = HUD_GAUGES;
    const g = this.gauges.clear();
    const gh = Math.round(Math.min(height * 0.34, 220));
    const gy = Math.round(height * 0.5 - gh / 2 + 20);
    const w = 8;
    // Броня
    const ax = 6;
    const aLen = gh * Math.min(1, p.maxHp / G.armorCap);
    const aFill = aLen * Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    g.fillStyle(0x000000, 0.5).fillRect(ax - 2, gy + gh - aLen - 2, w + 4, aLen + 4);
    g.fillStyle(0x5fe08a, 0.9).fillRect(ax, gy + gh - aFill, w, aFill);
    g.lineStyle(1, 0x000000, 0.6);
    for (let v = 25; v < p.maxHp; v += 25) {
      const yy = gy + gh - (aLen * v) / p.maxHp;
      g.lineBetween(ax, yy, ax + w, yy); // деления по 25 брони
    }
    this.armorLabel.setPosition(ax - 2, gy + gh + 4);
    // Ход
    const r = p.stats.maxSpeed / PLAYER.maxSpeed;
    const frac = Math.max(0.06, Math.min(1, (r - 1) / (G.speedCap - 1)));
    const sx = width - 6 - w;
    const boosted = r >= G.boostAt;
    g.fillStyle(0x000000, 0.5).fillRect(sx - 2, gy - 2, w + 4, gh + 4);
    g.fillStyle(boosted ? 0xffa030 : 0x7fe3ff, 0.9).fillRect(sx, gy + gh * (1 - frac), w, gh * frac);
    const mark = gy + gh * (1 - (G.boostAt - 1) / (G.speedCap - 1));
    g.lineStyle(2, 0xffa030, 0.9).lineBetween(sx - 3, mark, sx + w + 3, mark); // отметка форсажа
    this.speedLabel.setPosition(width - 4, gy + gh + 4).setText(boosted ? t('gaugeBoost') : t('gaugeSpeed'));
  }
}
