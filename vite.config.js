import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Только dev-сервер: страница promo.html рисует иконки и обложки и присылает PNG сюда,
// а мы кладём их в promo/. В сборку игры ни страница, ни этот обработчик не попадают.
function promoSave() {
  return {
    name: 'promo-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__promo-save', (req, res) => {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(body);
            // Картинки — в promo/, кадры для видео — в promo/frames/ (их склеивает ffmpeg)
            if (!/^([a-z0-9-]+\.png|frames\/f\d{5}\.jpg)$/.test(name)) throw new Error('bad name');
            const bytes = Buffer.from(dataUrl.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
            const file = path.resolve(server.config.root, 'promo', name);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, bytes);
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  // Относительные пути — dist/ должен работать из корня архива (Яндекс Игры)
  base: './',
  plugins: [promoSave()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
