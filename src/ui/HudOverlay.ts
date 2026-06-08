import type { ArenaAsset } from "../assets";
import type { MatchState } from "../game/types";

type HudCallbacks = {
  onIntroStart: () => void;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onMute: () => boolean;
};

export class HudOverlay {
  private readonly root: HTMLElement;
  private readonly callbacks: HudCallbacks;
  private readonly scoreLeft: HTMLElement;
  private readonly scoreRight: HTMLElement;
  private readonly arenaName: HTMLElement;
  private readonly intro: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly start: HTMLButtonElement;
  private readonly pause: HTMLButtonElement;
  private readonly mute: HTMLButtonElement;
  private lastSignature = "";
  private muted: boolean;
  private introVisible = true;

  constructor(root: HTMLElement, callbacks: HudCallbacks, initialMuted = false, introImageUrl = "") {
    this.root = root;
    this.callbacks = callbacks;
    this.muted = initialMuted;
    this.root.className = "hud";
    this.root.innerHTML = `
      <section class="hud__intro" data-intro-screen data-action="intro-start">
        <img class="hud__intro-image" src="${introImageUrl}" alt="WZX Neon Pong intro screen" />
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
        <h1 data-title>Neon Pong</h1>
        <p data-subtitle>Drag, touch, or use the keyboard to bend the rally.</p>
        <button class="primary-button" type="button" data-action="start">Start match</button>
      </section>
      <section class="hud__hint">
        <span>W/S or arrow keys</span>
        <span>Touch and drag</span>
      </section>
    `;

    this.scoreLeft = this.queryRequired("[data-score-left]");
    this.scoreRight = this.queryRequired("[data-score-right]");
    this.arenaName = this.queryRequired("[data-arena-name]");
    this.intro = this.queryRequired("[data-intro-screen]");
    this.panel = this.queryRequired("[data-panel]");
    this.title = this.queryRequired("[data-title]");
    this.subtitle = this.queryRequired("[data-subtitle]");
    this.start = this.queryRequired('[data-action="start"]');
    this.pause = this.queryRequired('[data-action="pause"]');
    this.mute = this.queryRequired('[data-action="mute"]');
    this.updateMuteButton();
    this.setIntroVisible(Boolean(introImageUrl));

    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action === "intro-start") {
        this.callbacks.onIntroStart();
      } else if (action === "start") {
        this.callbacks.onStart();
      } else if (action === "pause") {
        this.callbacks.onPause();
      } else if (action === "restart") {
        this.callbacks.onRestart();
      } else if (action === "mute") {
        this.muted = this.callbacks.onMute();
        this.updateMuteButton();
      }
    });
  }

  setIntroVisible(visible: boolean): void {
    this.introVisible = visible;
    this.intro.hidden = !visible;
    if (visible) {
      this.root.dataset.intro = "true";
    } else {
      delete this.root.dataset.intro;
    }
  }

  update(match: MatchState, arena: ArenaAsset): void {
    const signature = [
      match.phase,
      match.scores.left,
      match.scores.right,
      match.winner ?? "",
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
      this.title.textContent = "Neon Pong";
      this.subtitle.textContent = "Drag, touch, or use the keyboard to bend the rally.";
      this.start.textContent = "Start match";
      this.panel.hidden = false;
    } else if (match.phase === "paused") {
      this.title.textContent = "Paused";
      this.subtitle.textContent = "The rally is frozen. Resume when ready.";
      this.start.textContent = "Resume";
      this.panel.hidden = false;
    } else if (match.phase === "gameOver") {
      this.title.textContent = `${match.winner === "left" ? "Player" : "AI"} wins`;
      this.subtitle.textContent = "Start a rematch with a fresh random arena.";
      this.start.textContent = "Rematch";
      this.panel.hidden = false;
    } else {
      this.panel.hidden = true;
    }
  }

  flashScore(side: "left" | "right"): void {
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
