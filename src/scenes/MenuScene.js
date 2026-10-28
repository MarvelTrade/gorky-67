import * as Phaser from 'phaser';
import { t } from '../i18n/index.js';
import { platform } from '../platform/platform.js';
import { settings, saveSettings } from '../settings.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
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
    // Управление описано в игре (требование 2.2): на телефоне — палец, на компьютере — клавиши и мышь
    const touch = this.sys.game.device.input.touch;
    const hint = this.add
      .text(0, 0, t(touch ? 'hint' : 'hintDesktop'), {
        fontFamily: 'sans-serif',
        fontSize: '18px',
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
    sound.on('pointerup', () => {
      settings.sound = !settings.sound;
      showSound();
      this.registry.get('applyMute')?.();
      saveSettings();
    });

    const button = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 220, 70, 0x6b8f3a).setStrokeStyle(3, 0xc8e08a);
    const label = this.add
      .text(0, 0, t('play'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    button.add([bg, label]);
    bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('BriefingScene'));

    const layout = () => {
      const { width, height } = this.scale;
      // Название не должно вылезать за края на узких телефонах
      title.setFontSize(Math.min(52, Math.floor(width / 7.5)));
      title.setPosition(width / 2, height * 0.28);
      subtitle.setPosition(width / 2, height * 0.28 + title.height / 2 + 16);
      button.setPosition(width / 2, height * 0.55);
      hint.setPosition(width / 2, height * 0.55 + 52);
      hint.setWordWrapWidth(width - 32);
      sound.setPosition(width - 4, 4);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));

    // Меню на экране — игрок может начинать (LoadingAPI.ready; повторные вызовы platform отбрасывает)
    platform.gameReady();
  }
}
