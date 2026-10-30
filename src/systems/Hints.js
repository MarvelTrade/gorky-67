import { HINTS } from '../config.js';
import { meta } from '../meta.js';
import { t } from '../i18n/index.js';

// Подсказки первых забегов — по одной, внизу экрана, пока игрок не сделает то, о чём речь
// (Ходент: учить действием, а не простынёй текста). После HINTS.runs забегов не показываются.
// Шаги: лети → собирай кристаллы → склад (когда первый попал в кадр)
export class Hints {
  constructor(scene) {
    this.scene = scene;
    this.on = (meta.runs ?? 0) < HINTS.runs;
    this.step = 0;
    this.shownFor = 0;
    this.text = null; // ключ текущей подсказки — UIScene рисует
    this.start = { x: scene.player.x, y: scene.player.y };
  }

  update(dt) {
    if (!this.on) return;
    const gs = this.scene;
    const p = gs.player;
    this.shownFor += dt;
    const touch = gs.sys.game.device.input.touch;
    switch (this.step) {
      case 0: // лети
        this.show(touch ? 'hint_fly' : 'hint_fly_keys');
        if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > HINTS.flyDist) this.next();
        break;
      case 1: // кристаллы → первый уровень
        this.show('hint_gems');
        if (gs.level > 1 || this.shownFor > HINTS.maxShow) this.next();
        break;
      case 2: { // склад — когда первый появится в кадре
        const view = gs.cameras.main.worldView;
        const d = gs.depots.list.find((x) => x.active && view.contains(x.x, x.y));
        if (!this.depotSeen && !d) {
          this.text = null;
          break;
        }
        this.depotSeen ??= d;
        this.show('hint_depot');
        if (!this.depotSeen.active || this.shownFor > HINTS.maxShow) this.next(); // разбил тот самый склад
        break;
      }
      default:
        this.text = null;
        this.on = false;
    }
  }

  show(key) {
    if (this.text !== key) this.shownFor = 0;
    this.text = key;
  }

  next() {
    this.step++;
    this.text = null;
    this.shownFor = 0;
  }

  get line() {
    return this.text ? t(this.text) : null;
  }
}
