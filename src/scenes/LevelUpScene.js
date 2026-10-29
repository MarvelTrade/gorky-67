import * as Phaser from 'phaser';
import { LEVELUP } from '../config.js';
import { t } from '../i18n/index.js';
import { onTap } from '../ui/tap.js';

const PAD = 12;
const GAP = 8;
const CARD_MAX_W = 200;
const CARD_MAX_H = 210;

// Пауза с выбором 1 из 3 улучшений поверх приостановленной GameScene.
// Три узкие карточки в ряд внизу экрана, сверху видна игра (как в DRG: Survivor).
// data: { level, choices: [{ id, name, desc, level, max }], onPick(id) }
export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUpScene');
  }

  create(data) {
    this.data_ = data;
    this.picked = false;
    this.ready = false;
    this.time.delayedCall(LEVELUP.inputDelay * 1000, () => (this.ready = true));

    // Затемняем только нижнюю полосу с карточками — игра сверху остаётся видна
    this.band = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.6).setOrigin(0);
    this.title = this.add
      .text(0, 0, `${t('levelUp')} ${data.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffe066',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1);

    this.cards = data.choices.map((c, i) => this.makeCard(c, i));

    this.input.keyboard.on('keydown', (e) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < this.cards.length) this.pick(i);
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  makeCard(choice, index) {
    const card = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 10, 10, 0x2b3a22, 0.95).setStrokeStyle(2, 0x8fbf4a);
    const name = this.add
      .text(0, 0, choice.name, { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    const desc = this.add
      .text(0, 0, choice.desc, { fontFamily: 'sans-serif', fontSize: '13px', color: '#c8d8b0', align: 'center' })
      .setOrigin(0.5, 0);
    const lvl = this.add
      .text(0, 0, `${t('lvl')} ${choice.level}/${choice.max}`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#8fbf4a',
      })
      .setOrigin(0.5, 1);
    card.add([bg, name, desc, lvl]);
    Object.assign(card, { bg, name, desc, lvl });

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x3d5230, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(0x2b3a22, 0.95));
    onTap(bg, () => this.ready && !this.picked, () => this.pick(index));
    return card;
  }

  layout() {
    const { width, height } = this.scale;
    const n = this.cards.length;
    const cw = Math.min(CARD_MAX_W, (width - PAD * 2 - GAP * (n - 1)) / n);
    // Вертикально — нижняя треть; на низком горизонтальном экране треть мала для текста
    const ch = Math.min(CARD_MAX_H, Math.max(height * 0.3, Math.min(height * 0.48, 150)));
    const total = n * cw + (n - 1) * GAP;
    const top = height - PAD - ch;
    const titleH = 32;

    this.band.setPosition(0, top - titleH - 8).setSize(width, height - top + titleH + 8);
    this.title.setPosition(width / 2, top - 6);

    this.cards.forEach((card, i) => {
      card.setPosition((width - total) / 2 + cw / 2 + i * (cw + GAP), top + ch / 2);
      card.bg.setSize(cw, ch).setOrigin(0.5);
      card.bg.input.hitArea.setSize(cw, ch);

      // Название в одну строку: уменьшаем шрифт, пока не влезет
      let size = 17;
      card.name.setFontSize(size);
      while (card.name.width > cw - 10 && size > 10) card.name.setFontSize(--size);
      card.name.setY(-ch / 2 + 10);

      // Описание — по ширине карточки; если не влезает по высоте, шрифт меньше
      const room = ch - (card.name.height + 14) - 24;
      size = cw < 130 ? 12 : 13;
      card.desc.setFontSize(size).setWordWrapWidth(cw - 12);
      while (card.desc.height > room && size > 9) card.desc.setFontSize(--size);
      card.desc.setY(-ch / 2 + card.name.height + 16);

      card.lvl.setY(ch / 2 - 6);
    });
  }

  pick(index) {
    if (!this.ready || this.picked) return;
    this.picked = true;
    const { choices, onPick } = this.data_;
    this.scene.stop();
    onPick(choices[index].id);
  }
}
