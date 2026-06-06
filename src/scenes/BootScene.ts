import Phaser from "phaser";
import { ARENAS, BALL_ASSET } from "../assets";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    for (const arena of ARENAS) {
      this.load.image(arena.key, arena.url);
    }
    this.load.image(BALL_ASSET.key, BALL_ASSET.url);
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
