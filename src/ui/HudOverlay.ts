import type { ArenaAsset, BallAsset } from "../assets";
import type { Difficulty, GameMode, MatchConfig, MatchState, Side } from "../game/types";

type AssetChoice = "random" | string;

export type SetupSelection = MatchConfig & {
  arenaKey: AssetChoice;
  ballKey: AssetChoice;
};

type HudCallbacks = {
  onIntroStart: () => void;
  onStart: (setup: SetupSelection) => void;
  onPause: () => void;
  onRestart: () => void;
  onMute: () => boolean;
  onSetup: () => void;
};

type HudOptions = {
  initialMuted: boolean;
  introImageUrl: string;
  arenas: ArenaAsset[];
  balls: BallAsset[];
  initialSetup: SetupSelection;
};

const MODE_LABELS: Record<GameMode, string> = {
  ai: "Player vs AI",
  twoPlayer: "Local 2 Player"
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard"
};

export class HudOverlay {
  private readonly root: HTMLElement;
  private readonly callbacks: HudCallbacks;
  private readonly scoreLeft: HTMLElement;
  private readonly scoreRight: HTMLElement;
  private readonly arenaName: HTMLElement;
  private readonly intro: HTMLElement;
  private readonly countdown: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly setupControls: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly start: HTMLButtonElement;
  private readonly setup: HTMLButtonElement;
  private readonly pause: HTMLButtonElement;
  private readonly mute: HTMLButtonElement;
  private readonly modeSelect: HTMLSelectElement;
  private readonly difficultySelect: HTMLSelectElement;
  private readonly arenaSelect: HTMLSelectElement;
  private readonly ballSelect: HTMLSelectElement;
  private lastSignature = "";
  private muted: boolean;
  private introVisible = true;

  constructor(root: HTMLElement, callbacks: HudCallbacks, options: HudOptions) {
    this.root = root;
    this.callbacks = callbacks;
    this.muted = options.initialMuted;
    this.root.className = "hud";
    this.root.innerHTML = `
      <section class="hud__intro" data-intro-screen data-action="intro-start">
        <img class="hud__intro-image" src="${options.introImageUrl}" alt="WZX Neon Pong intro screen" />
        <div class="hud__intro-prompt">Tap to start</div>
      </section>
      <section class="hud__top" aria-live="polite">
        <div class="hud__score"><span data-score-left>0</span><i></i><span data-score-right>0</span></div>
        <div class="hud__arena" data-arena-name>Neon Arena</div>
        <div class="hud__actions">
          <button class="icon-button" type="button" data-action="pause" aria-label="Pause">II</button>
          <button class="icon-button" type="button" data-action="mute" aria-label="Mute sound">ON</button>
          <button class="icon-button" type="button" data-action="restart" aria-label="Restart">R</button>
        </div>
      </section>
      <section class="hud__center" data-panel>
        <div class="hud__brand">WZX</div>
        <h1 data-title>Arcade setup</h1>
        <p data-subtitle>Choose a mode, arena, and ball before the serve.</p>
        <div class="hud__setup" data-setup-controls>
          <label>
            <span>Mode</span>
            <select data-setup-mode>
              ${this.renderModeOptions(options.initialSetup.mode)}
            </select>
          </label>
          <label>
            <span>Difficulty</span>
            <select data-setup-difficulty>
              ${this.renderDifficultyOptions(options.initialSetup.difficulty)}
            </select>
          </label>
          <label>
            <span>Arena</span>
            <select data-setup-arena>
              ${this.renderAssetOptions(options.arenas, options.initialSetup.arenaKey)}
            </select>
          </label>
          <label>
            <span>Ball</span>
            <select data-setup-ball>
              ${this.renderAssetOptions(options.balls, options.initialSetup.ballKey)}
            </select>
          </label>
        </div>
        <div class="hud__stats" data-stats hidden></div>
        <div class="hud__panel-actions">
          <button class="primary-button" type="button" data-action="start">Start match</button>
          <button class="secondary-button" type="button" data-action="setup" hidden>Change setup</button>
        </div>
      </section>
      <section class="hud__countdown" data-countdown hidden></section>
      <section class="hud__hint">
        <span>W/S left</span>
        <span>Arrows right</span>
        <span>Touch and drag</span>
      </section>
    `;

    this.scoreLeft = this.queryRequired("[data-score-left]");
    this.scoreRight = this.queryRequired("[data-score-right]");
    this.arenaName = this.queryRequired("[data-arena-name]");
    this.intro = this.queryRequired("[data-intro-screen]");
    this.countdown = this.queryRequired("[data-countdown]");
    this.panel = this.queryRequired("[data-panel]");
    this.title = this.queryRequired("[data-title]");
    this.subtitle = this.queryRequired("[data-subtitle]");
    this.setupControls = this.queryRequired("[data-setup-controls]");
    this.stats = this.queryRequired("[data-stats]");
    this.start = this.queryRequired('[data-action="start"]');
    this.setup = this.queryRequired('[data-action="setup"]');
    this.pause = this.queryRequired('[data-action="pause"]');
    this.mute = this.queryRequired('[data-action="mute"]');
    this.modeSelect = this.queryRequired("[data-setup-mode]");
    this.difficultySelect = this.queryRequired("[data-setup-difficulty]");
    this.arenaSelect = this.queryRequired("[data-setup-arena]");
    this.ballSelect = this.queryRequired("[data-setup-ball]");
    this.updateMuteButton();
    this.syncDifficultyAvailability();
    this.setIntroVisible(Boolean(options.introImageUrl));

    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action === "intro-start") {
        this.callbacks.onIntroStart();
      } else if (action === "start") {
        this.callbacks.onStart(this.getSetupSelection());
      } else if (action === "pause") {
        this.callbacks.onPause();
      } else if (action === "restart") {
        this.callbacks.onRestart();
      } else if (action === "mute") {
        this.muted = this.callbacks.onMute();
        this.updateMuteButton();
      } else if (action === "setup") {
        this.callbacks.onSetup();
      }
    });

    this.modeSelect.addEventListener("change", () => this.syncDifficultyAvailability());
  }

  getSetupSelection(): SetupSelection {
    return {
      mode: this.modeSelect.value as GameMode,
      difficulty: this.difficultySelect.value as Difficulty,
      arenaKey: this.arenaSelect.value,
      ballKey: this.ballSelect.value
    };
  }

  setIntroVisible(visible: boolean): void {
    this.introVisible = visible;
    this.intro.hidden = !visible;
    if (visible) {
      this.root.dataset.intro = "true";
    } else {
      delete this.root.dataset.intro;
    }
    this.lastSignature = "";
  }

  setCountdown(label?: string): void {
    this.countdown.textContent = label ?? "";
    this.countdown.hidden = !label;
  }

  setAssetOptions(arenas: ArenaAsset[], balls: BallAsset[]): void {
    this.replaceAssetOptions(this.arenaSelect, arenas, this.arenaSelect.value);
    this.replaceAssetOptions(this.ballSelect, balls, this.ballSelect.value);
  }

  update(match: MatchState, arena: ArenaAsset): void {
    const signature = [
      match.phase,
      match.scores.left,
      match.scores.right,
      match.winner ?? "",
      match.config.mode,
      match.config.difficulty,
      match.stats.elapsedSeconds.toFixed(1),
      match.stats.longestRally,
      match.stats.totalHits,
      arena.key,
      this.muted ? "muted" : "sound",
      this.introVisible ? "intro" : "game"
    ].join("|");

    if (signature === this.lastSignature) {
      return;
    }

    this.lastSignature = signature;
    this.scoreLeft.textContent = String(match.scores.left);
    this.scoreRight.textContent = String(match.scores.right);
    this.arenaName.textContent = arena.label;
    this.root.dataset.phase = match.phase;
    this.pause.textContent = match.phase === "paused" ? ">" : "II";
    this.pause.setAttribute("aria-label", match.phase === "paused" ? "Resume" : "Pause");

    if (match.phase === "ready") {
      this.title.textContent = "Arcade setup";
      this.subtitle.textContent = "Choose a mode, arena, and ball before the serve.";
      this.start.textContent = "Start match";
      this.setupControls.hidden = false;
      this.stats.hidden = true;
      this.setup.hidden = true;
      this.panel.hidden = false;
    } else if (match.phase === "paused") {
      this.title.textContent = "Paused";
      this.subtitle.textContent = "The rally is frozen. Resume when ready.";
      this.start.textContent = "Resume";
      this.setupControls.hidden = true;
      this.stats.hidden = true;
      this.setup.hidden = true;
      this.panel.hidden = false;
    } else if (match.phase === "gameOver") {
      this.title.textContent = `${this.sideLabel(match.winner ?? "left", match.config.mode)} wins`;
      this.subtitle.textContent = "Run it back, or adjust the arcade setup.";
      this.start.textContent = "Rematch";
      this.setupControls.hidden = true;
      this.renderStats(match);
      this.stats.hidden = false;
      this.setup.hidden = false;
      this.panel.hidden = false;
    } else {
      this.panel.hidden = true;
    }
  }

  flashScore(side: Side): void {
    const element = side === "left" ? this.scoreLeft : this.scoreRight;
    element?.animate(
      [
        { transform: "scale(1)", textShadow: "0 0 12px rgba(255,255,255,0.65)" },
        { transform: "scale(1.32)", textShadow: "0 0 28px rgba(255,255,255,1)" },
        { transform: "scale(1)", textShadow: "0 0 12px rgba(255,255,255,0.65)" }
      ],
      { duration: 420, easing: "cubic-bezier(.2,.9,.2,1)" }
    );
  }

  destroy(): void {
    this.root.innerHTML = "";
    this.root.className = "";
    this.lastSignature = "";
  }

  private renderModeOptions(selected: GameMode): string {
    return (Object.keys(MODE_LABELS) as GameMode[])
      .map((mode) => `<option value="${mode}"${mode === selected ? " selected" : ""}>${MODE_LABELS[mode]}</option>`)
      .join("");
  }

  private renderDifficultyOptions(selected: Difficulty): string {
    return (Object.keys(DIFFICULTY_LABELS) as Difficulty[])
      .map(
        (difficulty) =>
          `<option value="${difficulty}"${difficulty === selected ? " selected" : ""}>${DIFFICULTY_LABELS[difficulty]}</option>`
      )
      .join("");
  }

  private renderAssetOptions(assets: Array<ArenaAsset | BallAsset>, selected: AssetChoice): string {
    return [
      `<option value="random"${selected === "random" ? " selected" : ""}>Random</option>`,
      ...assets.map((asset) => `<option value="${asset.key}"${asset.key === selected ? " selected" : ""}>${asset.label}</option>`)
    ].join("");
  }

  private replaceAssetOptions(select: HTMLSelectElement, assets: Array<ArenaAsset | BallAsset>, selected: string): void {
    const available = selected === "random" || assets.some((asset) => asset.key === selected);
    select.innerHTML = this.renderAssetOptions(assets, available ? selected : "random");
  }

  private renderStats(match: MatchState): void {
    const leftLabel = this.sideLabel("left", match.config.mode);
    const rightLabel = this.sideLabel("right", match.config.mode);
    const difficultyLabel = match.config.mode === "ai" ? DIFFICULTY_LABELS[match.config.difficulty] : "Manual";

    this.stats.innerHTML = `
      <dl>
        <div><dt>Mode</dt><dd>${MODE_LABELS[match.config.mode]}</dd></div>
        <div><dt>Difficulty</dt><dd>${difficultyLabel}</dd></div>
        <div><dt>${leftLabel}</dt><dd>${match.scores.left}</dd></div>
        <div><dt>${rightLabel}</dt><dd>${match.scores.right}</dd></div>
        <div><dt>Time</dt><dd>${this.formatDuration(match.stats.elapsedSeconds)}</dd></div>
        <div><dt>Longest rally</dt><dd>${match.stats.longestRally}</dd></div>
        <div><dt>Total hits</dt><dd>${match.stats.totalHits}</dd></div>
      </dl>
    `;
  }

  private sideLabel(side: Side, mode: GameMode): string {
    if (mode === "twoPlayer") {
      return side === "left" ? "Left player" : "Right player";
    }

    return side === "left" ? "Player" : "AI";
  }

  private formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  private syncDifficultyAvailability(): void {
    this.difficultySelect.disabled = this.modeSelect.value === "twoPlayer";
  }

  private queryRequired<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing HUD element: ${selector}`);
    }
    return element;
  }

  private updateMuteButton(): void {
    this.mute.textContent = this.muted ? "OFF" : "ON";
    this.mute.setAttribute("aria-label", this.muted ? "Unmute sound" : "Mute sound");
    this.mute.setAttribute("title", this.muted ? "Sound muted" : "Sound on");
    this.lastSignature = "";
  }
}
