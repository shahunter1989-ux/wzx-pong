import Phaser from "phaser";
import { getRandomArena, getRandomBall } from "../assets";

export class BootScene extends Phaser.Scene {
  private initialArenaKey = "";
  private initialBallKey = "";

  constructor() {
    super("BootScene");
  }

  preload(): void {
    const arena = getRandomArena();
    const ball = getRandomBall();
    this.initialArenaKey = arena.key;
    this.initialBallKey = ball.key;
    this.load.image(arena.key, arena.url);
    this.load.image(ball.key, ball.url);
  }

  create(): void {
    this.scene.start("GameScene", {
      initialArenaKey: this.initialArenaKey,
      initialBallKey: this.initialBallKey
    });
  }
}
