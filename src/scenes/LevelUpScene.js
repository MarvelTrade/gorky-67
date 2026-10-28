import * as Phaser from 'phaser';
import { LEVELUP } from '../config.js';
import { t } from '../i18n.js';

// Пауза с выбором 1 из 3 улучшений. Запускается поверх приостановленной GameScene.
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

    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.65).setOrigin(0);
    this.title = this.add
      .text(0, 0, `${t('levelUp')} ${data.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#ffe066',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

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
    const bg = this.add.rectangle(0, 0, 10, 10, 0x2b3a22).setStrokeStyle(3, 0x8fbf4a);
    const name = this.add
      .text(0, 0, choice.name, { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const desc = this.add
      .text(0, 0, choice.desc, { fontFamily: 'sans-serif', fontSize: '16px', color: '#c8d8b0', align: 'center' })
      .setOrigin(0.5);
    const lvl = this.add
      .text(0, 0, `${t('lvl')} ${choice.level}/${choice.max}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#8fbf4a',
      })
      .setOrigin(0.5);
    card.add([bg, name, desc, lvl]);
    Object.assign(card, { bg, name, desc, lvl });

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x3d5230));
    bg.on('pointerout', () => bg.setFillStyle(0x2b3a22));
    bg.on('pointerup', () => this.pick(index));
    return card;
  }

  // Широкий экран — карточки в ряд, узкий (телефон вертикально) — столбиком
  layout() {
    const { width, height } = this.scale;
    this.overlay.setSize(width, height);
    const n = this.cards.length;
    const row = width > height * 1.1;

    let cw, ch, positions;
    if (row) {
      cw = Math.min(260, (width - 40 - (n - 1) * 20) / n);
      // Карточки пониже, чтобы на невысоком экране заголовок не лез на HUD
      ch = Math.min(220, height * 0.45);
      const total = n * cw + (n - 1) * 20;
      const y = height * 0.62;
      positions = this.cards.map((_, i) => ({ x: (width - total) / 2 + cw / 2 + i * (cw + 20), y }));
      this.title.setPosition(width / 2, y - ch / 2 - 32);
    } else {
      cw = Math.min(420, width - 40);
      ch = Math.min(130, (height - 200) / n - 16);
      const total = n * ch + (n - 1) * 16;
      const top = (height - total) / 2 + 40;
      positions = this.cards.map((_, i) => ({ x: width / 2, y: top + ch / 2 + i * (ch + 16) }));
      this.title.setPosition(width / 2, top - 50);
    }

    this.cards.forEach((card, i) => {
      card.setPosition(positions[i].x, positions[i].y);
      card.bg.setSize(cw, ch);
      card.bg.input.hitArea.setSize(cw, ch);
      card.bg.setOrigin(0.5);
      card.desc.setWordWrapWidth(cw - 24);
      card.name.setY(-ch / 2 + 28);
      card.desc.setY(row ? 0 : 6);
      card.lvl.setY(ch / 2 - 18);
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
