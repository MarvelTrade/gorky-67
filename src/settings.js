import { platform } from './platform/platform.js';

// Настройки игрока. Хранятся в том же сохранении, что и рекорд (облако Яндекса или localStorage).
// lang: null — язык платформы/браузера, 'ru' / 'en' — выбран вручную
// showFps — счётчик кадров для тестеров (в сборке для Яндекса строки нет)
export const settings = { sound: true, volume: 0.8, shake: true, lang: null, showFps: false };

export async function loadSettings() {
  const save = await platform.loadProgress();
  settings.sound = save.settings?.sound ?? true;
  settings.volume = save.settings?.volume ?? 0.8;
  settings.shake = save.settings?.shake ?? true;
  settings.lang = save.settings?.lang ?? null;
  settings.showFps = save.settings?.showFps ?? false;
}

export async function saveSettings() {
  const save = await platform.loadProgress();
  await platform.saveProgress({ ...save, settings: { ...settings } });
}
