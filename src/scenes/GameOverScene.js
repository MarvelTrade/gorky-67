import * as Phaser from 'phaser';
import { RUN } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n.js';
import { platform } from '../platform/platform.js';

// Итоги забега и «Ещё раз». data: { win, time, kills, level }
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(stats) {
    this.ready = false;
    this.time.delayedCall(RUN.gameOverInputDelay * 1000, () => (this.ready = true));

    const title = this.add
      .text(0, 0, t(stats.win ? 'win' : 'lose'), {
        fontFamily: 'sans-serif',
        fontSize: '46px',
        color: stats.win ? '#ffe066' : '#ff6a5a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const lines = [
      `${t('time')}: ${formatTime(stats.time)}`,
      `${t('kills')}: ${stats.kills}`,
      `${t('level')}: ${stats.level}`,
    ];
    const statsText = this.add
      .text(0, 0, lines.join('\n'), {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#e8f0d8',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const bestText = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#9fb08f' })
      .setOrigin(0.5);
    this.updateRecord(stats, bestText);

    const button = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 240, 72, 0x6b8f3a).setStrokeStyle(3, 0xc8e08a);
    const label = this.add
      .text(0, 0, t('again'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    button.add([bg, label]);
    bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.restart());
    this.input.keyboard.on('keydown-ENTER', () => this.restart());
    this.input.keyboard.on('keydown-SPACE', () => this.restart());

    // Кнопка появляется, когда её уже можно нажать
    button.setAlpha(0);
    this.tweens.add({ targets: button, alpha: 1, delay: RUN.gameOverInputDelay * 1000, duration: 200 });

    const layout = () => {
      const { width, height } = this.scale;
      title.setPosition(width / 2, height * 0.2);
      statsText.setPosition(width / 2, height * 0.4);
      bestText.setPosition(width / 2, height * 0.4 + statsText.height / 2 + 30);
      button.setPosition(width / 2, height * 0.72);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));
  }

  // Рекорд — дольше продержался, при равенстве — больше убил
  async updateRecord(stats, text) {
    const save = await platform.loadProgress();
    const best = save.best;
    const isNew = !best || stats.time > best.time || (stats.time === best.time && stats.kills > best.kills);
    if (isNew) {
      await platform.saveProgress({ ...save, best: { time: stats.time, kills: stats.kills } });
      text.setText(t('newBest')).setColor('#ffe066');
    } else {
      text.setText(`${t('best')}: ${formatTime(best.time)} · ${best.kills}`);
    }
  }

  async restart() {
    if (!this.ready) return;
    this.ready = false;
    // Сейчас заглушка; на Яндекс Играх тут будет межстраничная реклама
    await platform.showFullscreenAd();
    this.scene.start('GameScene');
  }
}
