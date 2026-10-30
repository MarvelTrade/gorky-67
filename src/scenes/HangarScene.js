import * as Phaser from 'phaser';
import { HANGAR, HELI, LIVERIES, GEAR, LEVELUP } from '../config.js';
import { t } from '../i18n/index.js';
import {
  meta, level, price, canBuy, buy, heliLevel, heliProgress, slots,
  liveryUnlocked, setLivery, liveryTint, gearUnlocked, toggleGear,
} from '../meta.js';
import { sfx } from '../systems/Sfx.js';
import { onTap } from '../ui/tap.js';

const ROW_H = 52;
const MAX_W = 520;
const TABS = ['upgrades', 'gear', 'livery'];

// «Ангар»: сверху вертолёт в выбранной окраске, его уровень и полоска опыта; ниже — вкладки:
// улучшения за рубли и запчасти, снаряжение в ячейки (как в DRG: Survivor), окраска.
// data: { from } — откуда пришли: из итогов «Назад» значит «Ещё раз»
export class HangarScene extends Phaser.Scene {
  constructor() {
    super('HangarScene');
  }

  create(data) {
    this.from = data?.from ?? 'MenuScene';
    this.tab = data?.tab ?? 'upgrades';
    const style = { fontFamily: 'sans-serif', color: '#ffffff' };
    this.title = this.add.text(0, 0, t('hangar'), { ...style, fontSize: '30px', fontStyle: 'bold', color: '#e8f0d8' }).setOrigin(0.5, 0);
    this.wallet = this.add.text(0, 0, '', { ...style, fontSize: '18px', color: '#f2c94c', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Вертолёт на площадке: круг-подложка, корпус в окраске, винт крутится
    this.pad = this.add.graphics();
    this.heli = this.add.image(0, 0, 'heli').setAngle(-90);
    this.rotor = this.add.image(0, 0, 'rotor');
    this.heliLv = this.add.text(0, 0, '', { ...style, fontSize: '18px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.heliName = this.add.text(0, 0, t('heliName'), { ...style, fontSize: '13px', color: '#9fb08f' }).setOrigin(0, 0.5);
    this.xpBar = this.add.graphics();

    this.tabBtns = TABS.map((id) => {
      const b = this.add
        .text(0, 0, t(`tab_${id}`), { ...style, fontSize: '16px', fontStyle: 'bold', padding: { x: 10, y: 8 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      onTap(b, () => true, () => {
        this.tab = id;
        this.buildRows();
      });
      b.tabId = id;
      return b;
    });
    this.info = this.add.text(0, 0, '', { ...style, fontSize: '13px', color: '#9fb08f', align: 'center' }).setOrigin(0.5, 0);

    this.back = this.add
      .text(0, 0, '', { ...style, fontSize: '20px', color: '#c8d8b0', padding: { x: 14, y: 10 } })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    // Из итогов — сразу следующий забег: потратил и полетел
    this.back.setText(this.from === 'GameOverScene' ? `${t('again')} →` : t('back'));
    onTap(this.back, () => true, () => this.scene.start(this.from === 'GameOverScene' ? 'GameScene' : 'MenuScene'));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this.rows = [];
    this.buildRows();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  update(time, delta) {
    this.rotor.rotation += delta * 0.012;
  }

  // Строки текущей вкладки: у каждой название, описание и кнопка справа
  buildRows() {
    for (const r of this.rows) r.destroy();
    const ids = this.tab === 'upgrades' ? Object.keys(HANGAR.items) : this.tab === 'gear' ? Object.keys(GEAR) : LIVERIES.map((l) => l.id);
    this.rows = ids.map((id) => this.makeRow(id));
    this.refresh();
    this.layout();
  }

  makeRow(id) {
    const key = { upgrades: 'hangar', gear: 'gear', livery: 'livery' }[this.tab];
    const row = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 10, ROW_H - 6, LEVELUP.cardFill, 0.96).setOrigin(0, 0.5);
    const name = this.add.text(0, -10, t(`${key}_${id}`), { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const desc = this.add.text(0, 10, t(`${key}_${id}_desc`), { fontFamily: 'sans-serif', fontSize: '12px', color: '#b8c0c8' }).setOrigin(0, 0.5);
    const pips = this.add.graphics();
    const swatch = this.add.graphics(); // окраска: кружок цвета слева
    const btn = this.add.rectangle(0, 0, 120, ROW_H - 14, 0x6b8f3a).setOrigin(1, 0.5);
    const cost = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    row.add([bg, swatch, name, desc, pips, btn, cost]);
    Object.assign(row, { id, bg, name, desc, pips, swatch, btn, cost });
    btn.setInteractive({ useHandCursor: true });
    onTap(btn, () => true, () => this.act(id, row));
    return row;
  }

  act(id, row) {
    const ok = this.tab === 'upgrades' ? buy(id) : this.tab === 'gear' ? toggleGear(id) : setLivery(id);
    if (!ok) return;
    sfx.play(this.tab === 'upgrades' ? 'levelUp' : 'reelStop');
    this.tweens.add({ targets: row, scale: { from: 1.04, to: 1 }, duration: 180, ease: 'Back.Out' });
    this.refresh();
  }

  refresh() {
    this.wallet.setText(`₽ ${meta.money}   ⚙ ${meta.parts}`);
    const lv = heliLevel();
    const max = lv >= HELI.levels.length;
    this.heliLv.setText(`${t('heliLevel')} ${lv}${max ? ` · ${t('heliMax')}` : ''}`);
    const tint = liveryTint();
    if (tint === null) this.heli.clearTint();
    else this.heli.setTint(tint);
    for (const b of this.tabBtns) {
      const on = b.tabId === this.tab;
      b.setColor(on ? '#ffe066' : '#9fb08f').setBackgroundColor(on ? '#2f363d' : '#00000000');
    }
    this.info.setText(this.tab === 'upgrades' ? t('hangarHint') : this.tab === 'gear' ? `${t('slotsUsed')}: ${meta.gear.length} / ${slots()}` : '');

    for (const r of this.rows) {
      let label;
      let state; // 'ok' — можно нажать, 'on' — выбрано/надето, 'off' — нельзя
      if (this.tab === 'upgrades') {
        const p = price(r.id);
        label = p ? `${p.money} ₽${p.parts ? `  ${p.parts} ⚙` : ''}` : t('maxed');
        state = !p ? 'on' : canBuy(r.id) ? 'ok' : 'off';
      } else if (this.tab === 'gear') {
        const on = meta.gear.includes(r.id);
        const need = GEAR[r.id].level;
        if (!gearUnlocked(r.id)) [label, state] = [`🔒 ${t('lockedLv')} ${need}`, 'off'];
        else if (on) [label, state] = [t('takeOff'), 'on'];
        else if (meta.gear.length >= slots()) [label, state] = [t('noSlot'), 'off'];
        else [label, state] = [t('take'), 'ok'];
      } else {
        const L = LIVERIES.find((l) => l.id === r.id);
        if (!liveryUnlocked(r.id)) [label, state] = [`🔒 ${t('lockedLv')} ${L.level}`, 'off'];
        else if (meta.livery === r.id) [label, state] = [t('chosen'), 'on'];
        else [label, state] = [t('choose'), 'ok'];
      }
      r.cost.setText(label).setColor(state === 'off' ? '#8a949c' : '#ffffff');
      r.btn.setFillStyle({ ok: 0x6b8f3a, on: 0x2f5a6b, off: 0x3a4148 }[state]);
      r.btn.setStrokeStyle(2, { ok: 0xc8e08a, on: 0x7fe3ff, off: 0x59626a }[state]);
      r.bg.setStrokeStyle(meta.gear.includes(r.id) && this.tab === 'gear' ? 2 : 0, 0x7fe3ff);
    }
    this.layout();
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(MAX_W, width - 24);
    const x0 = (width - w) / 2;
    const short = height < 560;
    let y = Math.max(10, height * 0.03);
    this.title.setPosition(width / 2, y);
    y += this.title.height;
    this.wallet.setPosition(width / 2, y);
    y += this.wallet.height + 6;

    // Вертолёт слева, уровень и опыт справа от него
    const hs = short ? 1.1 : 1.6;
    const cx = x0 + 60 * hs;
    const cy = y + 38 * hs;
    this.pad.clear().fillStyle(0x2a3326, 1).fillCircle(cx, cy, 38 * hs).lineStyle(2, 0x4a5a3a).strokeCircle(cx, cy, 38 * hs);
    this.pad.lineStyle(2, 0xd8f040, 0.6).strokeCircle(cx, cy, 30 * hs); // «H» площадки — кольцом
    this.heli.setPosition(cx, cy).setScale(hs);
    this.rotor.setPosition(cx, cy).setScale(hs);
    const tx = cx + 48 * hs;
    this.heliLv.setPosition(tx, cy - 16);
    this.heliName.setPosition(tx, cy - 36);
    const bw = Math.max(80, x0 + w - tx);
    this.xpBar.clear().fillStyle(0x000000, 0.5).fillRect(tx, cy + 4, bw, 8).fillStyle(0x4fd8ff).fillRect(tx, cy + 4, bw * heliProgress(), 8);
    y = cy + 40 * hs + 6;

    const tw = w / TABS.length;
    this.tabBtns.forEach((b, i) => b.setPosition(x0 + tw * (i + 0.5), y + 16));
    y += 36;
    this.info.setWordWrapWidth(w).setPosition(width / 2, y);
    y += (this.info.text ? this.info.height : 0) + 8;

    const btnW = Math.min(124, w * 0.3);
    for (const r of this.rows) {
      r.setPosition(x0, y + ROW_H / 2);
      r.bg.setSize(w, ROW_H - 6);
      const left = this.tab === 'livery' ? 40 : 12;
      r.name.setX(left);
      // Описание — сразу под названием, не больше двух строк: на 375 px длинные шли в три и наезжали на название
      const descW = w - btnW - left - (this.tab === 'upgrades' ? 80 : 16);
      let size = 12;
      r.desc.setFontSize(size).setWordWrapWidth(descW);
      while (r.desc.height > 26 && size > 9) r.desc.setFontSize(--size);
      const block = r.name.height + r.desc.height;
      r.name.setOrigin(0, 0).setPosition(left, -block / 2);
      r.desc.setOrigin(0, 0).setPosition(left, -block / 2 + r.name.height);
      r.btn.setSize(btnW, ROW_H - 14).setPosition(w - 6, 0);
      r.btn.input.hitArea.setSize(btnW, ROW_H - 14);
      r.cost.setPosition(w - 6 - btnW / 2, 0);
      this.drawExtras(r, w - btnW - 16);
      y += ROW_H;
    }
    this.back.setPosition(width / 2, Math.min(y + 4, height - 48));
  }

  // Точки уровня у улучшений, цветной кружок у окраски
  drawExtras(r, right) {
    const g = r.pips.clear();
    r.swatch.clear();
    if (this.tab === 'upgrades') {
      const max = HANGAR.items[r.id].max;
      const lv = level(r.id);
      for (let k = 0; k < max; k++) {
        const x = right - (max - 1 - k) * 13;
        if (k < lv) g.fillStyle(0x5fe08a, 1).fillCircle(x, 0, 4.5);
        else g.lineStyle(1.5, 0x6c7680, 1).strokeCircle(x, 0, 4);
      }
    } else if (this.tab === 'livery') {
      const tint = LIVERIES.find((l) => l.id === r.id).tint ?? 0xffffff;
      // Цвет, как он ляжет на корпус: серо-зелёный спрайт × tint
      const c = Phaser.Display.Color.IntegerToColor(tint);
      const base = { r: 0x9a, g: 0xa4, b: 0x96 };
      const mix = Phaser.Display.Color.GetColor((base.r * c.red) / 255, (base.g * c.green) / 255, (base.b * c.blue) / 255);
      r.swatch.fillStyle(mix, 1).fillCircle(20, 0, 11).lineStyle(2, 0xe8f0d8, 0.6).strokeCircle(20, 0, 11);
    }
  }
}
