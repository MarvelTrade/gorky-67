import * as Phaser from 'phaser';
import { RUN } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n.js';

const PAD = 12;
const XP_BAR_H = 10;
const HP_BAR_W = 180;
const HP_BAR_H = 14;

// HUD поверх GameScene: полоска опыта с уровнем, HP, оставшееся время.
// Только читает состояние GameScene, ничего в нём не меняет.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gs = this.scene.get('GameScene');

    this.bars = this.add.graphics();
    const style = { fontFamily: 'sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.levelText = this.add.text(0, 0, '', { ...style, fontSize: '16px', fontStyle: 'bold' });
    this.hpText = this.add.text(0, 0, '', { ...style, fontSize: '13px', strokeThickness: 3 }).setOrigin(0.5);
    this.timerText = this.add.text(0, 0, '', { ...style, fontSize: '28px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.fpsText = import.meta.env.DEV
      ? this.add.text(0, 0, '', { ...style, fontSize: '12px', strokeThickness: 3 }).setOrigin(1, 0)
      : null;
  }

  update() {
    const gs = this.gs;
    if (!gs.player) return;
    const { width } = this.scale;
    const p = gs.player;
    const g = this.bars;
    g.clear();

    // Опыт — тонкая полоса во всю ширину сверху
    g.fillStyle(0x000000, 0.5);
    g.fillRect(0, 0, width, XP_BAR_H);
    g.fillStyle(0x4fd8ff);
    g.fillRect(0, 0, width * Math.min(1, gs.xp / gs.xpNext), XP_BAR_H);

    // HP — слева под полосой опыта
    const hpY = XP_BAR_H + PAD + 22;
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    g.fillStyle(0x000000, 0.55);
    g.fillRect(PAD - 2, hpY - 2, HP_BAR_W + 4, HP_BAR_H + 4);
    g.fillStyle(hpFrac > 0.5 ? 0x6cc04a : hpFrac > 0.25 ? 0xe0b030 : 0xe04030);
    g.fillRect(PAD, hpY, HP_BAR_W * hpFrac, HP_BAR_H);

    this.levelText.setPosition(PAD, XP_BAR_H + 6).setText(`${t('level')} ${gs.level}`);
    this.hpText.setPosition(PAD + HP_BAR_W / 2, hpY + HP_BAR_H / 2).setText(`${Math.ceil(p.hp)} / ${p.maxHp}`);

    // Таймер — сколько осталось продержаться; последние 30 с краснеет
    const left = RUN.duration - gs.spawner.elapsed;
    this.timerText
      .setPosition(width / 2, XP_BAR_H + 6)
      .setText(formatTime(Math.ceil(left)))
      .setColor(left <= 30 ? '#ff6a5a' : '#ffffff');

    if (this.fpsText) {
      this.fpsText.setPosition(width - PAD, XP_BAR_H + 6).setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
    }
  }
}
