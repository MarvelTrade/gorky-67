import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { BriefingScene } from './scenes/BriefingScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LevelUpScene } from './scenes/LevelUpScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { platform } from './platform/platform.js';
import { initLang } from './i18n/index.js';
import { sfx } from './systems/Sfx.js';

function startGame() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1b2418',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: {
      activePointers: 2,
    },
    disableContextMenu: true,
    scene: [BootScene, MenuScene, BriefingScene, GameScene, UIScene, LevelUpScene, PauseScene, GameOverScene],
  });

  sfx.init(game);

  if (import.meta.env.DEV) {
    window.__game = game;
    import('./dev/bot.js').then((m) => m.installBot(game));
  }

  // Звук на паузу при уходе со вкладки
  document.addEventListener('visibilitychange', () => {
    game.sound.mute = document.hidden;
  });
}

platform.init().then(() => {
  initLang();
  startGame();
});
