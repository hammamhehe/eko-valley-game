import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const base = "assets/";

    this.load.image("menu_bg", base + "menu_bg.jpg");
    this.load.image("bg_grass", base + "bg_grass.jpg");

    this.load.spritesheet("player_sheet", base + "player_3.png", {
      frameWidth: 32,
      frameHeight: 64,
    });

    this.load.image("tree1_raw", base + "tree1.png");
    this.load.image("tree2_raw", base + "tree2.png");
    this.load.image("tree3_raw", base + "tree3.png");

    this.load.image("trash_cokelat_raw", base + "trashcokelat.png");
    this.load.image("trash_blue_raw", base + "trashblue.png");
    this.load.image("trash_green_raw", base + "trashgreen.png");

    this.load.audio("backsound", base + "backsound.mp3");
    this.load.audio("item_pickup", base + "item-pickup.mp3");

    this.load.on("loaderror", (file) => {
      console.error("Gagal memuat aset:", file.key, file.src);
    });
  }

  create() {
    // Menghapus background putih yang terhubung ke tepi gambar.
    // Bagian putih di dalam objek tidak dihapus jika tidak terhubung
    // ke tepi gambar, sehingga objek putih lebih aman dipertahankan.
    const removeWhiteBackground = (sourceKey, outputKey) => {
      if (!this.textures.exists(sourceKey)) return;

      const source = this.textures.get(sourceKey).getSourceImage();
      const width = source.width;
      const height = source.height;

      const canvasTexture = this.textures.createCanvas(outputKey, width, height);
      const ctx = canvasTexture.context;

      ctx.drawImage(source, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      let head = 0;
      let tail = 0;

      const isBackgroundWhite = (index) => {
        const p = index * 4;
        return pixels[p] >= 225 && pixels[p + 1] >= 225 && pixels[p + 2] >= 225;
      };

      const addPixel = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;

        const index = y * width + x;
        if (visited[index] || !isBackgroundWhite(index)) return;

        visited[index] = 1;
        queue[tail++] = index;
      };

      // Periksa seluruh tepi gambar.
      for (let x = 0; x < width; x++) {
        addPixel(x, 0);
        addPixel(x, height - 1);
      }

      for (let y = 0; y < height; y++) {
        addPixel(0, y);
        addPixel(width - 1, y);
      }

      // Hapus hanya area putih yang tersambung dengan tepi.
      while (head < tail) {
        const index = queue[head++];
        pixels[index * 4 + 3] = 0;

        const x = index % width;
        const y = Math.floor(index / width);

        addPixel(x - 1, y);
        addPixel(x + 1, y);
        addPixel(x, y - 1);
        addPixel(x, y + 1);
      }

      ctx.putImageData(imageData, 0, 0);
      canvasTexture.refresh();
    };

    // Buat tekstur baru dengan background transparan.
    removeWhiteBackground("tree1_raw", "tree1");
    removeWhiteBackground("tree2_raw", "tree2");
    removeWhiteBackground("tree3_raw", "tree3");

    removeWhiteBackground("trash_cokelat_raw", "trash_cokelat");
    removeWhiteBackground("trash_blue_raw", "trash_blue");
    removeWhiteBackground("trash_green_raw", "trash_green");

    const animations = [
      { key: "walk-down", start: 0, end: 2 },
      { key: "walk-left", start: 3, end: 5 },
      { key: "walk-right", start: 6, end: 8 },
      { key: "walk-up", start: 9, end: 11 },
    ];

    for (const anim of animations) {
      if (!this.anims.exists(anim.key)) {
        this.anims.create({
          key: anim.key,
          frames: this.anims.generateFrameNumbers("player_sheet", {
            start: anim.start,
            end: anim.end,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }

    // Tunggu font "Press Start 2P" selesai dimuat agar teks menu langsung tampil benar.
    // Jika gagal (misalnya offline) permainan tetap lanjut dengan font cadangan.
    const goToMenu = () => this.scene.start("MainMenuScene");

    if (typeof document !== "undefined" && document.fonts && document.fonts.load) {
      Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise((resolve) => setTimeout(resolve, 2500))]).then(goToMenu, goToMenu);
    } else {
      goToMenu();
    }
  }
}
