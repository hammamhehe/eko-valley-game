import Phaser from "phaser";

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
    this.isStarting = false;
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.isStarting = false;

    // Background intro
    if (this.textures.exists("intro_bg")) {
      this.add.image(width / 2, height / 2, "intro_bg").setDisplaySize(width, height);

      this.add.rectangle(width / 2, height / 2, width, height, 0x071b16, 0.62);
    } else {
      this.cameras.main.setBackgroundColor("#10251f");
    }

    // Judul
    this.add
      .text(width / 2, height * 0.15, "ECO VARK", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: `${Math.min(48, width * 0.065)}px`,
        fontStyle: "bold",
        color: "#d8ff82",
        stroke: "#183b20",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Panel cerita
    this.add.rectangle(width / 2, height * 0.48, Math.min(width * 0.84, 800), height * 0.43, 0x09251c, 0.9).setStrokeStyle(2, 0xb4e36b, 0.95);

    this.add
      .text(width / 2, height * 0.32, "AWAL PETUALANGAN", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: `${Math.min(30, width * 0.04)}px`,
        fontStyle: "bold",
        color: "#d8ff82",
      })
      .setOrigin(0.5);

    const story =
      "Lingkungan yang kita tinggali membutuhkan perhatian kita.\n\n" +
      "Dalam petualangan ini, kamu akan menjelajahi lingkungan, " +
      "mengumpulkan sampah, dan mempelajari gaya belajar melalui " +
      "tantangan yang ada.\n\n" +
      "Bersiaplah untuk memulai perjalananmu dan menjaga lingkungan!";

    this.add
      .text(width / 2, height * 0.49, story, {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.min(21, width * 0.025)}px`,
        color: "#ffffff",
        align: "center",
        lineSpacing: 8,
        wordWrap: {
          width: Math.min(width * 0.72, 680),
        },
      })
      .setOrigin(0.5);

    // Tombol MULAI PETUALANGAN
    const buttonWidth = Math.min(width * 0.55, 360);
    const buttonHeight = 58;
    const buttonY = height * 0.79;

    const button = this.add.container(width / 2, buttonY);

    const plate = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x244d2d, 1).setStrokeStyle(3, 0xd8ff82, 1);

    const label = this.add
      .text(0, 0, "MULAI PETUALANGAN", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: `${Math.min(23, width * 0.03)}px`,
        fontStyle: "bold",
        color: "#d8ff82",
      })
      .setOrigin(0.5);

    button.add([plate, label]);

    // Area interaksi langsung pada tombol
    plate.setInteractive({
      useHandCursor: true,
    });

    plate.on("pointerover", () => {
      plate.setFillStyle(0x376b3d, 1);
      label.setColor("#ffffff");
    });

    plate.on("pointerout", () => {
      plate.setFillStyle(0x244d2d, 1);
      label.setColor("#d8ff82");
    });

    plate.on("pointerdown", () => {
      this.startAdventure();
    });

    // Kontrol keyboard
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  startAdventure() {
    if (this.isStarting) {
      return;
    }

    console.log("MULAI PETUALANGAN diklik");

    this.isStarting = true;

    // Pindah ke scene permainan
    if (this.scene.get("Level1VScene")) {
      this.scene.start("Level1VScene");
    } else {
      this.isStarting = false;
      console.error('Scene "Level1VScene" tidak ditemukan. Periksa pendaftaran scene di main.js.');
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.startAdventure();
    }
  }
}
  