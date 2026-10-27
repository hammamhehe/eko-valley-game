import Phaser from "phaser";

export default class Level1VScene extends Phaser.Scene {
  constructor() {
    super("Level1VScene");
  }

  create() {
    this.worldWidth = 1600;
    this.worldHeight = 1200;
    this.score = 0;
    this.timeLeft = 60;
    this.gameOver = false;
    this.trashes = [];
    this.targetColor = null;
    this.pickupLocked = false;
    this.mistakes = 0; // berapa kali salah memilih warna sampah

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Latar permainan
    if (this.textures.exists("bg_grass")) {
      this.add.tileSprite(0, 0, this.worldWidth, this.worldHeight, "bg_grass").setOrigin(0);
    } else {
      this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x82b96a);
    }

    // Grup collider untuk penghalang pohon
    this.treeColliders = this.physics.add.staticGroup();

    this.drawTrees();

    // Pemain
    if (this.textures.exists("player_sheet")) {
      this.player = this.physics.add.sprite(this.worldWidth / 2, this.worldHeight / 2, "player_sheet", 0);
      this.player.setScale(1);
    } else {
      this.player = this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, 24, 32, 0x315ee7);
      this.physics.add.existing(this.player);
    }

    if (this.player.body) {
      this.player.body.setCollideWorldBounds(true);
    }

    this.player.setDepth(10000);

    // Pemain tidak bisa menembus pohon
    this.physics.add.collider(this.player, this.treeColliders);

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SPACE");

    this.spawnTrash();
    this.createHUD();
    this.chooseTargetColor();
    this.startBacksound();

    this.input.keyboard.on("keydown-SPACE", this.pickupTrash, this);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 59,
      callback: () => {
        if (this.gameOver) return;

        this.timeLeft--;
        this.timerText.setText(`Waktu: ${this.timeLeft}`);

        if (this.timeLeft <= 0) {
          this.finishGame();
        }
      },
    });

    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown-SPACE", this.pickupTrash, this);
    });

    this.scale.on("resize", this.handleResize, this);

    this.events.once("shutdown", () => {
      this.scale.off("resize", this.handleResize, this);
    });
  }

  drawTrees() {
    const treeKeys = ["tree1", "tree2", "tree3"].filter((key) => this.textures.exists(key));

    // Pohon lebih sedikit, tersebar, dan tidak dibuat berjejer.
    // Hindari titik tengah agar posisi awal pemain tetap lega.
    const positions = [
      [115, 155],
      [375, 245],
      [700, 125],
      [1110, 205],
      [1460, 135],

      [180, 480],
      [550, 405],
      [1030, 460],
      [1390, 385],

      [100, 810],
      [420, 715],
      [1160, 790],
      [1500, 700],

      [245, 1030],
      [690, 1080],
      [1040, 1015],
      [1400, 1080],
    ];

    positions.forEach(([x, y], i) => {
      let treeHeight = 224;

      if (treeKeys.length > 0) {
        const key = treeKeys[i % treeKeys.length];

        const tree = this.add.image(x, y, key).setOrigin(0.5, 1);

        const sourceHeight = tree.height || 32;
        const variation = Phaser.Math.FloatBetween(0.92, 1.04);

        tree.setScale((treeHeight / sourceHeight) * variation);
        tree.setDepth(y);

        treeHeight = tree.displayHeight;
      } else {
        // Tampilan pengganti jika gambar pohon belum tersedia
        this.add.rectangle(x, y - 30, 16, 60, 0x76502e).setDepth(y);

        this.add.circle(x, y - 90, 48, 0x356b38).setDepth(y);

        treeHeight = 120;
      }

      // Collider hanya di area batang pohon.
      // Daun tidak menghalangi seluruh bagian gambar.
      const trunkWidth = 34;
      const trunkHeight = 52;
      const trunkCenterY = y - Math.min(40, treeHeight * 0.22);

      const blocker = this.add.rectangle(x, trunkCenterY, trunkWidth, trunkHeight, 0xffffff, 0);

      this.physics.add.existing(blocker, true);
      blocker.body.setSize(trunkWidth, trunkHeight);

      this.treeColliders.add(blocker);
      blocker.setVisible(false);
    });
  }

  spawnTrash() {
    const types = [
      {
        key: "trash_blue",
        color: "BIRU",
        tint: 0x439bd3,
      },
      {
        key: "trash_green",
        color: "HIJAU",
        tint: 0x5bbd64,
      },
      {
        key: "trash_cokelat",
        color: "COKELAT",
        tint: 0xb87543,
      },
    ];

    for (let i = 0; i < 30; i++) {
      const type = Phaser.Utils.Array.GetRandom(types);
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = Phaser.Math.Between(100, this.worldHeight - 100);

      let trash;

      if (this.textures.exists(type.key)) {
        trash = this.add.image(x, y, type.key);

        // Ukuran sampah tetap setengah tinggi karakter.
        const playerHeight = this.player?.displayHeight || 32;
        const trashHeight = trash.height || 32;

        trash.setScale((playerHeight * 0.5) / trashHeight);
      } else {
        trash = this.add.circle(x, y, 9, type.tint);
      }

      trash.setDepth(y + 1);
      trash.setData("trashColor", type.color);
      trash.setData("trashKey", type.key);
      trash.setData("collected", false);

      this.trashes.push(trash);
    }
  }

  createHUD() {
    const hud = this.add.container(16, 16).setScrollFactor(0).setDepth(20000);

    const panel = this.add.rectangle(0, 0, 260, 126, 0x10271b, 0.94).setOrigin(0);

    this.scoreText = this.add.text(12, 10, "Sampah: 0", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.timerText = this.add.text(12, 37, "Waktu: 60", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
    });

    this.commandText = this.add.text(12, 67, "CARI: BIRU", {
      fontFamily: "Arial",
      fontSize: "19px",
      fontStyle: "bold",
      color: "#65baff",
    });

    hud.add([panel, this.scoreText, this.timerText, this.commandText]);

    this.instructionText = this.add
      .text(16, this.scale.height - 42, "WASD / PANAH: Bergerak   |   SPACE: Ambil sampah sesuai perintah", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#10271b",
        padding: { x: 8, y: 6 },
        wordWrap: { width: this.scale.width - 32 },
      })
      .setScrollFactor(0)
      .setDepth(20000);
  }

  handleResize(gameSize) {
    if (this.instructionText) {
      this.instructionText.setPosition(16, gameSize.height - 42);
      this.instructionText.setWordWrapWidth(Math.max(200, gameSize.width - 32));
    }
  }

  chooseTargetColor() {
    const colors = [
      { name: "BIRU", tint: "#65baff" },
      { name: "HIJAU", tint: "#9fe18a" },
      { name: "COKELAT", tint: "#e4b17d" },
    ];

    const available = colors.filter((item) => this.trashes.some((trash) => trash.active && trash.getData("trashColor") === item.name));

    if (available.length === 0) {
      this.finishGame();
      return;
    }

    let choices = available;

    if (this.targetColor && available.length > 1) {
      choices = available.filter((item) => item.name !== this.targetColor.name);
    }

    this.targetColor = Phaser.Utils.Array.GetRandom(choices);

    this.commandText.setText(`CARI: ${this.targetColor.name}`);
    this.commandText.setColor(this.targetColor.tint);

    this.showMessage(`Ambil sampah ${this.targetColor.name}!`);
  }

  pickupTrash() {
    if (this.gameOver || this.pickupLocked) return;

    let nearest = null;
    let nearestDistance = 65;

    for (const trash of this.trashes) {
      if (!trash.active) continue;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, trash.x, trash.y);

      if (distance < nearestDistance) {
        nearest = trash;
        nearestDistance = distance;
      }
    }

    if (!nearest) {
      this.showMessage("Dekati sampah terlebih dahulu.");
      return;
    }

    const color = nearest.getData("trashColor");

    // Hanya sampah sesuai perintah yang bisa dikumpulkan.
    if (color !== this.targetColor.name) {
      this.mistakes++;
      this.showMessage(`Bukan sampah ${this.targetColor.name}! Cari warna yang benar.`);
      return;
    }

    nearest.destroy();
    this.score++;
    this.scoreText.setText(`Sampah: ${this.score}`);

    this.playPickupSound();
    this.showMessage(`Bagus! Sampah ${color} berhasil diambil.`);

    if (this.trashes.every((trash) => !trash.active)) {
      this.finishGame();
      return;
    }

    // Perbarui target setelah setiap sampah berhasil diambil.
    this.chooseTargetColor();
  }

  showMessage(text) {
    if (this.messageText) this.messageText.destroy();

    this.messageText = this.add
      .text(this.scale.width / 2, 40, text, {
        fontFamily: "Arial",
        fontSize: this.scale.width < 500 ? "14px" : "18px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#183522",
        padding: { x: 12, y: 8 },
        align: "center",
        wordWrap: { width: this.scale.width - 30 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(30000);

    this.time.delayedCall(1400, () => {
      if (this.messageText?.active) this.messageText.destroy();
    });
  }

  startBacksound() {
    if (this.registry.get("audioEnabled") === false) return;
    if (!this.cache.audio.exists("backsound")) return;

    let music = this.sound.get("backsound");

    if (!music) {
      music = this.sound.add("backsound", {
        loop: true,
        volume: 0.25,
      });
    }

    if (!music.isPlaying) music.play();
  }

  playPickupSound() {
    if (this.registry.get("audioEnabled") === false) return;
    if (!this.cache.audio.exists("item_pickup")) return;

    this.sound.play("item_pickup", { volume: 0.8 });
  }

  finishGame() {
    if (this.gameOver) return;

    this.gameOver = true;

    if (this.timerEvent) this.timerEvent.remove(false);

    this.physics.pause();
    if (this.player && this.player.anims) this.player.anims.stop();

    const total = this.trashes.length;
    const cleared = this.trashes.every((trash) => !trash.active);
    const timeLeft = Math.max(0, this.timeLeft);

    this.registry.set("visualScore", this.score);

    const vark = this.registry.get("varkScores");
    if (vark) this.registry.set("varkScores", Object.assign({}, vark, { V: this.score }));

    // Layar penilaian ditampilkan oleh ResultScene (di atas scene ini)
    this.time.delayedCall(450, () => {
      this.scene.launch("ResultScene", {
        score: this.score,
        total,
        mistakes: this.mistakes,
        timeLeft,
        timeTotal: 60,
        cleared,
      });
    });
  }

  update() {
    if (this.gameOver || !this.player?.body) return;

    const speed = 180;
    const body = this.player.body;

    body.setVelocity(0);

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    if (left) body.setVelocityX(-speed);
    else if (right) body.setVelocityX(speed);

    if (up) body.setVelocityY(-speed);
    else if (down) body.setVelocityY(speed);

    body.velocity.normalize().scale(speed);

    if (this.player.anims) {
      if (left) this.player.anims.play("walk-left", true);
      else if (right) this.player.anims.play("walk-right", true);
      else if (up) this.player.anims.play("walk-up", true);
      else if (down) this.player.anims.play("walk-down", true);
      else this.player.anims.stop();
    }
  }
}
