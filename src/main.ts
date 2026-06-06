import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { gameConfig } from "./scenes/GameScene";

new Phaser.Game({
  ...gameConfig,
  scene: [BootScene, ...(gameConfig.scene as Phaser.Types.Scenes.SceneType[])]
});
