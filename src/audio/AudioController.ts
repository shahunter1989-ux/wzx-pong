type WebKitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type UiTone = "start" | "pause" | "restart" | "mute" | "countdown" | "go";

const STORAGE_KEY = "wzx-pong-muted";
const MASTER_VOLUME = 0.72;
const SFX_VOLUME = 0.48;
const MUSIC_VOLUME = 0.16;

export class AudioController {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private sfxGain?: GainNode;
  private musicGain?: GainNode;
  private musicTimer?: number;
  private musicStep = 0;
  private musicRequested = false;
  private muted = false;

  constructor() {
    this.muted = this.readStoredMute();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  setMuted(muted: boolean): boolean {
    this.muted = muted;
    this.writeStoredMute(muted);
    this.applyMuteState();
    return this.muted;
  }

  toggleMuted(): boolean {
    return this.setMuted(!this.muted);
  }

  playPaddleHit(side: "left" | "right", intensity: number): void {
    const base = side === "left" ? 330 : 440;
    const lift = 220 * Math.min(1, intensity);
    this.playTone({
      frequency: base + lift,
      endFrequency: base * 1.72 + lift,
      duration: 0.105,
      gain: 0.17 + intensity * 0.08,
      type: "triangle"
    });
    this.playTone({
      frequency: base * 2.01,
      duration: 0.052,
      gain: 0.055,
      type: "sine",
      delay: 0.018
    });
  }

  playWallBounce(): void {
    this.playTone({
      frequency: 248,
      endFrequency: 186,
      duration: 0.07,
      gain: 0.075,
      type: "sine"
    });
  }

  playScore(side: "left" | "right"): void {
    const start = side === "left" ? 392 : 330;
    const end = side === "left" ? 784 : 165;
    this.playTone({
      frequency: start,
      endFrequency: end,
      duration: 0.34,
      gain: 0.16,
      type: "sawtooth"
    });
    this.playTone({
      frequency: end * 1.5,
      duration: 0.16,
      gain: 0.06,
      type: "sine",
      delay: 0.12
    });
  }

  playUi(tone: UiTone): void {
    const frequencies: Record<UiTone, number> = {
      start: 523.25,
      pause: 261.63,
      restart: 659.25,
      mute: 392,
      countdown: 440,
      go: 880
    };
    this.playTone({
      frequency: frequencies[tone],
      endFrequency: frequencies[tone] * 1.18,
      duration: 0.075,
      gain: 0.06,
      type: "square"
    });
  }

  startMusic(): void {
    this.musicRequested = true;
    if (this.muted) {
      return;
    }

    const context = this.ensureContext();
    if (!context || this.musicTimer !== undefined) {
      return;
    }

    this.musicTimer = window.setInterval(() => this.scheduleMusicStep(), 185);
    this.scheduleMusicStep();
  }

  pauseMusic(): void {
    this.musicRequested = false;
    this.stopMusicTimer();
  }

  stopMusic(): void {
    this.pauseMusic();
    this.musicStep = 0;
  }

  destroy(): void {
    this.stopMusic();
  }

  private ensureContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    const AudioContextCtor = window.AudioContext ?? (window as WebKitAudioWindow).webkitAudioContext;
    if (!AudioContextCtor) {
      return undefined;
    }

    const context = new AudioContextCtor();
    const masterGain = context.createGain();
    const sfxGain = context.createGain();
    const musicGain = context.createGain();

    masterGain.gain.value = this.muted ? 0 : MASTER_VOLUME;
    sfxGain.gain.value = SFX_VOLUME;
    musicGain.gain.value = MUSIC_VOLUME;
    sfxGain.connect(masterGain);
    musicGain.connect(masterGain);
    masterGain.connect(context.destination);

    this.context = context;
    this.masterGain = masterGain;
    this.sfxGain = sfxGain;
    this.musicGain = musicGain;
    return context;
  }

  private applyMuteState(): void {
    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return;
    }

    const now = context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : MASTER_VOLUME, now, 0.018);

    if (this.muted) {
      this.stopMusicTimer();
    } else if (this.musicRequested) {
      this.startMusic();
    }
  }

  private playTone(options: {
    frequency: number;
    endFrequency?: number;
    duration: number;
    gain: number;
    type: OscillatorType;
    delay?: number;
  }): void {
    if (this.muted) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.sfxGain) {
      return;
    }

    const startAt = context.currentTime + (options.delay ?? 0);
    const stopAt = startAt + options.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.frequency, startAt);
    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), stopAt);
    }

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain), startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.025);
  }

  private scheduleMusicStep(): void {
    if (this.muted) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.musicGain) {
      return;
    }

    const step = this.musicStep % 16;
    const now = context.currentTime;
    const arp = [220, 277.18, 329.63, 415.3, 329.63, 277.18, 246.94, 329.63];
    const bass = step < 8 ? 55 : 65.41;

    if (step % 4 === 0) {
      this.scheduleMusicTone(bass, now, 0.28, 0.2, "sawtooth");
    }
    if (step % 2 === 0) {
      this.scheduleMusicTone(arp[(step / 2) % arp.length], now + 0.018, 0.12, 0.052, "triangle");
    }
    if (step === 7 || step === 15) {
      this.scheduleMusicTone(880, now + 0.04, 0.06, 0.025, "sine");
    }

    this.musicStep += 1;
  }

  private scheduleMusicTone(
    frequency: number,
    startAt: number,
    duration: number,
    gainValue: number,
    type: OscillatorType
  ): void {
    if (!this.context || !this.musicGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const stopAt = startAt + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.025);
  }

  private stopMusicTimer(): void {
    if (this.musicTimer === undefined) {
      return;
    }

    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private readStoredMute(): boolean {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  private writeStoredMute(muted: boolean): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(muted));
    } catch {
      // Storage can be unavailable in private contexts; audio still works.
    }
  }
}
