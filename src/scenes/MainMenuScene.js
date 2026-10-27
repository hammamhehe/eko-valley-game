import Phaser from "phaser";
import SoundFX from "../audio/SoundFX.js";
import { DW, DH, COL, PAL, css, makeText, drawWood, drawPanel, createButton, setupResponsive, coverScale, spawnLeaves, ensureCloudTexture } from "../ui/PixelUI.js";

const TIPS = [
  "TIPS: Plastik butuh ratusan tahun untuk terurai.",
  "TIPS: Bawa botol minum sendiri, kurangi plastik sekali pakai.",
  "TIPS: Pilah sampah organik dan anorganik di rumah.",
  "TIPS: Satu sampah yang kamu ambil membuat hutan lebih sehat.",
  "TIPS: Pakai dan daur ulang kembali. Reduce, Reuse, Recycle!",
];

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    // Hentikan musik dari scene sebelumnya (misalnya backsound Level 1)
    this.sound.stopAll();
    SoundFX.cancelSpeech();
    SoundFX.stopCue();

    this._pxTexts = [];
    this._textRes = 0;
    this.starting = false;
    this.popup = null;
    this.toast = null;
    this.selected = -1;
    this.tipIndex = 0;

    SoundFX.unlock();
    SoundFX.setEnabled(this.registry.get("audioEnabled") !== false);
    SoundFX.startTheme("menu");

    this.buildBackdrop();
    this.buildTitle();
    this.buildPanel();
    this.buildFooter();

    setupResponsive(this, (vw, vh) => this.onResize(vw, vh));

    this.cameras.main.fadeIn(350, 0, 0, 0);
    this.bindKeys();
    this.select(0, true);

    this.events.once("shutdown", () => {
      if (this.keyHandler && this.input.keyboard) this.input.keyboard.off("keydown", this.keyHandler);
    });
  }

  // ------------------------------------------------------------------
  // Tampilan
  // ------------------------------------------------------------------
  buildBackdrop() {
    if (this.textures.exists("menu_bg")) {
      this.bg = this.add.image(DW / 2, DH / 2, "menu_bg").setDepth(0);
    } else {
      this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0x6fb7e8).setDepth(0);
    }

    // Sedikit gelap di tepi agar panel lebih menonjol
    this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0x08200f, 0.14).setDepth(1);

    // Awan bergerak
    ensureCloudTexture(this);
    const left = -700;
    const right = DW + 700;
    for (let i = 0; i < 5; i++) {
      const s = Phaser.Math.FloatBetween(2, 3.6);
      const y = Phaser.Math.Between(30, 190);
      const x0 = Phaser.Math.Between(left, right);
      const cloud = this.add.image(x0, y, "px_cloud").setScale(s).setAlpha(0.85).setDepth(2);
      const speed = Phaser.Math.Between(12, 26); // px per detik

      const loop = () => {
        this.tweens.add({
          targets: cloud,
          x: { from: left, to: right },
          duration: ((right - left) / speed) * 1000,
          repeat: -1,
        });
      };

      this.tweens.add({
        targets: cloud,
        x: right,
        duration: ((right - x0) / speed) * 1000,
        onComplete: loop,
      });
    }

    spawnLeaves(this, 16, 5);
    this.addTrashDecor();
  }

  // Sampah melayang di kiri-kanan panel (mengingatkan misi permainan)
  addTrashDecor() {
    const spots = [
      ["trash_blue", DW / 2 - 300, 420],
      ["trash_green", DW / 2 - 360, 330],
      ["trash_cokelat", DW / 2 + 310, 380],
      ["trash_blue", DW / 2 + 365, 470],
    ];

    spots.forEach(([key, x, y], i) => {
      if (!this.textures.exists(key)) return;

      this.add.ellipse(x, y + 34, 44, 10, 0x000000, 0.25).setDepth(6);

      const img = this.add.image(x, y, key).setDepth(7);
      img.setScale(44 / img.height);

      this.tweens.add({
        targets: img,
        y: y - 10,
        angle: i % 2 ? 8 : -8,
        duration: 1300 + i * 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  buildTitle() {
    const title = this.add.container(DW / 2, 66).setDepth(20);

    const shadow = makeText(this, 5, 6, "EKO-VALLEY", { size: 46, color: "#3b2412" });
    const main = makeText(this, 0, 0, "EKO-VALLEY", {
      size: 46,
      color: css(COL.gold),
      stroke: css(COL.outline),
      strokeW: 10,
    });
    title.add([shadow, main]);

    this.tweens.add({
      targets: title,
      y: 66 - 7,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Pita subjudul
    const ribbon = this.add.container(DW / 2, 116).setDepth(20);
    const g = this.add.graphics();
    drawWood(g, -170, -16, 340, 32, PAL.woodHover, { grain: false });
    const sub = makeText(this, 0, 0, "RESTORASI HUTAN PIKSEL", {
      size: 10,
      color: css(COL.cream),
      stroke: css(COL.outline),
      strokeW: 4,
    });
    ribbon.add([g, sub]);

    this.tweens.add({
      targets: ribbon,
      y: 116 - 4,
      duration: 1500,
      delay: 250,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  buildPanel() {
    const px = DW / 2 - 190;
    const py = 176;

    const g = this.add.graphics().setDepth(20);
    drawPanel(g, px, py, 380, 364);

    // Avatar petani di atas tombol
    if (this.textures.exists("player_sheet")) {
      this.add.ellipse(DW / 2, 252, 70, 14, 0x000000, 0.35).setDepth(21);

      this.avatar = this.add.sprite(DW / 2, 252, "player_sheet", 1).setOrigin(0.5, 1).setScale(2).setDepth(22);

      this.tweens.add({
        targets: this.avatar,
        y: 249,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.items = [
      { id: "start", label: "MULAI" },
      { id: "help", label: "PETUNJUK" },
      { id: "sound", label: this.soundLabel() },
      { id: "exit", label: "KELUAR" },
    ];

    this.buttons = this.items.map((item, i) =>
      createButton(this, DW / 2, 292 + i * 62, 300, 52, item.label, {
        size: 14,
        onHover: () => this.select(i),
        onOut: () => {},
        onClick: () => this.activate(i, true),
      }).setDepth(22)
    );
  }

  buildFooter() {
    this.tipText = makeText(this, DW / 2, 566, TIPS[0], {
      size: 8,
      color: css(COL.cream),
      stroke: css(COL.outline),
      strokeW: 4,
    }).setDepth(30);

    this.hintText = makeText(this, DW / 2, 584, "W/S ATAU PANAH: PILIH     ENTER: OK", {
      size: 8,
      color: "#e8f5e9",
      stroke: css(COL.outline),
      strokeW: 4,
    }).setDepth(30);

    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: this.tipText,
          alpha: 0,
          duration: 250,
          onComplete: () => {
            this.tipIndex = (this.tipIndex + 1) % TIPS.length;
            this.tipText.setText(TIPS[this.tipIndex]);
            this.tweens.add({ targets: this.tipText, alpha: 1, duration: 250 });
          },
        });
      },
    });
  }

  onResize() {
    if (this.bg) coverScale(this.bg, this._viewW, this._viewH);
  }

  soundLabel() {
    return this.registry.get("audioEnabled") === false ? "SUARA: MATI" : "SUARA: NYALA";
  }

  // ------------------------------------------------------------------
  // Interaksi
  // ------------------------------------------------------------------
  select(i, silent = false) {
    if (i === this.selected) return;
    this.selected = i;
    this.buttons.forEach((b, k) => b.setSelected(k === i));

    if (silent) return;
    SoundFX.hover();

    // Petani berjalan sebentar saat pilihan berganti
    if (this.avatar && this.anims.exists("walk-down")) {
      this.avatar.play("walk-down", true);
      if (this.walkTimer) this.walkTimer.remove(false);
      this.walkTimer = this.time.delayedCall(550, () => {
        if (this.avatar && this.avatar.active) {
          this.avatar.anims.stop();
          this.avatar.setFrame(1);
        }
      });
    }
  }

  activate(i, fromPointer = false) {
    if (this.starting || this.popup) return;

    const item = this.items[i];
    if (!item) return;

    if (!fromPointer) {
      // Dari keyboard: bunyi klik dimainkan di sini (tombol sudah memainkan sendiri saat diklik mouse)
      SoundFX.click();
    }

    if (item.id === "start") this.startGame();
    else if (item.id === "help") this.openHelp();
    else if (item.id === "sound") this.toggleSound();
    else if (item.id === "exit") this.showToast("Untuk keluar, tutup tab browser ini. Sampai jumpa, Penjaga Hutan!");
  }

  startGame() {
    this.starting = true;

    // Reset skor saat memulai permainan baru
    this.registry.set("varkScores", { V: 0, A: 0, R: 0, K: 0 });
    this.registry.remove("visualScore");
    this.registry.remove("auditoryScore");

    SoundFX.stopTheme();

    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("IntroScene"));
  }

  toggleSound() {
    const on = this.registry.get("audioEnabled") === false;
    this.registry.set("audioEnabled", on);
    SoundFX.setEnabled(on);

    if (on) {
      SoundFX.startTheme("menu");
      SoundFX.click();
    }

    this.buttons[2].setLabel(this.soundLabel());
  }

  openHelp() {
    const layer = this.add.container(0, 0).setDepth(100);
    this.popup = layer;

    const dim = this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0x000000, 0.65).setInteractive();
    dim.on("pointerdown", () => this.closeHelp());

    const g = this.add.graphics();
    drawPanel(g, DW / 2 - 350, 56, 700, 488);

    layer.add([dim, g]);

    const x = DW / 2 - 300;
    const wrap = 600;
    let y = 96;

    const add = (str, o = {}) => {
      const t = makeText(this, x, y, str, Object.assign({ origin: [0, 0], align: "left", wrap, spacing: 8, size: 10 }, o));
      layer.add(t);
      y += t.height + (o.gap !== undefined ? o.gap : 10);
      return t;
    };

    const title = makeText(this, DW / 2, 90, "PETUNJUK", { size: 24, color: css(COL.gold), stroke: css(COL.outline), strokeW: 8 });
    layer.add(title);
    y = 136;

    const head = { size: 12, color: css(COL.gold), gap: 8 };
    add("MISI", head);
    add("Bersihkan hutan dari sampah plastik dan jadilah Penjaga Hutan sejati!", { gap: 18 });

    add("KONTROL", head);
    add("WASD / PANAH : Berjalan\nSPASI : Ambil sampah\nENTER : Pilih menu", { gap: 18 });

    add("SESI BELAJAR", head);
    add("1. VISUAL : cari sampah sesuai warna yang diminta.\n2. AUDITORY : dengarkan Miko dan suara hutan, lalu pilih jawaban.", { gap: 18 });

    const close = makeText(this, DW / 2, 512, "KLIK DI MANA SAJA UNTUK MENUTUP", { size: 8, color: css(COL.cream), stroke: css(COL.outline), strokeW: 4 });
    layer.add(close);
    this.tweens.add({ targets: close, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });

    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 160 });
  }

  closeHelp() {
    if (!this.popup) return;
    this.popup.destroy(true);
    this.popup = null;
    SoundFX.click();
  }

  showToast(message) {
    if (this.toast) this.toast.destroy(true);

    const c = this.add.container(DW / 2, 532).setDepth(120);
    const t = makeText(this, 0, 0, message, { size: 9, color: css(COL.ink), wrap: 520, spacing: 6 });
    const w = Math.max(240, t.width + 40);
    const h = t.height + 28;

    const g = this.add.graphics();
    drawWood(g, -w / 2, -h / 2, w, h, PAL.parch, { grain: false });

    c.add([g, t]);
    this.toast = c;

    this.time.delayedCall(3200, () => {
      if (this.toast === c) {
        c.destroy(true);
        this.toast = null;
      }
    });
  }

  bindKeys() {
    if (!this.input.keyboard) return;

    this.keyHandler = (e) => {
      if (this.starting) return;

      if (this.popup) {
        if (["Enter", "Space", "Escape"].includes(e.code)) this.closeHelp();
        return;
      }

      const n = this.items.length;

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.select((this.selected - 1 + n) % n);
          break;
        case "ArrowDown":
        case "KeyS":
          this.select((this.selected + 1) % n);
          break;
        case "Enter":
        case "Space":
          this.activate(this.selected);
          break;

        // ---- Jalan pintas untuk uji coba (boleh dihapus) ----
        case "Digit1":
          SoundFX.stopTheme();
          this.scene.start("Level1VScene");
          break;
        case "Digit2":
          SoundFX.stopTheme();
          this.scene.start("Level2AScene");
          break;
        default:
          break;
      }
    };

    this.input.keyboard.on("keydown", this.keyHandler);
  }

  update(time) {
    // Petunjuk pengaktifan musik selama browser masih memblokir audio
    if (this.hintText) {
      const locked = SoundFX.enabled && !SoundFX.isRunning();
      const txt = locked ? "KLIK ATAU TEKAN TOMBOL APA SAJA UNTUK MENYALAKAN MUSIK" : "W/S ATAU PANAH: PILIH     ENTER: OK";
      if (this.hintText.text !== txt) this.hintText.setText(txt);
      if (locked) this.hintText.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time / 450)));
      else this.hintText.setAlpha(1);
    }
  }
}
