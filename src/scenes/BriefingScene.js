import * as Phaser from 'phaser';
import { BRIEFING } from '../config.js';
import { t } from '../i18n/index.js';
import { FONT, INK, INK_SOFT, makeSheet, drawSheet, makeStamp } from '../ui/paper.js';

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

    // Бланк телеграммы — тот же лист, что в меню: тень, красная черта под шапкой, линовка
    this.sheet = makeSheet(this);
    this.header = this.add
      .text(0, 0, t('telegramHeader'), { fontFamily: FONT, fontSize: '14px', color: INK_SOFT, fontStyle: 'bold' })
      .setOrigin(0, 0)
      .setLetterSpacing(2);
    this.number = this.add
      .text(0, 0, t('telegramNo'), { fontFamily: FONT, fontSize: '12px', color: INK_SOFT })
      .setOrigin(0, 0);
    // Штамп «СЕКРЕТНО» — как на карточке меню
    this.stamp = makeStamp(this, t('telegramStamp'), 16, undefined, -6);
    this.bodyText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: INK, lineSpacing: 6 })
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
    drawSheet(this.sheet, left, top, cw, ch, { header: 38, rule: this.bodyText.style.fontSize === '14px' ? 23 : 25 });
    this.header.setPosition(left + pad, top + 10);
    // Номер — под шапкой мелко; штамп справа, центр штампа — где был правый верхний угол
    this.number.setPosition(left + pad + this.header.width + 12, top + 12);
    this.stamp.setPosition(left + cw - pad - this.stamp.label.width / 2, top + 10 + this.stamp.label.height / 2);
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
