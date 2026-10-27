import Phaser from "phaser";

import BootScene from "./scenes/BootScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import IntroScene from "./scenes/IntroScene.js";
import Level1VScene from "./scenes/Level1VScene.js";
import ResultScene from "./scenes/ResultScene.js";
import Level2AScene from "./scenes/Level2AScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#10251f",

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },

  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },

  render: {
    antialias: true,
    pixelArt: true,
    roundPixels: true,
  },

  // Urutan penting: ResultScene tampil di atas Level1VScene
  scene: [BootScene, MainMenuScene, IntroScene, Level1VScene, ResultScene, Level2AScene],
};

new Phaser.Game(config);
