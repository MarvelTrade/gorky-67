import { SFX } from '../config.js';

// Звуки, синтезированные WebAudio прямо в браузере: ни файлов, ни лицензий.
// Идут через общий выход звука Phaser, поэтому game.sound.mute и пауза
// при уходе со вкладки (pauseOnBlur) действуют и на них.
class SfxEngine {
  init(game) {
    const sm = game.sound;
    this.ctx = sm.context ?? null; // нет WebAudio — играем без звука
    if (!this.ctx) return;
    this.out = this.ctx.createGain();
    this.out.gain.value = SFX.volume;
    this.out.connect(sm.destination ?? this.ctx.destination);
    this.last = {};
    this.combo = 0;
    this.comboAt = 0;

    // Секунда белого шума — основа для выстрелов, взрывов и эфира
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  // Приглушить всё (затишье перед боссом) или вернуть громкость
  duck(on) {
    if (!this.ctx) return;
    const v = SFX.volume * (on ? SFX.duckLevel : 1);
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.4);
  }

  // Не чаще SFX.minGap[name] — иначе пулемёт и пачка кристаллов сливаются в гул
  allowed(name) {
    const now = this.ctx.currentTime;
    const gap = SFX.minGap[name] ?? 0;
    if (now - (this.last[name] ?? -1) < gap) return false;
    this.last[name] = now;
    return true;
  }

  play(name) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.allowed(name)) return;
    this[name]?.(this.ctx.currentTime);
  }

  env(t, peak, attack, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.out);
    return g;
  }

  noiseSrc(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(t, Math.random() * 0.5, dur);
    return src;
  }

  tone(type, t, f0, f1, dur, peak) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(this.env(t, peak, 0.005, dur));
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Короткий сухой хлопок пулемёта
  shot(t) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800 + Math.random() * 900;
    f.Q.value = 0.9;
    this.noiseSrc(t, 0.07).connect(f);
    f.connect(this.env(t, 0.22, 0.002, 0.06));
    this.tone('sine', t, 160, 70, 0.05, 0.12);
  }

  // Взрыв: шум, у которого «закрывается» фильтр, плюс низкий удар
  explosion(t) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    this.noiseSrc(t, 0.55).connect(f);
    f.connect(this.env(t, 0.55, 0.004, 0.5));
    this.tone('sine', t, 90, 35, 0.35, 0.4);
  }

  // Подбор кристалла: короткий «блик», выше при быстрой серии подборов
  pickup(t) {
    this.combo = t - this.comboAt < 0.35 ? Math.min(this.combo + 1, 12) : 0;
    this.comboAt = t;
    const f = 880 * Math.pow(2, this.combo / 12);
    this.tone('sine', t, f, f * 1.5, 0.07, 0.12);
  }

  // Новый уровень: восходящее арпеджио
  levelUp(t) {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', t + i * 0.07, f, f, 0.12, 0.18));
  }

  // Радио «Берёзы»: щелчок тангенты и треск эфира
  radio(t) {
    this.tone('square', t, 1250, 1250, 0.05, 0.06);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    f.Q.value = 2.5;
    this.noiseSrc(t + 0.05, 0.3).connect(f);
    const g = this.env(t + 0.05, 0.1, 0.01, 0.28);
    f.connect(g);
  }

  // Ящик снабжения: два коротких восходящих тона
  supply(t) {
    this.tone('triangle', t, 660, 660, 0.08, 0.16);
    this.tone('triangle', t + 0.09, 990, 990, 0.12, 0.16);
  }

  // Отстрел ловушек: шипящий хлопок
  flare(t) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2500;
    this.noiseSrc(t, 0.25).connect(f);
    f.connect(this.env(t, 0.16, 0.005, 0.22));
  }

  // Попадание по вертолёту — глухой удар
  hit(t) {
    this.tone('square', t, 140, 60, 0.12, 0.16);
  }
}

export const sfx = new SfxEngine();
