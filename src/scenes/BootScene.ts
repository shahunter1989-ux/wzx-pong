import Phaser from "phaser";
import { BALL_ASSET, getRandomArena } from "../assets";

export class BootScene extends Phaser.Scene {
  private initialArenaKey = "";

  constructor() {
    super("BootScene");
  }

  preload(): void {
    const arena = getRandomArena();
    this.initialArenaKey = arena.key;
    this.load.image(arena.key, arena.url);
    this.load.image(BALL_ASSET.key, BALL_ASSET.url);
  }

  create(): void {
    this.scene.start("GameScene", { initialArenaKey: this.initialArenaKey });
  }
}
