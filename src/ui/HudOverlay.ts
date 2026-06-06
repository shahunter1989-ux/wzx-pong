import type { ArenaAsset } from "../assets";
import type { MatchState } from "../game/types";

type HudCallbacks = {
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onMute: () => void;
};

export class HudOverlay {
  private readonly root: HTMLElement;
  private readonly callbacks: HudCallbacks;
  private muted = false;

  constructor(root: HTMLElement, callbacks: HudCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.root.className = "hud";
    this.root.innerHTML = `
      <section class="hud__top" aria-live="polite">
        <div class="hud__score"><span data-score-left>0</span><i></i><span data-score-right>0</span></div>
        <div class="hud__arena" data-arena-name>Neon Arena</div>
        <div class="hud__actions">
          <button class="icon-button" type="button" data-action="pause" aria-label="Pause">II</button>
          <button class="icon-button" type="button" data-action="mute" aria-label="Mute">S</button>
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

    this.root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
      if (action === "start") {
        this.callbacks.onStart();
      } else if (action === "pause") {
        this.callbacks.onPause();
      } else if (action === "restart") {
        this.callbacks.onRestart();
      } else if (action === "mute") {
        this.muted = !this.muted;
        this.callbacks.onMute();
        this.updateMuteButton();
      }
    });
  }

  update(match: MatchState, arena: ArenaAsset): void {
    this.setText("[data-score-left]", String(match.scores.left));
    this.setText("[data-score-right]", String(match.scores.right));
    this.setText("[data-arena-name]", arena.label);

    const panel = this.root.querySelector<HTMLElement>("[data-panel]");
    const title = this.root.querySelector<HTMLElement>("[data-title]");
    const subtitle = this.root.querySelector<HTMLElement>("[data-subtitle]");
    const start = this.root.querySelector<HTMLButtonElement>('[data-action="start"]');
    const pause = this.root.querySelector<HTMLButtonElement>('[data-action="pause"]');

    if (!panel || !title || !subtitle || !start || !pause) {
      return;
    }

    this.root.dataset.phase = match.phase;
    pause.textContent = match.phase === "paused" ? "▶" : "II";
    pause.setAttribute("aria-label", match.phase === "paused" ? "Resume" : "Pause");

    if (match.phase === "ready") {
      title.textContent = "Neon Pong";
      subtitle.textContent = "Drag, touch, or use the keyboard to bend the rally.";
      start.textContent = "Start match";
      panel.hidden = false;
    } else if (match.phase === "paused") {
      title.textContent = "Paused";
      subtitle.textContent = "The rally is frozen. Resume when ready.";
      start.textContent = "Resume";
      panel.hidden = false;
    } else if (match.phase === "gameOver") {
      title.textContent = `${match.winner === "left" ? "Player" : "AI"} wins`;
      subtitle.textContent = "Start a rematch with a fresh random arena.";
      start.textContent = "Rematch";
      panel.hidden = false;
    } else {
      panel.hidden = true;
    }
  }

  flashScore(side: "left" | "right"): void {
    const element = this.root.querySelector<HTMLElement>(`[data-score-${side}]`);
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
  }

  private setText(selector: string, text: string): void {
    const element = this.root.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  private updateMuteButton(): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="mute"]');
    if (button) {
      button.textContent = this.muted ? "M" : "S";
      button.setAttribute("aria-label", this.muted ? "Unmute" : "Mute");
    }
  }
}
