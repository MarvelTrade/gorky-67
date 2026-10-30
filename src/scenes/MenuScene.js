import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { platform } from '../platform/platform.js';
import { settings, saveSettings } from '../settings.js';
import { meta } from '../meta.js';
import { onTap } from '../ui/tap.js';

const BTN_W = 260;

// Стартовое меню: «Играть», «Ангар», «Настройки» столбиком, под ними — как управлять.
// В углу — быстрый звук вкл/выкл; кошелёк со складов — под названием, если что-то накоплено
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // Над меню открыты настройки — меню не кликается
    this.blocked = false;
    const title = this.add
      .text(0, 0, t('title'), {
        fontFamily: 'sans-serif',
        fontSize: '52px',
        color: '#e8f0d8',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);
    const subtitle = this.add
      .text(0, 0, t('subtitle'), { fontFamily: 'monospace', fontSize: '16px', color: '#d8f040' })
      .setOrigin(0.5);
    const wallet = this.add
      .text(0, 0, `₽ ${meta.money}   ⚙ ${meta.parts}`, { fontFamily: 'sans-serif', fontSize: '16px', color: '#f2c94c', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setVisible(meta.money + meta.parts > 0);
    // Управление описано в игре (требование 2.2): на телефоне — палец, на компьютере — клавиши и мышь
    const touch = this.sys.game.device.input.touch;
    const hint = this.add
      .text(0, 0, t(touch ? 'hint' : 'hintDesktop'), {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#9fb08f',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // Звук вкл/выкл — сохраняется вместе с рекордом
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

    const play = this.button(t('play'), 70, 30, 0x6b8f3a, 0xc8e08a, () => this.scene.start('BriefingScene'));
    const hangar = this.button(t('hangar'), 54, 22, 0x3a4148, 0xf2c94c, () => this.scene.start('HangarScene', { from: 'MenuScene' }));
    const opts = this.button(t('settings'), 54, 22, 0x3a4148, 0x8a949c, () => {
      this.blocked = true;
      this.scene.launch('SettingsScene', {
        onClose: (langChanged) => {
          this.blocked = false;
          showSound();
          // Язык сменился — перерисовать меню на новом языке
          if (langChanged) this.scene.restart();
        },
      });
    });
    this.input.keyboard.on('keydown-ENTER', () => !this.blocked && this.scene.start('BriefingScene'));

    const layout = () => {
      const { width, height } = this.scale;
      const short = height < 520;
      // Название не должно вылезать за края на узких телефонах
      title.setFontSize(Math.min(52, Math.floor(width / 7.5)));
      let y = height * (short ? 0.14 : 0.22);
      title.setPosition(width / 2, y);
      y += title.height / 2 + 16;
      subtitle.setPosition(width / 2, y);
      y += 28;
      wallet.setPosition(width / 2, y);
      y += short ? 30 : 48;
      for (const b of [play, hangar, opts]) {
        y += b.h / 2;
        b.setPosition(width / 2, y);
        y += b.h / 2 + 12;
      }
      hint.setPosition(width / 2, y + 8);
      hint.setWordWrapWidth(width - 32);
      sound.setPosition(width - 4, 4);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));

    // Меню на экране — игрок может начинать (LoadingAPI.ready; повторные вызовы platform отбрасывает)
    platform.gameReady();
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
