import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути — dist/ должен работать из корня архива (Яндекс Игры)
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
