import Phaser from "phaser";
import { ARENAS, type ArenaAsset, BALL_ASSET, getRandomArena } from "../assets";
import {
  BALL_RADIUS,
  FIELD_CENTER_X,
  FIELD_CENTER_Y,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_WIDTH
} from "../game/constants";
import {
  createMatchState,
  restartMatch,
  startMatch,
  stepMatch,
  togglePause
} from "../game/simulation";
import type { EffectEvent, InputAction, MatchState, Side } from "../game/types";
import { HudOverlay } from "../ui/HudOverlay";

type PaddleViews = Record<Side, Phaser.GameObjects.Rectangle>;
type BootData = {
  initialArenaKey?: string;
};
type EffectProfile = {
  isMobile: boolean;
  quality: "balanced" | "reduced";
};

export class GameScene extends Phaser.Scene {
  private match!: MatchState;
  private arena!: ArenaAsset;
  private background!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private ballGlow!: Phaser.GameObjects.Arc;
  private ballBaseScale = 1;
  private ballImpactUntil = 0;
  private paddles!: PaddleViews;
  private hud?: HudOverlay;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private pointerTargetY?: number;
  private pointerActive = false;
  private lastArenaKey?: string;
  private effectProfile!: EffectProfile;
  private frameSamples = 0;
  private slowFrames = 0;

  constructor() {
    super("GameScene");
  }

  init(data: BootData): void {
    this.arena = ARENAS.find((arena) => arena.key === data.initialArenaKey) ?? getRandomArena();
    this.lastArenaKey = this.arena.key;
  }

  create(): void {
    this.match = createMatchState();
    this.effectProfile = this.createEffectProfile();
    this.createWorld();
    this.createInput();
    this.createHud();
    this.syncViews(true);
    this.lazyLoadRemainingArenas();
  }

  update(_time: number, deltaMs: number): void {
    this.trackFrameTiming(deltaMs);
    const input = this.readInput();
    const effects = stepMatch(this.match, input, deltaMs / 1000);
    this.syncViews(false);
    this.handleEffects(effects);
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#020611");
    this.background = this.add.image(FIELD_CENTER_X, FIELD_CENTER_Y, this.arena.key);
    this.background.setDisplaySize(FIELD_WIDTH, FIELD_HEIGHT);
    this.background.setDepth(0);

    this.add.rectangle(FIELD_CENTER_X, FIELD_CENTER_Y, 2, FIELD_HEIGHT - 108, 0x5ee7ff, 0.36).setDepth(1);
    this.add.rectangle(FIELD_CENTER_X, FIELD_CENTER_Y, FIELD_WIDTH - 54, FIELD_HEIGHT - 87, 0x0d1f36, 0.08).setDepth(1);

    this.paddles = {
      left: this.createPaddleView(this.arena.leftColor),
      right: this.createPaddleView(this.arena.rightColor)
    };

    this.ballGlow = this.add.circle(FIELD_CENTER_X, FIELD_CENTER_Y, BALL_RADIUS * 1.35, 0x8bdcff, 0.2);
    this.ballGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.ballGlow.setDepth(4);

    this.ball = this.add.image(FIELD_CENTER_X, FIELD_CENTER_Y, BALL_ASSET.key);
    this.ballBaseScale = (BALL_RADIUS * 2.55) / this.ball.width;
    this.ball.setScale(this.ballBaseScale);
    this.ball.setBlendMode(Phaser.BlendModes.SCREEN);
    this.ball.setDepth(6);

    this.tweens.add({
      targets: this.ballGlow,
      scale: { from: 0.96, to: 1.04 },
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private createPaddleView(color: number): Phaser.GameObjects.Rectangle {
    const paddle = this.add.rectangle(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT, color, 0.9);
    paddle.setStrokeStyle(3, 0xffffff, 0.95);
    paddle.setBlendMode(Phaser.BlendModes.ADD);
    paddle.setDepth(5);
    return paddle;
  }

  private createInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,S,SPACE,ESC,R") as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerActive = true;
      this.pointerTargetY = this.screenToWorldY(pointer.y);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown || this.pointerActive) {
        this.pointerTargetY = this.screenToWorldY(pointer.y);
      }
    });

    this.input.on("pointerup", () => {
      this.pointerActive = false;
    });

    this.input.keyboard?.on("keydown-SPACE", () => this.handlePrimaryAction());
    this.input.keyboard?.on("keydown-ESC", () => this.pauseOrResume());
    this.input.keyboard?.on("keydown-R", () => this.restartWithRandomArena());
  }

  private createHud(): void {
    const root = document.querySelector<HTMLElement>("#hud-root");
    if (!root) {
      return;
    }

    this.hud = new HudOverlay(root, {
      onStart: () => this.handlePrimaryAction(),
      onPause: () => this.pauseOrResume(),
      onRestart: () => this.restartWithRandomArena(),
      onMute: () => undefined
    });
    this.hud.update(this.match, this.arena);
  }

  private readInput(): InputAction {
    let direction: -1 | 0 | 1 = 0;

    if (this.cursors?.up?.isDown || this.keys?.W?.isDown) {
      direction = -1;
    } else if (this.cursors?.down?.isDown || this.keys?.S?.isDown) {
      direction = 1;
    }

    return {
      playerDirection: direction,
      playerTargetY: direction === 0 ? this.pointerTargetY : undefined
    };
  }

  private syncViews(forceBackground: boolean): void {
    if ((forceBackground || this.background.texture.key !== this.arena.key) && this.textures.exists(this.arena.key)) {
      this.background.setTexture(this.arena.key);
    }

    this.paddles.left.setPosition(this.match.paddles.left.x, this.match.paddles.left.y);
    this.paddles.right.setPosition(this.match.paddles.right.x, this.match.paddles.right.y);
    this.ball.setPosition(this.match.ball.x, this.match.ball.y);
    this.ball.rotation += (this.match.ball.spin + this.match.ball.vx / 650) * 0.018;
    if (this.time.now > this.ballImpactUntil) {
      const pulse = 1 + Math.sin(this.time.now / 180) * 0.035;
      this.ball.setScale(this.ballBaseScale * pulse);
    }
    this.ballGlow.setPosition(this.match.ball.x, this.match.ball.y);
    this.ballGlow.setScale(1 + Math.min(0.34, this.match.rally * 0.015));
  }

  private handleEffects(effects: EffectEvent[]): void {
    for (const effect of effects) {
      if (effect.type === "paddle-hit") {
        this.playPaddleHit(effect);
      } else if (effect.type === "wall-bounce") {
        this.playWallBounce(effect);
      } else {
        this.hud?.flashScore(effect.side);
      }
    }

    if (effects.length > 0) {
      this.hud?.update(this.match, this.arena);
    }
  }

  private playPaddleHit(effect: Extract<EffectEvent, { type: "paddle-hit" }>): void {
    const paddle = this.paddles[effect.side];
    const color = effect.side === "left" ? this.arena.leftColor : this.arena.rightColor;

    this.tweens.add({
      targets: paddle,
      scaleX: 1.52,
      scaleY: 1.06,
      alpha: 1,
      duration: 64,
      yoyo: true,
      ease: "Quad.easeOut"
    });

    this.ballImpactUntil = this.time.now + 150;
    this.tweens.add({
      targets: this.ball,
      scaleX: this.ballBaseScale * 1.24,
      scaleY: this.ballBaseScale * 0.78,
      duration: 70,
      yoyo: true,
      ease: "Back.easeOut",
      onComplete: () => {
        this.ballImpactUntil = 0;
        this.ball.setScale(this.ballBaseScale);
      }
    });

    const effectScale = this.getEffectScale();
    if (!this.effectProfile.isMobile || this.effectProfile.quality !== "reduced") {
      this.cameras.main.shake(60, 0.0016 * effect.intensity * effectScale);
    }
    this.spawnSparkBurst(effect.x, effect.y, color, this.effectProfile.isMobile ? 11 : 18, effect.side === "left" ? 0 : Math.PI);
    this.spawnRing(effect.x, effect.y, color, 49 * effectScale);
  }

  private playWallBounce(effect: Extract<EffectEvent, { type: "wall-bounce" }>): void {
    const effectScale = this.getEffectScale();
    this.spawnSparkBurst(effect.x, effect.y, 0x8efaff, this.effectProfile.isMobile ? 5 : 8, effect.y < FIELD_CENTER_Y ? Math.PI / 2 : -Math.PI / 2);
    this.spawnRing(effect.x, effect.y, 0x8efaff, 28 * effectScale);
  }

  private spawnSparkBurst(x: number, y: number, color: number, count: number, direction: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = direction + (Math.random() - 0.5) * Math.PI * 0.82;
      const distance = Phaser.Math.Between(20, 67) * this.getEffectScale();
      const spark = this.add.circle(x, y, Phaser.Math.FloatBetween(1.8, 4.6), color, 0.9);
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(8);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.12,
        duration: Phaser.Math.Between(220, 430),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy()
      });
    }
  }

  private spawnRing(x: number, y: number, color: number, size: number): void {
    const ring = this.add.circle(x, y, 8, color, 0);
    ring.setStrokeStyle(4, color, 0.86);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setDepth(7);
    this.tweens.add({
      targets: ring,
      radius: size,
      alpha: 0,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private handlePrimaryAction(): void {
    if (this.match.phase === "ready") {
      startMatch(this.match);
    } else if (this.match.phase === "paused") {
      togglePause(this.match);
    } else if (this.match.phase === "gameOver") {
      this.restartWithRandomArena();
    }
    this.hud?.update(this.match, this.arena);
  }

  private pauseOrResume(): void {
    togglePause(this.match);
    this.hud?.update(this.match, this.arena);
  }

  private restartWithRandomArena(): void {
    this.arena = this.getRandomLoadedArena();
    this.lastArenaKey = this.arena.key;
    restartMatch(this.match);
    this.background.setTexture(this.arena.key);
    this.paddles.left.setFillStyle(this.arena.leftColor, 0.9);
    this.paddles.right.setFillStyle(this.arena.rightColor, 0.9);
    this.syncViews(true);
    this.hud?.update(this.match, this.arena);
  }

  private screenToWorldY(screenY: number): number {
    const camera = this.cameras.main;
    const worldPoint = camera.getWorldPoint(FIELD_WIDTH * 0.18, screenY);
    return Phaser.Math.Clamp(worldPoint.y, 0, FIELD_HEIGHT);
  }

  private lazyLoadRemainingArenas(): void {
    const remaining = ARENAS.filter((arena) => arena.key !== this.arena.key && !this.textures.exists(arena.key));
    if (remaining.length === 0) {
      return;
    }

    for (const arena of remaining) {
      this.load.image(arena.key, arena.url);
    }
    this.load.start();
  }

  private getRandomLoadedArena(): ArenaAsset {
    const loaded = ARENAS.filter((arena) => this.textures.exists(arena.key));
    const candidates = loaded.filter((arena) => arena.key !== this.lastArenaKey);
    const pool = candidates.length > 0 ? candidates : loaded;
    return pool[Math.floor(Math.random() * pool.length)] ?? this.arena;
  }

  private createEffectProfile(): EffectProfile {
    const isMobile =
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth <= 720 ||
      this.game.device.os.android ||
      this.game.device.os.iOS;

    return {
      isMobile,
      quality: isMobile ? "reduced" : "balanced"
    };
  }

  private trackFrameTiming(deltaMs: number): void {
    this.frameSamples += 1;
    if (deltaMs > 33.4) {
      this.slowFrames += 1;
    }

    if (this.frameSamples < 120) {
      return;
    }

    if (this.slowFrames > 14) {
      this.effectProfile.quality = "reduced";
    } else if (!this.effectProfile.isMobile) {
      this.effectProfile.quality = "balanced";
    }

    this.frameSamples = 0;
    this.slowFrames = 0;
  }

  private getEffectScale(): number {
    return this.effectProfile.quality === "reduced" ? 0.68 : 1;
  }
}

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: "game",
  width: FIELD_WIDTH,
  height: FIELD_HEIGHT,
  backgroundColor: "#020611",
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

export const availableArenaKeys = ARENAS.map((arena) => arena.key);
