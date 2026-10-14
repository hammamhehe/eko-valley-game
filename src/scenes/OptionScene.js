// src/scenes/OptionScene.js
import Phaser from "phaser";

export default class OptionScene extends Phaser.Scene {
  constructor() {
    super("OptionScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Background Pemandangan 🌄
    const bg = this.add.image(width / 2, height / 2, "menu_bg");
    bg.setDisplaySize(width, height);

    // 2. Judul Halaman ⚙️
    this.add
      .text(width / 2, height * 0.25, "⚙️ PENGATURAN ⚙️", {
        fontFamily: "'Courier New', monospace",
        fontSize: "28px",
        fontStyle: "bold",
        fill: "#ffca00",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // State Pengaturan
    this.bgmOn = true;
    this.sfxOn = true;

    // 3. Tombol Toggle Musik (BGM) 🔊
    this.bgmBtn = this.add
      .text(width / 2, height * 0.42, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "20px",
        fontStyle: "bold",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // 4. Tombol Toggle Efek Suara (SFX) 🔔
    this.sfxBtn = this.add
      .text(width / 2, height * 0.52, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "20px",
        fontStyle: "bold",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.updateTexts();

    // Event Klik Opsi
    this.bgmBtn.on("pointerdown", () => {
      this.bgmOn = !this.bgmOn;
      this.updateTexts();
    });

    this.sfxBtn.on("pointerdown", () => {
      this.sfxOn = !this.sfxOn;
      this.updateTexts();
    });

    // 5. Tombol Kembali ⬅️
    const backBtn = this.add
      .text(width / 2, height * 0.7, "⬅️ KEMBALI", {
        fontFamily: "'Courier New', monospace",
        fontSize: "20px",
        fontStyle: "bold",
        fill: "#ffca00",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
  }

  updateTexts() {
    this.bgmBtn.setText(`MUSIK (BGM): ${this.bgmOn ? "ON 🔊" : "OFF 🔇"}`);
    this.sfxBtn.setText(`EFEK (SFX): ${this.sfxOn ? "ON 🔊" : "OFF 🔇"}`);
  }
}
