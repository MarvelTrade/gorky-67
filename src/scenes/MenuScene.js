import * as Phaser from 'phaser';
import { t, getLang, initLang } from '../i18n/index.js';
import { platform } from '../platform/platform.js';
import { settings, saveSettings } from '../settings.js';
import { meta, liveryTint } from '../meta.js';
import { onTap } from '../ui/tap.js';

const BTN_W = 260;
const INK = '#2a2418';     // машинописный текст на бумаге
const RED = 0xb03024;      // штамп «Секретно», как в телеграмме
const PAPER = 0xe6dcc0;

// Стартовое меню в виде секретного дела: бумажная карточка с грифом, красным штампом
// и фотографией вертолёта на скрепке; под ней — «Играть», «Ангар», «Настройки».
// Наверху — язык RU / EN и звук; кошелёк со складов — под карточкой, если что-то накоплено.
// На низком экране (телефон лёжа) карточка слева, кнопки справа
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.blocked = false; // над меню открыты настройки — меню не кликается
    this.makeCard();

    const wallet = this.add
      .text(0, 0, `₽ ${meta.money}   ⚙ ${meta.parts}`, { fontFamily: 'sans-serif', fontSize: '16px', color: '#f2c94c', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setVisible(meta.money + meta.parts > 0);
    // Управление описано в игре (требование 2.2): на телефоне — палец, на компьютере — клавиши и мышь
    const touch = this.sys.game.device.input.touch;
    const hint = this.add
      .text(0, 0, t(touch ? 'hint' : 'hintDesktop'), { fontFamily: 'sans-serif', fontSize: '15px', color: '#9fb08f', align: 'center' })
      .setOrigin(0.5, 0);

    const sound = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '16px', color: '#c8d8b0', padding: { x: 12, y: 10 } })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    const showSound = () => sound.setText(t(settings.sound ? 'soundOn' : 'soundOff'));
    showSound();
    onTap(sound, () => !this.blocked, () => {
      settings.sound = !settings.sound;
      showSound();
      this.registry.get('applyMute')?.();
      saveSettings();
    });
    const langs = this.makeLangSwitch();

    const play = this.button(t('play'), 66, 30, 0x6b8f3a, 0xc8e08a, () => this.scene.start('BriefingScene'));
    const hangar = this.button(t('hangar'), 50, 21, 0x3a4148, 0xf2c94c, () => this.scene.start('HangarScene', { from: 'MenuScene' }));
    const opts = this.button(t('settings'), 50, 21, 0x3a4148, 0x8a949c, () => {
      this.blocked = true;
      this.scene.launch('SettingsScene', {
        onClose: (langChanged) => {
          this.blocked = false;
          showSound();
          if (langChanged) this.scene.restart(); // перерисовать меню на новом языке
        },
      });
    });
    this.input.keyboard.on('keydown-ENTER', () => !this.blocked && this.scene.start('BriefingScene'));

    const layout = () => {
      const { width, height } = this.scale;
      const wide = height < 560 && width > height * 1.25;
      const cw = Math.min(440, wide ? width * 0.52 : width - 24);
      const ch = this.layoutCard(cw, wide ? Math.min(height - 70, 300) : Math.min(300, height * 0.46));
      let cx;
      let cy;
      let bx;
      let by;
      if (wide) {
        cx = 12 + cw / 2 + Math.max(0, (width - cw - BTN_W - 60) / 3);
        cy = Math.max(48 + ch / 2, height / 2);
        bx = Math.min(width - BTN_W / 2 - 16, cx + cw / 2 + 30 + BTN_W / 2);
        by = cy - (66 + 50 + 50 + 24) / 2;
      } else {
        cx = width / 2;
        cy = 52 + ch / 2;
        bx = width / 2;
        by = cy + ch / 2 + 22;
      }
      this.card.setPosition(cx, cy);
      if (meta.money + meta.parts > 0 && !wide) {
        wallet.setPosition(bx, by + 4);
        by += 22;
      }
      for (const b of [play, hangar, opts]) {
        b.setPosition(bx, by + b.h / 2);
        by += b.h + 12;
      }
      if (wide) wallet.setPosition(bx, by + 6);
      hint.setWordWrapWidth(wide ? BTN_W + 40 : width - 32).setPosition(bx, by + (wide ? 26 : 4));
      // Телефон лёжа: подсказка про управление не влезает — лучше без неё, чем обрезанная
      hint.setVisible(hint.y + hint.height <= height - 4);
      sound.setPosition(width - 4, 4);
      langs.setPosition(8, 6);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));

    // Меню на экране — игрок может начинать (LoadingAPI.ready; повторные вызовы platform отбрасывает)
    platform.gameReady();
  }

  // Бумажная карточка «дела»: гриф сверху, штамп, фото вертолёта на скрепке, название
  makeCard() {
    const c = this.add.container(0, 0);
    this.paper = this.add.rectangle(0, 0, 10, 10, PAPER).setStrokeStyle(2, 0x8a7a5a);
    this.shadow = this.add.rectangle(6, 6, 10, 10, 0x000000, 0.35);
    this.lines = this.add.graphics(); // линовка и поля, как на бланке
    this.header = this.add.text(0, 0, t('menuHeader'), { fontFamily: 'monospace', fontSize: '12px', color: INK }).setOrigin(0, 0);
    this.caseNo = this.add.text(0, 0, t('menuCase'), { fontFamily: 'monospace', fontSize: '12px', color: INK }).setOrigin(1, 0);

    // Фото: белая рамка, тёмная плёнка, вертолёт в окраске из «Ангара», скрепка
    this.photo = this.add.container(0, 0);
    const frame = this.add.rectangle(0, 0, 132, 100, 0xf4f0e4).setStrokeStyle(1, 0x8a7a5a);
    const film = this.add.rectangle(0, -4, 118, 80, 0x2a3326);
    const heli = this.add.image(0, -4, 'heli').setAngle(-35).setScale(1.25);
    const tint = liveryTint();
    if (tint !== null) heli.setTint(tint);
    this.menuRotor = this.add.image(0, -4, 'rotor').setScale(1.25);
    const clip = this.add.graphics();
    clip.lineStyle(3, 0x9aa6ae).strokeRoundedRect(-40, -60, 14, 34, 6);
    this.photo.add([frame, film, heli, this.menuRotor, clip]).setAngle(-4);

    this.titleText = this.add
      .text(0, 0, t('title'), { fontFamily: 'sans-serif', fontSize: '40px', color: INK, fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setLetterSpacing(3);
    this.tagline = this.add
      .text(0, 0, 'HELICOPTER SURVIVAL', { fontFamily: 'sans-serif', fontSize: '17px', color: '#8c2a1e', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setLetterSpacing(4);
    this.subtitle = this.add.text(0, 0, t('subtitle'), { fontFamily: 'monospace', fontSize: '13px', color: '#5a5040' }).setOrigin(0.5, 0);

    // Красный штамп «Секретно» — как в телеграмме, только крупнее
    const stampText = this.add
      .text(0, 0, t('telegramStamp'), { fontFamily: 'monospace', fontSize: '20px', color: '#b03024', fontStyle: 'bold', padding: { x: 8, y: 4 } })
      .setOrigin(0.5);
    const stampFrame = this.add.rectangle(0, 0, stampText.width, stampText.height).setStrokeStyle(3, RED);
    this.stamp = this.add.container(0, 0, [stampFrame, stampText]).setAngle(-12).setAlpha(0.85);

    c.add([this.shadow, this.paper, this.lines, this.header, this.caseNo, this.photo, this.titleText, this.tagline, this.subtitle, this.stamp]);
    this.card = c;
  }

  // Раскладка внутри карточки; возвращает высоту
  layoutCard(cw, maxH) {
    const ch = Math.max(230, maxH);
    const left = -cw / 2;
    const top = -ch / 2;
    this.paper.setSize(cw, ch);
    this.shadow.setSize(cw, ch);
    const g = this.lines.clear();
    g.lineStyle(1, 0xb03024, 0.35).lineBetween(left + 10, top + 28, left + cw - 10, top + 28); // красная черта под грифом
    g.lineStyle(1, 0x8a7a5a, 0.25);
    for (let y = top + 50; y < top + ch - 8; y += 22) g.lineBetween(left + 10, y, left + cw - 10, y);
    this.header.setPosition(left + 12, top + 8);
    this.caseNo.setPosition(left + cw - 12, top + 8);

    const small = ch < 280;
    const ps = small ? 0.8 : 1;
    this.photo.setScale(ps).setPosition(0, top + 38 + 50 * ps);
    let y = top + 38 + 100 * ps + 8;
    this.titleText.setFontSize(Math.min(40, Math.floor(cw / 7.5)));
    this.titleText.setPosition(0, y);
    y += this.titleText.height;
    this.tagline.setPosition(0, y);
    y += this.tagline.height + 4;
    this.subtitle.setPosition(0, y);
    this.stamp.setPosition(left + cw - 70, top + 70);
    return ch;
  }

  update(time, delta) {
    this.menuRotor.rotation += delta * 0.02;
  }

  // RU / EN наверху слева: два основных языка игры
  makeLangSwitch() {
    const c = this.add.container(0, 0);
    let x = 0;
    for (const lang of ['ru', 'en']) {
      const on = getLang() === lang;
      const b = this.add
        .text(x, 0, lang.toUpperCase(), {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: on ? '#1b2418' : '#c8d8b0',
          backgroundColor: on ? '#d8f040' : '#2f3a28',
          padding: { x: 10, y: 6 },
        })
        .setInteractive({ useHandCursor: true });
      onTap(b, () => !this.blocked && !on, () => {
        settings.lang = lang;
        initLang(lang);
        saveSettings();
        this.scene.restart();
      });
      c.add(b);
      x += b.width + 4;
    }
    return c;
  }

  button(text, h, size, fill, stroke, onClick) {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, BTN_W, h, fill).setStrokeStyle(3, stroke);
    const label = this.add
      .text(0, 0, text, { fontFamily: 'sans-serif', fontSize: `${size}px`, color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    c.add([bg, label]);
    c.h = h;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => c.setScale(1.03));
    bg.on('pointerout', () => c.setScale(1));
    onTap(bg, () => !this.blocked, onClick);
    return c;
  }
}
