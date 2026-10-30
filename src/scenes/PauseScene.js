import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { onTap } from '../ui/tap.js';
import { formatTime } from '../format.js';

const INPUT_DELAY = 250; // мс — чтобы палец, нажавший «пауза», не нажал сразу кнопку под собой

// Пауза поверх приостановленной GameScene: продолжить, настройки, выйти; ниже — время, убитые
// и взятые улучшения. data: { taken: ['Калибр 2', …], time, kills, onResume(), onQuit() }
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
    this.settingsBtn = this.button(t('settings'), 0x3a4148, 0x8a949c, () => this.openSettings());
    this.quitBtn = this.button(t('quitToMenu'), 0x3a3f36, 0x6a7060, () => this.finish('onQuit'));
    this.info = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#b8c0c8', align: 'center', lineSpacing: 6 })
      .setOrigin(0.5, 0);
    this.showInfo();

    // Esc и P снимают паузу так же, как ставят (если не открыты настройки — там Esc закрывает их)
    this.input.keyboard.on('keydown-ESC', () => this.ready && !this.inSettings && this.finish('onResume'));
    this.input.keyboard.on('keydown-P', () => this.ready && !this.inSettings && this.finish('onResume'));

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
    onTap(bg, () => this.ready && !this.done && !this.inSettings, onClick);
    return c;
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(320, width - 40);
    this.overlay.setSize(width, height);
    this.overlay.input.hitArea.setSize(width, height);
    const step = Math.min(74, height * 0.12);
    const top = Math.max(40, height * 0.5 - step * 2.2);
    this.title.setPosition(width / 2, top);
    for (const [btn, y] of [
      [this.resumeBtn, top + step],
      [this.settingsBtn, top + step * 2],
      [this.quitBtn, top + step * 3],
    ]) {
      btn.setPosition(width / 2, y);
      btn.bg.setSize(w, 60);
      btn.bg.input.hitArea.setSize(w, 60);
    }
    this.info.setWordWrapWidth(width - 40).setPosition(width / 2, top + step * 3 + 44);
  }

  showInfo() {
    const d = this.cb;
    const taken = d.taken?.length ? d.taken.join(' · ') : t('noneYet');
    this.info.setText(`${t('time')}: ${formatTime(d.time ?? 0)}   ${t('kills')}: ${d.kills ?? 0}
${t('upgradesTaken')}: ${taken}`);
  }

  // Настройки поверх паузы; язык сменился — перерисовать паузу
  openSettings() {
    this.inSettings = true;
    this.scene.launch('SettingsScene', {
      onClose: (langChanged) => {
        this.inSettings = false;
        if (langChanged) this.scene.restart(this.cb);
      },
    });
  }

  finish(which) {
    if (this.done) return;
    this.done = true;
    this.scene.stop();
    this.cb[which]();
  }
}
