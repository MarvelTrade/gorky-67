import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { onTap } from '../ui/tap.js';
import { formatTime } from '../format.js';
import { FONT, INK, INK_SOFT, BTN, makeSheet, drawSheet } from '../ui/paper.js';

const INPUT_DELAY = 250; // мс — чтобы палец, нажавший «пауза», не нажал сразу кнопку под собой

// Оформление — лист бортового журнала: бумага с грифом, машинописный заголовок, кнопки как в меню.
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
    this.sheet = makeSheet(this);
    this.header = this.add.text(0, 0, t('pauseHeader'), { fontFamily: FONT, fontSize: '11px', color: INK_SOFT }).setOrigin(0, 0);
    this.title = this.add
      .text(0, 0, t('pause').toUpperCase(), { fontFamily: FONT, fontSize: '40px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setLetterSpacing(3);
    this.resumeBtn = this.button(t('resume'), BTN.main.fill, BTN.main.stroke, () => this.finish('onResume'));
    this.settingsBtn = this.button(t('settings'), BTN.plain.fill, BTN.plain.stroke, () => this.openSettings());
    this.quitBtn = this.button(t('quitToMenu'), BTN.quiet.fill, BTN.quiet.stroke, () => this.finish('onQuit'));
    this.info = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: INK, align: 'center', lineSpacing: 6 })
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
    // Шаг — от высоты кнопки, а не от экрана: лёжа (375 px) шаг был 44 при кнопках 60 — налезали
    const low = height < 500;
    const btnH = low ? 44 : 60;
    const step = btnH + (low ? 8 : 14);
    this.title.setFontSize(low ? 30 : 40);
    const titleH = this.title.height;
    // Заголовок, три кнопки и строка итогов — блоком по центру
    const block = titleH + 10 + step * 3 + 50;
    const top = Math.max(8, (height - block) / 2);
    this.title.setPosition(width / 2, top + titleH / 2);
    const first = top + titleH + 10 + btnH / 2;
    [this.resumeBtn, this.settingsBtn, this.quitBtn].forEach((btn, i) => {
      btn.setPosition(width / 2, first + i * step);
      btn.bg.setSize(w, btnH);
      btn.bg.input.hitArea.setSize(w, btnH);
    });
    // Лист под всем блоком; лёжа шире кнопок, чтобы итоги не росли в высоту
    const sw = low ? Math.min(width - 24, 560) : Math.min(width - 16, w + 40);
    this.info.setWordWrapWidth(sw - 24).setPosition(width / 2, first + 2 * step + btnH / 2 + 10);
    const headRoom = top >= 26; // гриф сверху — если есть место над заголовком
    const sTop = headRoom ? top - 24 : Math.max(2, top - 6);
    const sBottom = Math.min(height - 4, this.info.y + this.info.height + 12);
    drawSheet(this.sheet, (width - sw) / 2, sTop, sw, sBottom - sTop, { header: headRoom ? 20 : 0, rule: 0 });
    this.header.setVisible(headRoom).setPosition((width - sw) / 2 + 10, sTop + 5);
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
