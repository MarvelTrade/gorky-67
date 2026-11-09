import { ADS } from '../config.js';

// Обёртка над SDK площадок. Игра обращается к платформе только через этот модуль.
//
// Яндекс Игры (npm run build:yandex, VITE_PLATFORM=yandex): SDK — динамической загрузкой /sdk.js по
// относительному пути, как требует документация для архива из Консоли разработчика.
// VK Игры (npm run build:vk, VITE_PLATFORM=vk): VK Bridge — VKWebAppInit сразу при старте (платформа
// ждёт его не дольше 30 с), реклама VKWebAppShowNativeAds, сохранения VKWebAppStorage, пауза —
// VKWebAppViewHide/Restore. Во всех остальных сборках и если SDK не загрузился — заглушки:
// игра работает так же, просто без рекламы и облачных сохранений.

const SAVE_KEY = 'gorky-67-save';
const SDK_SRC = '/sdk.js';
const IS_YANDEX_BUILD = import.meta.env.VITE_PLATFORM === 'yandex';
const IS_VK_BUILD = import.meta.env.VITE_PLATFORM === 'vk';

let ysdk = null;
let vk = null; // VK Bridge в сборке для VK Игр
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
    return ysdk !== null || vk !== null;
  },

  async init() {
    if (IS_VK_BUILD) return initVk();
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
    if (performance.now() - lastFullscreenAt < ADS.fullscreenMinInterval * 1000) return Promise.resolve();
    if (vk) return vkAd('interstitial').then((shown) => shown && (lastFullscreenAt = performance.now()));
    if (!ysdk) return Promise.resolve();
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
    return ysdk !== null || vk !== null || import.meta.env.DEV;
  },

  // Резолвится true, если игрок досмотрел и заслужил награду
  showRewardedAd() {
    if (vk) return vkAd('reward');
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
    if (vk) {
      try {
        await vk.send('VKWebAppStorageSet', { key: SAVE_KEY, value: JSON.stringify(data) });
      } catch {
        // нет сети или запрос отклонён — останется локальная копия
      }
      return;
    }
    if (!player) return;
    try {
      await player.setData(data, true);
    } catch {
      // нет сети или лимит запросов — останется локальная копия
    }
  },

  async loadProgress() {
    const local = readLocal();
    if (vk) {
      try {
        const res = await vk.send('VKWebAppStorageGet', { keys: [SAVE_KEY] });
        const value = res.keys?.[0]?.value;
        return value ? JSON.parse(value) : local;
      } catch {
        return local;
      }
    }
    if (!player) return local;
    try {
      const cloud = await player.getData();
      return Object.keys(cloud).length ? cloud : local;
    } catch {
      return local;
    }
  },

  getLang() {
    // VK передаёт язык пользователя в параметрах запуска: ?vk_language=ru
    const vkLang = vk ? new URLSearchParams(location.search).get('vk_language') : null;
    const lang = ysdk?.environment.i18n.lang ?? vkLang ?? (navigator.language || 'ru').slice(0, 2);
    return RU_LANGS.includes(lang) ? 'ru' : 'en';
  },
};

// VK Игры: VKWebAppInit — первым сообщением, до загрузки ресурсов. Свернули игру (мобильное приложение VK) —
// пауза и тишина, как от SDK Яндекса
async function initVk() {
  try {
    const { default: bridge } = await import('@vkontakte/vk-bridge');
    // Вне VK (открыли сборку напрямую) ответа может не быть вовсе — не ждём дольше 3 с, играем на заглушках
    let timer;
    const timeout = new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('VK Bridge timeout')), 3000)));
    try {
      await Promise.race([bridge.send('VKWebAppInit'), timeout]);
    } finally {
      clearTimeout(timer);
    }
    vk = bridge;
  } catch {
    console.warn('VK Bridge недоступен — работаем на заглушках');
    vk = null;
    return;
  }
  vk.subscribe(({ detail }) => {
    if (detail?.type === 'VKWebAppViewHide') emit('pause');
    if (detail?.type === 'VKWebAppViewRestore') emit('resume');
  });
}

// Реклама VK: format — 'reward' (за награду) или 'interstitial' (между забегами). Сначала спрашиваем,
// есть ли объявление; на время показа — пауза и тишина. Резолвится true, если показали (и наградили)
async function vkAd(format) {
  try {
    const check = await vk.send('VKWebAppCheckNativeAds', { ad_format: format });
    if (!check.result) return false;
    emit('pause');
    const res = await vk.send('VKWebAppShowNativeAds', { ad_format: format });
    return !!res.result;
  } catch {
    return false;
  } finally {
    emit('resume');
  }
}
