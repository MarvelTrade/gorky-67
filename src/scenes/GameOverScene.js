import * as Phaser from 'phaser';
import { RUN } from '../config.js';
import { formatTime } from '../format.js';
import { t } from '../i18n/index.js';
import { platform } from '../platform/platform.js';
import { copyReport } from '../systems/Telemetry.js';
import { onTap } from '../ui/tap.js';

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

    // Концовка — одна строка по итогу забега
    const ending = this.add
      .text(0, 0, t(`ending_${stats.ending}`), {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#d8e0c8',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    const lines = [
      `${t('time')}: ${formatTime(stats.time)}`,
      `${t('kills')}: ${stats.kills}`,
      `${t('level')}: ${stats.level}`,
    ];
    const bossLine = stats.bossSeen ? t(stats.bossKilled ? 'bossKilled' : 'bossAlive') : null;
    const statsText = this.add
      .text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#e8f0d8',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    const bestText = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#9fb08f' })
      .setOrigin(0.5, 0);
    this.updateRecord(stats, bestText);

    const button = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 240, 72, 0x6b8f3a).setStrokeStyle(3, 0xc8e08a);
    const label = this.add
      .text(0, 0, t('again'), { fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    button.add([bg, label]);
    bg.setInteractive({ useHandCursor: true });
    onTap(bg, () => this.ready, () => this.restart());
    this.input.keyboard.on('keydown-ENTER', () => this.restart());
    this.input.keyboard.on('keydown-SPACE', () => this.restart());

    // Для плейтестов: все замеры текстом в буфер обмена
    const copy = this.add
      .text(0, 0, t('copyStats'), {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#9fb08f',
        padding: { x: 10, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    onTap(copy, () => this.ready, async () => {
      const ok = await copyReport();
      copy.setText(t(ok ? 'copied' : 'copyFailed'));
      this.time.delayedCall(1500, () => copy.setText(t('copyStats')));
    });

    // Кнопки появляются, когда их уже можно нажать
    button.setAlpha(0);
    copy.setAlpha(0);
    this.tweens.add({ targets: [button, copy], alpha: 1, delay: RUN.gameOverInputDelay * 1000, duration: 200 });

    // Сверху вниз: заголовок, концовка, цифры, рекорд, кнопка.
    // На низком экране (телефон лёжа) цифры в одну строку, иначе кнопка не влезает.
    const layout = () => {
      const { width, height } = this.scale;
      const short = height < 500;
      const sep = short ? '  ·  ' : '\n';
      statsText.setText([lines.join(sep), bossLine].filter(Boolean).join('\n'));
      statsText.setFontSize(short ? 20 : 24);
      ending.setWordWrapWidth(Math.min(480, width - 40));

      let y = height * (short ? 0.06 : 0.12);
      title.setPosition(width / 2, y + title.height / 2);
      y += title.height + 12;
      ending.setPosition(width / 2, y);
      y += ending.height + (short ? 16 : 32);
      statsText.setPosition(width / 2, y);
      y += statsText.height + 12;
      bestText.setPosition(width / 2, y);
      y += bestText.height + (short ? 20 : 48);
      const by = Math.min(y + 36, height - (short ? 70 : 90));
      button.setPosition(width / 2, by);
      copy.setPosition(width / 2, by + 36 + (short ? 18 : 26));
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));
  }

  async updateRecord(stats, text) {
    const save = await platform.loadProgress();
    const best = save.best;
    const run = { time: stats.time, kills: stats.kills, boss: stats.bossKilled };
    if (!best || isBetter(run, best)) {
      await platform.saveProgress({ ...save, best: run });
      // Пока ждали сохранения, игрок мог уже нажать «Ещё раз» — экрана больше нет
      if (!text.scene) return;
      text.setText(t('newBest')).setColor('#ffe066');
    } else {
      if (!text.scene) return;
      const boss = best.boss ? ` · ${t('bossShort')}` : '';
      text.setText(`${t('best')}: ${formatTime(best.time)} · ${best.kills}${boss}`);
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

// Убил босса — лучше, чем не убил; среди убивших — кто быстрее,
// среди остальных — кто дольше продержался; при равенстве — больше убитых.
function isBetter(a, b) {
  if (!!a.boss !== !!b.boss) return !!a.boss;
  if (a.time !== b.time) return a.boss ? a.time < b.time : a.time > b.time;
  return a.kills > b.kills;
}
