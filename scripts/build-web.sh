#!/bin/sh
# Архив для веб-порталов без своего SDK (itch.io и др.): VITE_PLATFORM=web (.env.web) — публичная сборка
# без инструментов тестеров, уровни открываются по очереди, сохранения — в браузере, рекламы нет.
# В корне архива — index.html: так его ждёт itch.io («This file will be played in the browser»).
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/build/gorky-67-web.zip"
cd "$ROOT"

npx vite build --mode web --outDir dist-web --emptyOutDir

mkdir -p build
rm -f "$OUT"
# zip есть не везде (на Windows в Git Bash его нет) — тогда архив собирает Python
if command -v zip >/dev/null 2>&1; then
  (cd dist-web && zip -qrX "$OUT" .)
else
  python -c "import os,sys,zipfile
z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)
for d,_,fs in os.walk('dist-web'):
  for f in fs:
    p=os.path.join(d,f); z.write(p,os.path.relpath(p,'dist-web').replace(os.sep,'/'))
z.close()" "$OUT"
fi
for s in __startBot __game; do
  if grep -q "$s" dist-web/assets/*.js; then echo "В веб-сборке есть $s — утекли инструменты разработки" >&2; exit 1; fi
done
echo "Готово: build/gorky-67-web.zip ($(du -h "$OUT" | cut -f1))"
