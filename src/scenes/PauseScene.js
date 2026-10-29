import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { onTap } from '../ui/tap.js';

const INPUT_DELAY = 250; // мс — чтобы палец, нажавший «пауза», не нажал сразу кнопку под собой

// Пауза поверх приостановленной GameScene. data: { onResume(), onQuit() }
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(data) {
    this.cb = data;
    this.ready = false;
    this.done = false;
    this.time.delayedCall(INPUT_DELAY, () => (this.ready = true));

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.6).setOrigin(0).setInteractive();
    this.title = this.add
      .text(0, 0, t('pause'), { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffe066', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.resumeBtn = this.button(t('resume'), 0x6b8f3a, 0xc8e08a, () => this.finish('onResume'));
    this.quitBtn = this.button(t('quitToMenu'), 0x3a3f36, 0x6a7060, () => this.finish('onQuit'));

    // Esc и P снимают паузу так же, как ставят
    this.input.keyboard.on('keydown-ESC', () => this.ready && this.finish('onResume'));
    this.input.keyboard.on('keydown-P', () => this.ready && this.finish('onResume'));

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
    c.bg = bg;
    bg.setInteractive({ useHandCursor: true });
    onTap(bg, () => this.ready && !this.done, onClick);
    return c;
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(320, width - 40);
    this.overlay.setSize(width, height);
    this.overlay.input.hitArea.setSize(width, height);
    this.title.setPosition(width / 2, height * 0.32);
    for (const [btn, y] of [
      [this.resumeBtn, height * 0.5],
      [this.quitBtn, height * 0.5 + 80],
    ]) {
      btn.setPosition(width / 2, y);
      btn.bg.setSize(w, 60);
      btn.bg.input.hitArea.setSize(w, 60);
    }
  }

  finish(which) {
    if (this.done) return;
    this.done = true;
    this.scene.stop();
    this.cb[which]();
  }
}
