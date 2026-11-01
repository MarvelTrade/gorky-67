import { HINTS } from '../config.js';
import { meta } from '../meta.js';
import { t } from '../i18n/index.js';

// Подсказки первых забегов — в той же очереди, что и радио, под позывным «Подсказка»: игрок смотрит
// в центр и вверх, на рацию; низ экрана не используем. Очередь показывает строки по одной, поэтому
// подсказки и реплики чередуются, а не накладываются. После HINTS.runs забегов не показываются.
// Шаги, каждый — когда пора: лети (сразу) → кристаллы (появились, уровень ещё первый) → склад (попал в кадр)
export class Hints {
  constructor(scene) {
    this.scene = scene;
    this.on = (meta.runs ?? 0) < HINTS.runs;
    this.step = 0;
    this.t = 0;
  }

  update(dt) {
    if (!this.on) return;
    const gs = this.scene;
    this.t += dt;
    // Только когда рация молчит и последней была не подсказка — подсказки чередуются с репликами
    const ui = gs.scene.get('UIScene');
    // «Как лететь» — в очередь сразу, следом за задачей от «Берёзы» и до разговоров о поезде: если ждать
    // тишины, в начале уровня рация занята и подсказка приходила на второй минуте
    if (this.step === 0) {
      if (this.t >= HINTS.flyAt) this.say(gs.sys.game.device.input.touch ? 'hint_fly' : 'hint_fly_keys');
      return;
    }
    if (ui.radioLeft > 0 || ui.radioQueue?.length || ui.lastWho === 'hint') return;
    if (this.step === 1 && gs.level > 1) {
      this.step = 2; // уровень уже взят — про кристаллы говорить незачем
    } else if (this.step === 1 && this.t >= HINTS.gemsAt && gs.gems.countActive() > 0) {
      this.say('hint_gems');
    } else if (this.step === 2) {
      const view = gs.cameras.main.worldView;
      if (gs.depots.list.some((d) => d.active && !d.monument && view.contains(d.x, d.y))) this.say('hint_depot');
    }
    if (this.step > 2) this.on = false;
  }

  say(key) {
    this.scene.events.emit('radio', t(key), 'hint');
    this.step++;
  }
}
