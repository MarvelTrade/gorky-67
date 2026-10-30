import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { BriefingScene } from './scenes/BriefingScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LevelUpScene } from './scenes/LevelUpScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { HangarScene } from './scenes/HangarScene.js';
import { loadMeta } from './meta.js';
import { PauseScene } from './scenes/PauseScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { ReviveScene } from './scenes/ReviveScene.js';
import { platform } from './platform/platform.js';
import { initLang } from './i18n/index.js';
import { sfx } from './systems/Sfx.js';
import { settings, loadSettings } from './settings.js';

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
    scene: [BootScene, MenuScene, BriefingScene, GameScene, UIScene, LevelUpScene, PauseScene, ReviveScene, GameOverScene, HangarScene, SettingsScene],
  });

  sfx.init(game);
  sfx.setVolume(settings.volume);

  if (import.meta.env.DEV) {
    window.__game = game;
    import('./dev/bot.js').then((m) => m.installBot(game));
  }

  // Звук выключен, пока вкладка скрыта, идёт реклама или платформа поставила паузу,
  // либо игрок сам выключил его в меню
  const state = { hidden: document.hidden, platformPaused: false };
  const applyMute = () => {
    game.sound.mute = state.hidden || state.platformPaused || !settings.sound;
  };
  game.registry.set('applyMute', applyMute);
  document.addEventListener('visibilitychange', () => {
    state.hidden = document.hidden;
    applyMute();
  });

  // Пауза от платформы (реклама, смена вкладки): останавливаем забег, если он идёт,
  // и возобновляем только то, что остановили сами
  let pausedByPlatform = false;
  platform.onPause(() => {
    state.platformPaused = true;
    applyMute();
    if (game.scene.isActive('GameScene')) {
      game.scene.pause('GameScene');
      pausedByPlatform = true;
    }
  });
  platform.onResume(() => {
    state.platformPaused = false;
    applyMute();
    if (pausedByPlatform) {
      pausedByPlatform = false;
      game.scene.resume('GameScene');
    }
  });
  applyMute();
}

platform.init().then(async () => {
  await loadSettings();
  initLang(settings.lang);
  await loadMeta();
  startGame();
});
