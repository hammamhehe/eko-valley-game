import Phaser from "phaser";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.stopMusic("game_music");
    this.startMenuMusic();

    // Background menu
    if (this.textures.exists("menu_bg")) {
      this.add.image(width / 2, height / 2, "menu_bg").setDisplaySize(width, height);

      this.add.rectangle(width / 2, height / 2, width, height, 0x071b16, 0.48);
    } else {
      this.cameras.main.setBackgroundColor("#163b2b");
    }

    // Panel judul
    this.add.rectangle(width / 2, height * 0.22, Math.min(width * 0.82, 760), 145, 0x09251c, 0.82).setStrokeStyle(3, 0xb4e36b, 0.95);

    // Judul game
    this.add
      .text(width / 2, height * 0.17, "ECO VARK", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: `${Math.min(56, width * 0.075)}px`,
        fontStyle: "bold",
        color: "#d8ff82",
        stroke: "#183b20",
        strokeThickness: 8,
        shadow: {
          offsetX: 0,
          offsetY: 4,
          color: "#000000",
          blur: 10,
          fill: true,
        },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.265, "LEARNING STYLE DIAGNOSTIC QUEST", {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: `${Math.min(19, width * 0.027)}px`,
        fontStyle: "bold",
        color: "#ffffff",
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    // Daftar menu
    this.menuItems = [
      { text: "NEW GAME", action: "new" },
      {
        text: this.registry.get("audioEnabled") === false ? "SOUND: OFF" : "SOUND: ON",
        action: "sound",
      },
      { text: "EXIT", action: "exit" },
    ];

    this.selectedIndex = 0;
    this.menuTexts = [];

    const startY = height * 0.47;
    const spacing = Math.min(68, height * 0.105);

    this.menuItems.forEach((item, index) => {
      const button = this.add.container(width / 2, startY + index * spacing);

      const buttonWidth = Math.min(width * 0.55, 390);
      const buttonHeight = 48;

      // Persegi tombol
      const plate = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x0a211a, 0.88).setStrokeStyle(2, index === 0 ? 0xd8ff82 : 0x719b69, 1);

      // Tulisan tombol
      const label = this.add
        .text(0, 0, item.text, {
          fontFamily: "Trebuchet MS, Arial, sans-serif",
          fontSize: "24px",
          fontStyle: "bold",
          color: index === 0 ? "#d8ff82" : "#ffffff",
        })
        .setOrigin(0.5);

      button.add([plate, label]);

      // Interaksi klik dipasang langsung pada persegi tombol.
      plate.setInteractive({
        useHandCursor: true,
      });

      plate.on("pointerover", () => {
        this.updateSelection(index);
      });

      plate.on("pointerout", () => {
        // Tampilan pilihan tetap mengikuti selectedIndex.
        this.updateSelection(this.selectedIndex);
      });

      plate.on("pointerdown", () => {
        console.log("Tombol diklik:", item.text);
        this.selectMenu(index);
      });

      this.menuTexts.push({
        button,
        plate,
        label,
      });
    });

    // Petunjuk kontrol
    this.add
      .text(width / 2, height * 0.91, "WASD / ARROW KEYS: MOVE    •    E: PICK UP TRASH    •    SPACE: JUMP", {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.min(13, width * 0.018)}px`,
        color: "#e8f5e9",
        align: "center",
        backgroundColor: "#09251cbb",
        padding: { x: 10, y: 8 },
      })
      .setOrigin(0.5);

    // Kontrol keyboard
    this.cursors = this.input.keyboard.createCursorKeys();

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.updateSelection(0);
  }

  // Musik menu
  startMenuMusic() {
    if (this.registry.get("audioEnabled") === false || !this.cache.audio.exists("menu_music")) {
      return;
    }

    const music =
      this.sound.get("menu_music") ||
      this.sound.add("menu_music", {
        loop: true,
        volume: 0.32,
      });

    if (!music.isPlaying) {
      try {
        music.play();
      } catch (error) {
        console.warn("Musik menu tidak dapat diputar:", error);
      }
    }
  }

  // Menghentikan musik tertentu
  stopMusic(key) {
    const music = this.sound.get(key);

    if (music && music.isPlaying) {
      music.stop();
    }
  }

  // Mengubah tampilan menu yang dipilih
  updateSelection(index) {
    this.selectedIndex = index;

    this.menuTexts.forEach((item, idx) => {
      const selected = idx === index;

      item.label.setColor(selected ? "#d8ff82" : "#ffffff");

      item.label.setText(this.menuItems[idx].text);

      item.plate.setFillStyle(selected ? 0x244d2d : 0x0a211a, selected ? 0.98 : 0.88);

      item.plate.setStrokeStyle(selected ? 3 : 2, selected ? 0xd8ff82 : 0x719b69, 1);

      item.button.setScale(selected ? 1.06 : 1);
    });
  }

  // Aksi tombol menu
  selectMenu(index) {
    const item = this.menuItems[index];

    if (!item) {
      return;
    }

    if (item.action === "new") {
      // Reset skor saat memulai permainan baru.
      this.registry.set("varkScores", {
        V: 0,
        A: 0,
        R: 0,
        K: 0,
      });

      this.stopMusic("menu_music");

      // NEW GAME membuka intro terlebih dahulu.
      this.scene.start("IntroScene");
    } else if (item.action === "sound") {
      const enabled = this.registry.get("audioEnabled") !== false;

      this.registry.set("audioEnabled", !enabled);

      this.menuItems[1].text = `SOUND: ${enabled ? "OFF" : "ON"}`;

      this.updateSelection(this.selectedIndex);

      if (enabled) {
        this.stopMusic("menu_music");
      } else {
        this.startMenuMusic();
      }
    } else if (item.action === "exit") {
      if (this.exitMessage) {
        this.exitMessage.destroy();
      }

      this.exitMessage = this.add
        .text(this.scale.width / 2, this.scale.height * 0.82, "Untuk keluar, tutup tab browser ini.", {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#09251c",
          padding: { x: 12, y: 8 },
        })
        .setOrigin(0.5);
    }
  }

  // Navigasi keyboard
  update() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.updateSelection((this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.updateSelection((this.selectedIndex + 1) % this.menuItems.length);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.selectMenu(this.selectedIndex);
    }
  }
}
