#!/bin/sh
# Сборка для VK Игр: VITE_PLATFORM=vk (.env.vk) — VK Bridge (src/platform/platform.js), публичная сборка
# без инструментов тестеров. Папку dist-vk выкладывают на хостинг статики VK (vk-miniapps-deploy) или любой HTTPS.
# Архив — на случай загрузки вручную; в корне index.html.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/build/gorky-67-vk.zip"
cd "$ROOT"

npx vite build --mode vk --outDir dist-vk --emptyOutDir

mkdir -p build
rm -f "$OUT"
# zip есть не везде (на Windows в Git Bash его нет) — тогда архив собирает Python
if command -v zip >/dev/null 2>&1; then
  (cd dist-vk && zip -qrX "$OUT" .)
else
  python -c "import os,sys,zipfile
z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)
for d,_,fs in os.walk('dist-vk'):
  for f in fs:
    p=os.path.join(d,f); z.write(p,os.path.relpath(p,'dist-vk').replace(os.sep,'/'))
z.close()" "$OUT"
fi
for s in __startBot __game; do
  if grep -q "$s" dist-vk/assets/*.js; then echo "В сборке для VK есть $s — утекли инструменты разработки" >&2; exit 1; fi
done
echo "Готово: build/gorky-67-vk.zip ($(du -h "$OUT" | cut -f1))"
