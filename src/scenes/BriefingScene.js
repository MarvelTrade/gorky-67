import * as Phaser from 'phaser';
import { BRIEFING } from '../config.js';
import { t } from '../i18n/index.js';

// Телеграмма перед забегом. Текст «печатается»; первый тап допечатывает сразу,
// следующий — запускает забег.
export class BriefingScene extends Phaser.Scene {
  constructor() {
    super('BriefingScene');
  }

  create() {
    this.full = t('telegram');
    this.shown = 0;
    this.ready = false;
    this.time.delayedCall(BRIEFING.inputDelay * 1000, () => (this.ready = true));

    this.card = this.add.rectangle(0, 0, 10, 10, 0xe6dcc0).setStrokeStyle(2, 0x8a7a5a);
    this.header = this.add
      .text(0, 0, t('telegramHeader'), { fontFamily: 'monospace', fontSize: '14px', color: '#5a4a32' })
      .setOrigin(0, 0);
    // Штамп «СЕКРЕТНО»: текст в рамке, повёрнутые вместе
    const stampText = this.add
      .text(0, 0, t('telegramStamp'), {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#b03024',
        fontStyle: 'bold',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(1, 0);
    const frame = this.add
      .rectangle(0, 0, stampText.width, stampText.height)
      .setOrigin(1, 0)
      .setStrokeStyle(2, 0xb03024);
    this.stamp = this.add.container(0, 0, [frame, stampText]).setAngle(-6);
    this.bodyText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '16px', color: '#2a2418', lineSpacing: 6 })
      .setOrigin(0, 0);
    this.hint = this.add
      .text(0, 0, t('tapToContinue'), { fontFamily: 'sans-serif', fontSize: '15px', color: '#9fb08f' })
      .setOrigin(0.5)
      .setVisible(false);
    this.tweens.add({ targets: this.hint, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });

    this.input.on('pointerup', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    this.input.keyboard.on('keydown-SPACE', () => this.advance());

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    const { width, height } = this.scale;
    const cw = Math.min(560, width - 32);
    const pad = 18;
    // На узком экране шрифт чуть меньше, чтобы телеграмма влезла без прокрутки
    this.bodyText.setFontSize(width < 420 ? 14 : 16);
    this.bodyText.setWordWrapWidth(cw - pad * 2);
    // Высоту считаем по полному тексту, чтобы карточка не росла во время печати
    const typed = this.bodyText.text;
    this.bodyText.setText(this.full);
    const bodyH = this.bodyText.height;
    this.bodyText.setText(typed);

    const ch = bodyH + 70;
    const cx = width / 2;
    const cy = height * 0.45;
    const left = cx - cw / 2;
    const top = cy - ch / 2;
    this.card.setPosition(cx, cy).setSize(cw, ch);
    this.header.setPosition(left + pad, top + 14);
    this.stamp.setPosition(left + cw - pad, top + 10);
    this.bodyText.setPosition(left + pad, top + 48);
    this.hint.setPosition(cx, top + ch + 34);
  }

  update(time, delta) {
    if (this.shown >= this.full.length) return;
    this.shown = Math.min(this.full.length, this.shown + (BRIEFING.typeSpeed * delta) / 1000);
    this.bodyText.setText(this.full.slice(0, Math.floor(this.shown)));
    if (this.shown >= this.full.length) this.hint.setVisible(true);
  }

  advance() {
    if (!this.ready) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.bodyText.setText(this.full);
      this.hint.setVisible(true);
      return;
    }
    this.ready = false;
    this.scene.start('GameScene');
  }
}
