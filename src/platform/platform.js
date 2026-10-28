// Обёртка над SDK платформы (Яндекс Игры). Сейчас — заглушки.
// Игра обращается к платформе только через этот модуль.

const SAVE_KEY = 'toilet-warrior-save';

export const platform = {
  async init() {},

  // Вызвать, когда игра реально готова к игре
  gameReady() {},

  gameplayStart() {},
  gameplayStop() {},

  // Резолвится после закрытия рекламы
  async showFullscreenAd() {},

  // Резолвится true, если игрок досмотрел и заслужил награду
  async showRewardedAd() {
    return false;
  },

  async saveProgress(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // приватный режим и т.п. — молча игнорируем
    }
  },

  async loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {};
    } catch {
      return {};
    }
  },

  getLang() {
    const lang = (navigator.language || 'ru').slice(0, 2);
    return lang === 'ru' ? 'ru' : 'en';
  },
};
