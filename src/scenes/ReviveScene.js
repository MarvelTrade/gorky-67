import * as Phaser from 'phaser';
import { RUN } from '../config.js';
import { t } from '../i18n/index.js';
import { platform } from '../platform/platform.js';
import { onTap } from '../ui/tap.js';
import { KeyNav } from '../ui/keyNav.js';
import { FONT, INK, BTN, RED, makeSheet, drawSheet, makeStamp } from '../ui/paper.js';

// Экран смерти с предложением «Воскреснуть» за просмотр рекламы — один раз за забег.
// Запускается поверх приостановленной GameScene. data: { onRevive(), onGiveUp() }
// Оформление — как пауза и итоги: бланк «акта о повреждении» и красный штамп «Сбит».
// Кнопка прямо говорит, что будет реклама и что дадут (требование 4.5.1);
// отказ сразу ведёт к итогам, награда ничего не блокирует (4.5.2).
export class ReviveScene extends Phaser.Scene {
  constructor() {
    super('ReviveScene');
  }

  create(data) {
    this.cb = data;
    this.ready = false;
    this.busy = false;
    this.time.delayedCall(RUN.gameOverInputDelay * 1000, () => (this.ready = true));

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.6).setOrigin(0);
    this.sheet = makeSheet(this);
    this.stamp = makeStamp(this, t('lose').toUpperCase(), 34, RED, -5);
    this.offer = this.add
      .text(0, 0, t('reviveOffer'), { fontFamily: FONT, fontSize: '17px', color: INK, align: 'center', lineSpacing: 4 })
      .setOrigin(0.5, 0);

    this.reviveBtn = this.button(t('reviveBtn'), BTN.main, () => this.revive());
    this.giveUpBtn = this.button(t('giveUp'), BTN.quiet, () => this.giveUp());
    this.status = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#8a2a1e', align: 'center' })
      .setOrigin(0.5, 0);

    // Клавиатура: ↑/↓ — «Реклама → воскреснуть» или «Завершить», Enter или пробел — нажать
    this.nav = new KeyNav(this, () => this.ready && !this.busy);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  button(text, style, onClick) {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 10, 56, style.fill).setStrokeStyle(3, style.stroke);
    const label = this.add
      .text(0, 0, text, { fontFamily: 'sans-serif', fontSize: '21px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    c.add([bg, label]);
    Object.assign(c, { bg, label });
    bg.setInteractive({ useHandCursor: true });
    onTap(bg, () => this.ready && !this.busy, onClick);
    return c;
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(400, width - 32);
    this.overlay.setSize(width, height);
    this.offer.setWordWrapWidth(w - 40);
    // Бланк: штамп, вопрос, строка статуса рекламы; кнопки — под бланком, как на итогах
    const sheetH = 30 + this.stamp.label.height + 18 + this.offer.height + 44;
    const btnH = 56 + 14 + 56;
    let y = Math.max(12, (height - sheetH - 20 - btnH) / 2);
    const left = (width - w) / 2;
    drawSheet(this.sheet, left, y, w, sheetH, { header: 0, rule: 0 });
    this.stamp.setPosition(width / 2, y + 24 + this.stamp.label.height / 2);
    this.offer.setPosition(width / 2, y + 30 + this.stamp.label.height + 14);
    this.status.setPosition(width / 2, this.offer.y + this.offer.height + 10).setWordWrapWidth(w - 40);
    y += sheetH + 20;
    for (const btn of [this.reviveBtn, this.giveUpBtn]) {
      btn.setPosition(width / 2, y + 28);
      btn.bg.setSize(w, 56);
      btn.bg.input.hitArea.setSize(w, 56);
      y += 56 + 14;
    }
    this.nav?.setItems([
      { obj: this.reviveBtn, activate: () => this.revive() },
      { obj: this.giveUpBtn, activate: () => this.giveUp() },
    ]);
  }

  async revive() {
    if (!this.ready || this.busy) return;
    this.busy = true;
    this.status.setText(t('adLoading'));
    const rewarded = await platform.showRewardedAd();
    if (rewarded) {
      this.scene.stop();
      this.cb.onRevive();
      return;
    }
    // Реклама не показалась или её закрыли раньше — остаётся только завершить
    this.status.setText(t('adFailed'));
    this.reviveBtn.setVisible(false);
    this.busy = false;
  }

  giveUp() {
    if (!this.ready || this.busy) return;
    this.busy = true;
    this.scene.stop();
    this.cb.onGiveUp();
  }
}
