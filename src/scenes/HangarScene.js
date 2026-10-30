import * as Phaser from 'phaser';
import { HANGAR, LEVELUP } from '../config.js';
import { t } from '../i18n/index.js';
import { meta, level, price, canBuy, buy } from '../meta.js';
import { sfx } from '../systems/Sfx.js';
import { onTap } from '../ui/tap.js';

const ROW_H = 58;
const MAX_W = 520;

// «Ангар»: постоянные улучшения за рубли и запчасти со складов. Строка — название, описание,
// уровень точками и кнопка с ценой. Нет денег — кнопка тусклая. data: { from } — куда «Назад»
export class HangarScene extends Phaser.Scene {
  constructor() {
    super('HangarScene');
  }

  create(data) {
    this.from = data?.from ?? 'MenuScene';
    const style = { fontFamily: 'sans-serif', color: '#ffffff' };
    this.title = this.add.text(0, 0, t('hangar'), { ...style, fontSize: '34px', fontStyle: 'bold', color: '#e8f0d8' }).setOrigin(0.5, 0);
    this.wallet = this.add.text(0, 0, '', { ...style, fontSize: '20px', color: '#f2c94c', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.hint = this.add.text(0, 0, t('hangarHint'), { ...style, fontSize: '14px', color: '#9fb08f', align: 'center' }).setOrigin(0.5, 0);

    this.rows = Object.keys(HANGAR.items).map((id) => this.makeRow(id));

    this.back = this.add
      .text(0, 0, t('back'), { ...style, fontSize: '20px', color: '#c8d8b0', padding: { x: 14, y: 10 } })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    onTap(this.back, () => true, () => this.scene.start(this.from === 'GameOverScene' ? 'GameScene' : 'MenuScene'));
    // Из итогов «Назад» — сразу следующий забег: потратил и полетел
    if (this.from === 'GameOverScene') this.back.setText(`${t('again')} →`);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this.layout();
    this.refresh();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  makeRow(id) {
    const row = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 10, ROW_H - 6, LEVELUP.cardFill, 0.96).setOrigin(0, 0.5);
    const name = this.add.text(0, -12, t(`hangar_${id}`), { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const desc = this.add.text(0, 10, t(`hangar_${id}_desc`), { fontFamily: 'sans-serif', fontSize: '12px', color: '#b8c0c8' }).setOrigin(0, 0.5);
    const pips = this.add.graphics();
    const btn = this.add.rectangle(0, 0, 120, ROW_H - 16, 0x6b8f3a).setOrigin(1, 0.5).setStrokeStyle(2, 0xc8e08a);
    const cost = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    row.add([bg, name, desc, pips, btn, cost]);
    Object.assign(row, { id, bg, name, desc, pips, btn, cost });
    btn.setInteractive({ useHandCursor: true });
    onTap(btn, () => canBuy(id), () => {
      if (!buy(id)) return;
      sfx.play('levelUp');
      this.tweens.add({ targets: row, scale: { from: 1.04, to: 1 }, duration: 180, ease: 'Back.Out' });
      this.refresh();
    });
    return row;
  }

  refresh() {
    this.wallet.setText(`₽ ${meta.money}   ⚙ ${meta.parts}`);
    for (const r of this.rows) {
      const p = price(r.id);
      const ok = canBuy(r.id);
      r.cost.setText(p ? `${p.money} ₽${p.parts ? `  ${p.parts} ⚙` : ''}` : t('maxed'));
      r.btn.setFillStyle(p ? (ok ? 0x6b8f3a : 0x3a4148) : 0x2a2f33).setStrokeStyle(2, ok ? 0xc8e08a : 0x59626a);
      r.cost.setColor(ok || !p ? '#ffffff' : '#8a949c');
      this.drawPips(r);
    }
  }

  drawPips(r) {
    const max = HANGAR.items[r.id].max;
    const lv = level(r.id);
    const g = r.pips.clear();
    for (let k = 0; k < max; k++) {
      const x = r.pipsX + k * 13;
      if (k < lv) g.fillStyle(0x5fe08a, 1).fillCircle(x, 0, 4.5);
      else g.lineStyle(1.5, 0x6c7680, 1).strokeCircle(x, 0, 4);
    }
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(MAX_W, width - 24);
    const x0 = (width - w) / 2;
    let y = Math.max(16, height * 0.05);
    this.title.setPosition(width / 2, y);
    y += this.title.height + 4;
    this.wallet.setPosition(width / 2, y);
    y += this.wallet.height + 8;
    this.hint.setWordWrapWidth(w).setPosition(width / 2, y);
    y += this.hint.height + 14;
    const btnW = Math.min(130, w * 0.32);
    for (const r of this.rows) {
      r.setPosition(x0, y + ROW_H / 2);
      r.bg.setSize(w, ROW_H - 6);
      r.name.setX(12);
      r.desc.setX(12).setWordWrapWidth(w - btnW - 110);
      r.btn.setSize(btnW, ROW_H - 16).setPosition(w - 8, 0);
      r.btn.input.hitArea.setSize(btnW, ROW_H - 16);
      r.cost.setPosition(w - 8 - btnW / 2, 0);
      // Точки уровня — между описанием и кнопкой
      r.pipsX = w - btnW - 20 - (HANGAR.items[r.id].max - 1) * 13;
      this.drawPips(r);
      y += ROW_H;
    }
    this.back.setPosition(width / 2, Math.min(y + 8, height - 50));
  }
}
