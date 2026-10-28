import * as Phaser from 'phaser';
import { RUN, CONTROLS, RADIO } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n/index.js';

const PAD = 12;
const XP_BAR_H = 10;
const HP_BAR_W = 180;
const HP_BAR_H = 14;
const BOSS_BAR_H = 12;

// HUD поверх GameScene: полоска опыта с уровнем, HP, оставшееся время.
// Только читает состояние GameScene, ничего в нём не меняет.
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gs = this.scene.get('GameScene');

    this.bars = this.add.graphics();
    this.stick = this.add.graphics();

    // Радио «Берёзы»: позывной и одна строка
    this.radioWave = -1;
    this.radioLeft = 0;
    this.radio = this.add.container(0, 0).setAlpha(0);
    this.radioBg = this.add.graphics();
    this.radioCall = this.add.text(0, 0, t('radioCallsign'), {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#d8f040',
      fontStyle: 'bold',
    });
    this.radioText = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff' });
    this.radio.add([this.radioBg, this.radioCall, this.radioText]);
    const style = { fontFamily: 'sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.levelText = this.add.text(0, 0, '', { ...style, fontSize: '16px', fontStyle: 'bold' });
    this.hpText = this.add.text(0, 0, '', { ...style, fontSize: '13px', strokeThickness: 3 }).setOrigin(0.5);
    this.timerText = this.add.text(0, 0, '', { ...style, fontSize: '28px', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.bossText = this.add
      .text(0, 0, t('boss'), { ...style, fontSize: '14px', strokeThickness: 3, color: '#ffb0a0' })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.fpsText = import.meta.env.DEV
      ? this.add.text(0, 0, '', { ...style, fontSize: '12px', strokeThickness: 3 }).setOrigin(1, 0)
      : null;
  }

  update(time, delta) {
    const gs = this.gs;
    if (!gs.player) return;
    this.updateRadio(gs, delta / 1000);
    const { width } = this.scale;
    const p = gs.player;
    const g = this.bars;
    g.clear();

    // Опыт — тонкая полоса во всю ширину сверху
    g.fillStyle(0x000000, 0.5);
    g.fillRect(0, 0, width, XP_BAR_H);
    g.fillStyle(0x4fd8ff);
    g.fillRect(0, 0, width * Math.min(1, gs.xp / gs.xpNext), XP_BAR_H);

    // HP — слева под полосой опыта; на узком экране короче, чтобы не наезжать на таймер
    const hpW = Math.min(HP_BAR_W, width / 2 - 50);
    const hpY = XP_BAR_H + PAD + 22;
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    g.fillStyle(0x000000, 0.55);
    g.fillRect(PAD - 2, hpY - 2, hpW + 4, HP_BAR_H + 4);
    g.fillStyle(hpFrac > 0.5 ? 0x6cc04a : hpFrac > 0.25 ? 0xe0b030 : 0xe04030);
    g.fillRect(PAD, hpY, hpW * hpFrac, HP_BAR_H);

    this.levelText.setPosition(PAD, XP_BAR_H + 6).setText(`${t('level')} ${gs.level}`);
    this.hpText.setPosition(PAD + hpW / 2, hpY + HP_BAR_H / 2).setText(`${Math.ceil(p.hp)} / ${p.maxHp}`);

    // Таймер — сколько осталось продержаться; последние 30 с краснеет
    const left = RUN.duration - gs.spawner.elapsed;
    this.timerText
      .setPosition(width / 2, XP_BAR_H + 6)
      .setText(formatTime(Math.ceil(left)))
      .setColor(left <= 30 ? '#ff6a5a' : '#ffffff');

    // HP босса — под таймером, пока он жив
    const boss = gs.boss;
    const showBoss = !!boss && boss.active;
    this.bossText.setVisible(showBoss);
    if (showBoss) {
      const bw = Math.min(400, width - 2 * PAD);
      const bx = (width - bw) / 2;
      const by = XP_BAR_H + 78;
      const frac = Math.max(0, boss.hp / boss.cfg.hp);
      g.fillStyle(0x000000, 0.6);
      g.fillRect(bx - 2, by - 2, bw + 4, BOSS_BAR_H + 4);
      g.fillStyle(0xd04030);
      g.fillRect(bx, by, bw * frac, BOSS_BAR_H);
      this.bossText.setPosition(width / 2, by - 3);
    }

    this.drawStick(p.stick);

    if (this.fpsText) {
      this.fpsText.setPosition(width - PAD, XP_BAR_H + 6).setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
    }
  }

  // Плавающий джойстик под пальцем: кольцо в точке касания и «шляпка», куда тянешь
  drawStick(stick) {
    const g = this.stick;
    g.clear();
    if (!stick || stick.x === undefined) return;
    const r = CONTROLS.stickRadius;
    let dx = stick.x - stick.ax;
    let dy = stick.y - stick.ay;
    const len = Math.hypot(dx, dy);
    if (len > r) {
      dx = (dx / len) * r;
      dy = (dy / len) * r;
    }
    g.lineStyle(3, 0xffffff, 0.35);
    g.strokeCircle(stick.ax, stick.ay, r);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(stick.ax + dx, stick.ay + dy, 22);
  }

  // Новая волна — новая реплика. Опрашиваем номер волны, а не ловим событие:
  // первая волна стартует раньше, чем эта сцена успевает подписаться.
  // Пока игра на паузе (выбор улучшения), реплика не тратит своё время.
  updateRadio(gs, dt) {
    const wave = gs.spawner.waveIndex;
    if (wave >= 0 && wave !== this.radioWave) {
      this.radioWave = wave;
      this.showRadio(t(`radio_${wave + 1}`));
    }
    if (this.radioLeft <= 0 || gs.scene.isPaused()) return;
    this.radioLeft -= dt;
    const total = RADIO.duration + RADIO.fade * 2;
    const passed = total - this.radioLeft;
    this.radio.setAlpha(Math.max(0, Math.min(1, passed / RADIO.fade, this.radioLeft / RADIO.fade)));
  }

  showRadio(line) {
    const { width } = this.scale;
    const w = Math.min(440, width - 2 * PAD);
    const pad = 10;
    this.radioText.setText(line).setWordWrapWidth(w - pad * 2 - 6);
    this.radioCall.setPosition(pad + 6, pad - 2);
    this.radioText.setPosition(pad + 6, pad + 14);
    const h = this.radioText.height + pad * 2 + 14;
    this.radioBg
      .clear()
      .fillStyle(0x0c100a, 0.78)
      .fillRoundedRect(0, 0, w, h, 6)
      .fillStyle(0xd8f040)
      .fillRect(0, 0, 4, h);
    // Под полоской босса, чтобы не перекрывать её на 5-й волне
    this.radio.setPosition((width - w) / 2, XP_BAR_H + 100);
    this.radioLeft = RADIO.duration + RADIO.fade * 2;
  }
}
