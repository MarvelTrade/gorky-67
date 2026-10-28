import * as Phaser from 'phaser';
import { RUN } from '../config.js';
import { t } from '../i18n/index.js';
import { platform } from '../platform/platform.js';

// Экран смерти с предложением «Воскреснуть» за просмотр рекламы — один раз за забег.
// Запускается поверх приостановленной GameScene. data: { onRevive(), onGiveUp() }
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

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.7).setOrigin(0);
    this.title = this.add
      .text(0, 0, t('lose'), { fontFamily: 'sans-serif', fontSize: '42px', color: '#ff6a5a', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.offer = this.add
      .text(0, 0, t('reviveOffer'), { fontFamily: 'sans-serif', fontSize: '18px', color: '#e8f0d8', align: 'center' })
      .setOrigin(0.5);

    this.reviveBtn = this.button(t('reviveBtn'), 0x6b8f3a, 0xc8e08a, () => this.revive());
    this.giveUpBtn = this.button(t('giveUp'), 0x3a3f36, 0x6a7060, () => this.giveUp());
    this.status = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffb0a0' })
      .setOrigin(0.5);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  button(text, fill, stroke, onClick) {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 10, 60, fill).setStrokeStyle(3, stroke);
    const label = this.add
      .text(0, 0, text, { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    c.add([bg, label]);
    Object.assign(c, { bg, label });
    bg.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
    return c;
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(380, width - 40);
    this.overlay.setSize(width, height);
    this.title.setPosition(width / 2, height * 0.24);
    this.offer.setPosition(width / 2, height * 0.24 + 56).setWordWrapWidth(w);
    for (const [btn, y] of [
      [this.reviveBtn, height * 0.5],
      [this.giveUpBtn, height * 0.5 + 80],
    ]) {
      btn.setPosition(width / 2, y);
      btn.bg.setSize(w, 60);
      btn.bg.input.hitArea.setSize(w, 60);
    }
    this.status.setPosition(width / 2, height * 0.5 + 135);
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
