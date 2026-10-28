import { ADS } from '../config.js';

// Обёртка над SDK Яндекс Игр. Игра обращается к платформе только через этот модуль.
//
// SDK подключается только в сборке для Яндекса (npm run build:yandex, VITE_PLATFORM=yandex):
// динамической загрузкой /sdk.js по относительному пути, как требует документация для архива
// из Консоли разработчика. Во всех остальных сборках и если SDK не загрузился — заглушки:
// игра работает так же, просто без рекламы и облачных сохранений.

const SAVE_KEY = 'gorky-67-save';
const SDK_SRC = '/sdk.js';
const IS_YANDEX_BUILD = import.meta.env.VITE_PLATFORM === 'yandex';

let ysdk = null;
let player = null;
let playing = false; // уже сообщили GameplayAPI.start() — не дублируем вызовы
let readySent = false;
let lastFullscreenAt = -Infinity;
const listeners = { pause: new Set(), resume: new Set() };

function emit(type) {
  for (const cb of listeners[type]) cb();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // приватный режим и т.п. — молча игнорируем
  }
}

// Языки Яндекс Игр, для которых показываем русский; остальным — английский
const RU_LANGS = ['ru', 'be', 'kk', 'uk', 'uz'];

export const platform = {
  get hasSdk() {
    return ysdk !== null;
  },

  async init() {
    if (!IS_YANDEX_BUILD) return;
    try {
      await loadScript(SDK_SRC);
      ysdk = await window.YaGames.init();
    } catch {
      console.warn('SDK Яндекс Игр недоступен — работаем на заглушках');
      ysdk = null;
      return;
    }
    // Платформа сама ставит игру на паузу: реклама, смена вкладки, окно покупок
    ysdk.on('game_api_pause', () => emit('pause'));
    ysdk.on('game_api_resume', () => emit('resume'));
    try {
      player = await ysdk.getPlayer();
    } catch {
      player = null; // сохранения останутся в localStorage
    }
  },

  // Подписка на паузу/возобновление от платформы и от рекламы
  onPause(cb) {
    listeners.pause.add(cb);
  },
  onResume(cb) {
    listeners.resume.add(cb);
  },

  // Вызвать, когда игрок реально может начать играть (меню на экране). Строго один раз за загрузку.
  gameReady() {
    if (readySent) return;
    readySent = true;
    ysdk?.features.LoadingAPI?.ready();
  },

  gameplayStart() {
    if (playing) return;
    playing = true;
    ysdk?.features.GameplayAPI?.start();
  },

  gameplayStop() {
    if (!playing) return;
    playing = false;
    ysdk?.features.GameplayAPI?.stop();
  },

  // Межстраничная реклама между забегами. Не чаще ADS.fullscreenMinInterval —
  // платформа ограничивает частоту и сама, но лишний раз не дёргаем.
  showFullscreenAd() {
    if (!ysdk) return Promise.resolve();
    if (performance.now() - lastFullscreenAt < ADS.fullscreenMinInterval * 1000) return Promise.resolve();
    return new Promise((resolve) => {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => emit('pause'),
          onClose: (wasShown) => {
            if (wasShown) lastFullscreenAt = performance.now();
            emit('resume');
            resolve();
          },
          onError: () => {
            emit('resume');
            resolve();
          },
        },
      });
    });
  },

  // Можно ли предложить «Воскреснуть». В dev без SDK — да, с имитацией рекламы,
  // чтобы кнопку можно было проверить; в обычной сборке без SDK — нет.
  canShowRewarded() {
    return ysdk !== null || import.meta.env.DEV;
  },

  // Резолвится true, если игрок досмотрел и заслужил награду
  showRewardedAd() {
    if (!ysdk) {
      return new Promise((resolve) => setTimeout(() => resolve(import.meta.env.DEV), 600));
    }
    return new Promise((resolve) => {
      let rewarded = false;
      ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => emit('pause'),
          onRewarded: () => (rewarded = true),
          onClose: () => {
            emit('resume');
            resolve(rewarded);
          },
          onError: () => {
            emit('resume');
            resolve(false);
          },
        },
      });
    });
  },

  // Рекорд и настройки: облако Яндекса, если есть игрок, и всегда localStorage как запасной вариант
  async saveProgress(data) {
    writeLocal(data);
    if (!player) return;
    try {
      await player.setData(data, true);
    } catch {
      // нет сети или лимит запросов — останется локальная копия
    }
  },

  async loadProgress() {
    const local = readLocal();
    if (!player) return local;
    try {
      const cloud = await player.getData();
      return Object.keys(cloud).length ? cloud : local;
    } catch {
      return local;
    }
  },

  getLang() {
    const lang = ysdk?.environment.i18n.lang ?? (navigator.language || 'ru').slice(0, 2);
    return RU_LANGS.includes(lang) ? 'ru' : 'en';
  },
};
