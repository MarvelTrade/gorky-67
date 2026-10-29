import { platform } from './platform/platform.js';

// Настройки игрока. Хранятся в том же сохранении, что и рекорд (облако Яндекса или localStorage).
export const settings = { sound: true };

export async function loadSettings() {
  const save = await platform.loadProgress();
  settings.sound = save.settings?.sound ?? true;
}

export async function saveSettings() {
  const save = await platform.loadProgress();
  await platform.saveProgress({ ...save, settings: { ...settings } });
}
