import * as Phaser from 'phaser';
import { t, getLang, initLang } from '../i18n/index.js';
import { settings, saveSettings } from '../settings.js';
import { sfx } from '../systems/Sfx.js';
import { onTap } from '../ui/tap.js';
import { KeyNav } from '../ui/keyNav.js';
import { FONT, PAPER_DIM, INK, INK_SOFT, PEN, makeSheet, drawSheet } from '../ui/paper.js';

const ROW_H = 58;
const VOLUME_STEP = 0.1;

// Оформление — бланк: лист бумаги, графы с машинописными подписями, значения «вписаны» ручкой.
// Настройки поверх меню или паузы: звук, громкость, тряска экрана, язык.
// Меняется сразу и сохраняется при закрытии. data: { onClose(langChanged) }
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create(data) {
    this.cb = data ?? {};
    this.startLang = getLang();
    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x0e130c, 0.94).setOrigin(0).setInteractive();
    this.sheet = makeSheet(this);
    this.header = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: INK_SOFT }).setOrigin(0, 0);
    this.title = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '32px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setLetterSpacing(2);

    this.rows = [
      this.row(() => t('sound'), () => t(settings.sound ? 'on' : 'off'), () => {
        settings.sound = !settings.sound;
        this.registry.get('applyMute')?.();
      }),
      this.row(() => t('volume'), () => `${Math.round(settings.volume * 100)}%`, null, (dir) => {
        settings.volume = Phaser.Math.Clamp(Math.round((settings.volume + dir * VOLUME_STEP) * 10) / 10, 0, 1);
        sfx.setVolume(settings.volume);
        sfx.play('pickup'); // слышно, какая громкость
      }),
      this.row(() => t('shake'), () => t(settings.shake ? 'on' : 'off'), () => (settings.shake = !settings.shake)),
      this.row(() => t('language'), () => (getLang() === 'ru' ? 'Русский' : 'English'), () => {
        settings.lang = getLang() === 'ru' ? 'en' : 'ru';
        initLang(settings.lang);
      }),
    ];
    // Тестерам: счётчик кадров в игре — замерить телефон без dev-сборки. На Яндексе строки нет
    if (import.meta.env.VITE_PLATFORM !== 'yandex') {
      this.rows.push(this.row(() => t('showFps'), () => t(settings.showFps ? 'on' : 'off'), () => (settings.showFps = !settings.showFps)));
    }

    this.done = this.add
      .text(0, 0, t('done'), { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold', backgroundColor: '#6b8f3a', padding: { x: 28, y: 12 } })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    onTap(this.done, () => true, () => this.close());
    this.input.keyboard.on('keydown-ESC', () => this.close());

    // Клавиатура: строки (Enter — переключить), громкость — «−»/«+», «Готово»
    this.nav = new KeyNav(this);
    this.refresh();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  // Строка: подпись слева, значение справа. toggle — тап по строке; step — кнопки «−» и «+»
  row(label, value, toggle, step) {
    const c = this.add.container(0, 0);
    // Графа бланка: чуть темнее листа, подпись машинкой, значение — синей ручкой
    const bg = this.add.rectangle(0, 0, 10, ROW_H - 8, PAPER_DIM, 1).setOrigin(0, 0.5).setStrokeStyle(1, 0x8a7a5a, 0.6);
    const name = this.add.text(14, 0, '', { fontFamily: FONT, fontSize: '17px', color: INK }).setOrigin(0, 0.5);
    const val = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', color: PEN, fontStyle: 'bold' }).setOrigin(0.5);
    c.add([bg, name, val]);
    Object.assign(c, { bg, name, val, label, value, toggle });
    if (toggle) {
      bg.setInteractive({ useHandCursor: true });
      onTap(bg, () => true, () => {
        toggle();
        this.refresh();
      });
    }
    if (step) {
      c.minus = this.stepBtn('−', () => step(-1));
      c.plus = this.stepBtn('+', () => step(1));
      c.add([c.minus, c.plus]);
    }
    return c;
  }

  stepBtn(text, fn) {
    const b = this.add
      .text(0, 0, text, { fontFamily: 'sans-serif', fontSize: '26px', color: '#e6dcc0', fontStyle: 'bold', backgroundColor: '#3a4128', padding: { x: 14, y: 2 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.press = () => {
      fn();
      this.refresh();
    };

    onTap(b, () => true, b.press);
    return b;
  }

  // Громкость по кругу с клавиатуры: +10 %, после 100 % — снова 0
  cycleVolume() {
    settings.volume = settings.volume >= 1 ? 0 : Math.min(1, Math.round((settings.volume + VOLUME_STEP) * 10) / 10);
    sfx.setVolume(settings.volume);
    sfx.play('pickup');
    this.refresh();
  }

  refresh() {
    this.title.setText(t('settings').toUpperCase());
    this.header.setText(t('settingsHeader'));
    this.done.setText(t('done'));
    for (const r of this.rows) {
      r.name.setText(r.label());
      r.val.setText(r.value());
    }
  }

  layout() {
    const { width, height } = this.scale;
    const w = Math.min(440, width - 24);
    const x0 = (width - w) / 2;
    this.overlay.setSize(width, height);
    this.overlay.input.hitArea.setSize(width, height);
    const total = 50 + this.rows.length * ROW_H + 70;
    let y = Math.max(16, (height - total) / 2);
    this.title.setPosition(width / 2, y);
    y += 56;
    for (const r of this.rows) {
      r.setPosition(x0, y + ROW_H / 2);
      r.bg.setSize(w, ROW_H - 8);
      if (r.bg.input) r.bg.input.hitArea.setSize(w, ROW_H - 8);
      if (r.minus) {
        r.minus.setPosition(w - 130, 0);
        r.plus.setPosition(w - 30, 0);
        r.val.setPosition(w - 80, 0);
      } else {
        r.val.setPosition(w - 70, 0);
      }
      y += ROW_H;
    }
    this.done.setPosition(width / 2, y + 14);
    // Лист — от заголовка до «Готово»; гриф сверху, если над заголовком есть место
    const top = this.title.y;
    const headRoom = top >= 26;
    const sTop = headRoom ? top - 24 : Math.max(2, top - 8);
    const sBottom = Math.min(height - 2, this.done.y + this.done.height + 10);
    drawSheet(this.sheet, x0 - 8, sTop, w + 16, sBottom - sTop, { header: headRoom ? 20 : 0, rule: 0 });
    this.header.setVisible(headRoom).setPosition(x0, sTop + 5);
    this.nav?.setItems([
      ...this.rows.flatMap((r) =>
        r.toggle
          ? [{ obj: r.bg, activate: () => (r.toggle(), this.refresh()) }]
          : [
              // Строка громкости сама тоже выбирается (↑/↓ по столбцу): Enter — +10 % по кругу; «−»/«+» — стрелками вбок
              { obj: r.bg, activate: () => this.cycleVolume() },
              { obj: r.minus, activate: r.minus.press },
              { obj: r.plus, activate: r.plus.press },
            ]
      ),
      { obj: this.done, activate: () => this.close() },
    ]);
  }

  close() {
    saveSettings();
    this.scene.stop();
    this.cb.onClose?.(getLang() !== this.startLang);
  }
}
