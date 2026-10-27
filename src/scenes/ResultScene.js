import Phaser from "phaser";
import SoundFX from "../audio/SoundFX.js";
import { DW, DH, COL, PAL, css, makeText, drawWood, drawPanel, createButton, setupResponsive, burst, floatText } from "../ui/PixelUI.js";

// =====================================================================
// ResultScene : layar penilaian setelah Sesi 1 (Visual) selesai.
// Dipanggil oleh Level1VScene lewat scene.launch("ResultScene", data)
// data = { score, total, mistakes, timeLeft, timeTotal, cleared }
// =====================================================================
const RANKS = [
  { stars: 3, title: "PAHLAWAN HUTAN", msg: "Luar biasa! Matamu jeli, lembah pun bersih berkilau." },
  { stars: 2, title: "PENJAGA HUTAN", msg: "Bagus! Sedikit lagi lembah bersih sempurna." },
  { stars: 1, title: "RELAWAN HIJAU", msg: "Lumayan! Baca warna perintah lebih teliti, ya." },
  { stars: 0, title: "PENGAMAT PEMULA", msg: "Jangan menyerah! Hutan masih menunggu bantuanmu." },
];

const FACTS = [
  "Plastik butuh ratusan tahun untuk terurai di alam.",
  "Sampah plastik di sungai bisa termakan ikan dan hewan air.",
  "Memilah sampah membuat daur ulang jadi lebih mudah.",
  "Membawa botol minum sendiri mengurangi sampah plastik.",
  "Satu langkah kecil dari kita membuat hutan lebih sehat.",
];

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    const d = data || {};
    this.res = {
      score: d.score || 0,
      total: d.total || 30,
      mistakes: d.mistakes || 0,
      timeLeft: d.timeLeft || 0,
      timeTotal: d.timeTotal || 60,
      cleared: !!d.cleared,
    };
  }

  create() {
    this._pxTexts = [];
    this._textRes = 0;
    this.leaving = false;

    const r = this.res;
    this.pct = Math.min(1, r.score / Math.max(1, r.total));
    const attempts = r.score + r.mistakes;
    this.accuracy = attempts > 0 ? Math.round((r.score / attempts) * 100) : 0;
    this.gold = Math.max(0, r.score * 25 + r.timeLeft * 2 - r.mistakes * 5);

    const stars = this.pct >= 0.6 ? 3 : this.pct >= 0.33 ? 2 : this.pct >= 0.13 ? 1 : 0;
    this.rank = RANKS.find((x) => x.stars === stars);
    this.registry.set("visualStars", stars);
    this.registry.set("gold", this.gold);

    // Musik Level 1 dihentikan; suara efek dibuat lewat SoundFX
    this.sound.stopAll();
    SoundFX.unlock();
    SoundFX.setEnabled(this.registry.get("audioEnabled") !== false);

    this.add
      .rectangle(DW / 2, DH / 2, 6000, 6000, 0x04120a, 0.86)
      .setDepth(0)
      .setInteractive();

    setupResponsive(this);

    this.build(stars);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.keyHandler = (e) => {
      if (this.leaving) return;
      if (e.code === "Enter" || e.code === "Space") this.goNext();
      else if (e.code === "KeyR") this.replay();
      else if (e.code === "Escape" || e.code === "KeyM") this.toMenu();
    };
    if (this.input.keyboard) this.input.keyboard.on("keydown", this.keyHandler);

    this.events.once("shutdown", () => {
      SoundFX.cancelSpeech();
      if (this.input.keyboard) this.input.keyboard.off("keydown", this.keyHandler);
    });
  }

  // ------------------------------------------------------------------
  build(stars) {
    const r = this.res;
    const cx = DW / 2;

    // Panel kayu
    const g = this.add.graphics().setDepth(5);
    drawPanel(g, cx - 360, 28, 720, 548);

    // Pita judul
    const ribbon = this.add.graphics().setDepth(6);
    drawWood(ribbon, cx - 270, 8, 540, 52, PAL.woodHover, { grain: false });
    makeText(this, cx, 34, r.cleared ? "HUTAN BERSIH!" : "SESI VISUAL SELESAI!", {
      size: 18,
      color: css(COL.cream),
      stroke: css(COL.outline),
      strokeW: 6,
    }).setDepth(7);

    // Bintang
    this.starGfx = [];
    for (let i = 0; i < 3; i++) this.starGfx.push(this.drawStar(cx + (i - 1) * 92, 112, i < stars));

    // Pangkat
    this.rankText = makeText(this, cx, 168, "", { size: 14, color: css(COL.gold), stroke: css(COL.outline), strokeW: 6 }).setDepth(7);

    // Meter kebersihan lembah
    makeText(this, cx, 204, "KEBERSIHAN LEMBAH", { size: 9, color: css(COL.leafLight), stroke: css(COL.outline), strokeW: 4 }).setDepth(7);
    this.meterX = cx - 270;
    this.meterY = 222;
    this.meterW = 540;
    this.meter = this.add.graphics().setDepth(7);
    this.meterText = makeText(this, cx, this.meterY + 14, "0%", { size: 11, color: css(COL.cream), stroke: css(COL.outline), strokeW: 5 }).setDepth(9);
    this.drawMeter(0);

    // Empat kotak statistik
    const stats = [
      { label: "SAMPAH", value: () => `${r.score} / ${r.total}` },
      { label: "AKURASI", value: () => `${this.accuracy}%` },
      { label: "SISA WAKTU", value: () => `${r.timeLeft} DET` },
      { label: "GOLD", value: () => `+${this.gold}` },
    ];
    this.statTexts = stats.map((st, i) => {
      const x = cx - 252 + i * 168;
      const box = this.add.graphics().setDepth(6);
      drawWood(box, x - 78, 262, 156, 62, PAL.woodDark, { outline: 3, grain: false });
      makeText(this, x, 280, st.label, { size: 8, color: css(COL.cream) }).setDepth(7);
      const v = makeText(this, x, 306, "-", { size: 14, color: css(COL.gold), stroke: css(COL.outline), strokeW: 5 }).setDepth(7);
      v.setAlpha(0.35);
      return { text: v, get: st.value };
    });

    // Pesan & fakta
    this.msgText = makeText(this, cx, 358, "", { size: 10, wrap: 600, spacing: 8 }).setDepth(7);
    makeText(this, cx, 410, "TAHUKAH KAMU?", { size: 8, color: css(COL.gold), stroke: css(COL.outline), strokeW: 4 }).setDepth(7);
    makeText(this, cx, 438, Phaser.Utils.Array.GetRandom(FACTS), { size: 8, color: "#e8f5e9", wrap: 560, spacing: 8 }).setDepth(7);

    // Tombol
    this.nextBtn = createButton(this, cx, 486, 460, 52, "LANJUT KE SESI AUDITORY", {
      size: 13,
      palN: PAL.woodHover,
      palH: PAL.wood,
      onClick: () => this.goNext(),
    }).setDepth(8);
    this.againBtn = createButton(this, cx - 130, 540, 230, 36, "MAIN LAGI [R]", { size: 9, onClick: () => this.replay() }).setDepth(8);
    this.menuBtn = createButton(this, cx + 130, 540, 230, 36, "MENU UTAMA [M]", { size: 9, onClick: () => this.toMenu() }).setDepth(8);

    this.tweens.add({ targets: this.nextBtn.container, scaleX: 1.03, scaleY: 1.03, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Dekorasi: Miko bersorak & tong sampah
    this.addDecor();

    this.playIntro(stars);
  }

  drawStar(x, y, earned) {
    const g = this.add.graphics().setDepth(8);
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rad = k % 2 === 0 ? 34 : 15;
      pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    g.fillStyle(COL.outline, 1);
    g.lineStyle(8, COL.outline, 1);
    g.strokePoints(pts, true);
    g.fillPoints(pts, true);
    g.fillStyle(earned ? COL.gold : 0x5a4d3f, 1);
    g.fillPoints(
      pts.map((p) => ({ x: p.x * 0.78, y: p.y * 0.78 })),
      true,
    );
    g.setPosition(x, y);
    g.setScale(0);
    g.earned = earned;
    return g;
  }

  drawMeter(p) {
    const g = this.meter;
    g.clear();
    const x = this.meterX;
    const y = this.meterY;
    const w = this.meterW;

    g.fillStyle(COL.outline, 1);
    g.fillRect(x - 4, y - 4, w + 8, 36);
    g.fillStyle(0x1d3322, 1);
    g.fillRect(x, y, w, 28);

    const fill = Math.floor((w * p) / 12) * 12; // blok pixel selebar 12px
    for (let i = 0; i < fill; i += 12) {
      g.fillStyle(i / w > 0.66 ? COL.leafLight : COL.leaf, 1);
      g.fillRect(x + i + 1, y + 2, 10, 24);
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(x + i + 1, y + 2, 10, 4);
    }
  }

  addDecor() {
    // Miko di kiri
    if (this.textures.exists("player_sheet")) {
      this.add.ellipse(60, 500, 70, 14, 0x000000, 0.35).setDepth(4);
      this.miko = this.add.sprite(60, 500, "player_sheet", 1).setOrigin(0.5, 1).setScale(2.4).setDepth(4);
      this.tweens.add({ targets: this.miko, y: 492, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeOut" });
    }

    // Tong sampah daur ulang di kanan
    const bx = 902;
    const by = 500;
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(bx, by + 2, 74, 14);
    g.fillStyle(COL.outline, 1);
    g.fillRect(bx - 32, by - 70, 64, 70);
    g.fillStyle(0x5bbd64, 1);
    g.fillRect(bx - 28, by - 66, 56, 62);
    g.fillStyle(0x3f7a2f, 1);
    g.fillRect(bx - 28, by - 12, 56, 8);
    g.fillStyle(COL.outline, 1);
    g.fillRect(bx - 38, by - 82, 76, 14);
    g.fillStyle(0x6fb04a, 1);
    g.fillRect(bx - 34, by - 80, 68, 8);
    g.fillStyle(COL.cream, 1);
    g.fillRect(bx - 4, by - 52, 8, 28);
    g.fillRect(bx - 12, by - 44, 8, 12);
    g.fillRect(bx + 4, by - 44, 8, 12);
    this.bin = g;
    this.binX = bx;
    this.binY = by;
  }

  // ------------------------------------------------------------------
  playIntro(stars) {
    const r = this.res;

    // Bintang muncul satu per satu
    this.starGfx.forEach((sg, i) => {
      this.tweens.add({
        targets: sg,
        scale: 1,
        duration: 340,
        delay: 350 + i * 300,
        ease: "Back.easeOut",
        onStart: () => {
          if (sg.earned) SoundFX.star(i);
        },
      });
    });

    // Meter naik
    const meter = { v: 0 };
    this.tweens.add({
      targets: meter,
      v: this.pct,
      duration: 1300,
      delay: 300,
      ease: "Sine.easeOut",
      onUpdate: () => {
        this.drawMeter(meter.v);
        this.meterText.setText(`${Math.round(meter.v * 100)}%`);
      },
    });

    // Statistik muncul berurutan
    this.statTexts.forEach((st, i) => {
      this.time.delayedCall(1100 + i * 380, () => {
        st.text.setText(st.get());
        st.text.setAlpha(1);
        SoundFX.tone(660 + i * 110, { dur: 0.08, vol: 0.1 });
        this.tweens.add({ targets: st.text, scale: 1.25, duration: 120, yoyo: true });

        // Sampah "masuk" tong saat angka sampah muncul
        if (i === 0) this.dropIntoBin(Math.min(8, r.score));
      });
    });

    // Pangkat & pesan
    this.time.delayedCall(2700, () => {
      this.rankText.setText(`PANGKAT: ${this.rank.title}`);
      this.msgText.setText(this.rank.msg);
      if (stars >= 1) {
        SoundFX.win();
        burst(this, DW / 2, 112, { count: 34, speed: 280, colors: [COL.gold, COL.leaf, COL.leafLight, COL.cream], depth: 50 });
      } else {
        SoundFX.tone(330, { dur: 0.3, type: "triangle", vol: 0.1, to: 220 });
      }

      if (SoundFX.enabled) {
        this.time.delayedCall(900, () => {
          if (!this.leaving) SoundFX.speak(`Sesi visual selesai. Kamu mengumpulkan ${r.score} sampah. ${this.rank.msg}`);
        });
      }
    });
  }

  dropIntoBin(n) {
    const keys = ["trash_blue", "trash_green", "trash_cokelat"].filter((k) => this.textures.exists(k));
    if (!keys.length || !this.bin) return;

    for (let i = 0; i < n; i++) {
      const img = this.add.image(this.binX - 160 - Math.random() * 40, this.binY - 190 - Math.random() * 40, Phaser.Utils.Array.GetRandom(keys)).setDepth(10);
      img.setScale(26 / img.height);
      img.setAlpha(0);

      this.tweens.add({
        targets: img,
        alpha: 1,
        x: this.binX,
        y: this.binY - 76,
        angle: 360,
        scale: 0.02,
        duration: 650,
        delay: i * 150,
        ease: "Quad.easeIn",
        onComplete: () => {
          img.destroy();
          SoundFX.tone(260 + i * 25, { dur: 0.07, type: "triangle", vol: 0.08 });
          this.tweens.add({ targets: this.bin, y: -4, duration: 60, yoyo: true });
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // Navigasi
  // ------------------------------------------------------------------
  goNext() {
    if (this.leaving) return;

    // Pengaman: pastikan Level2AScene terdaftar di main.js
    if (!this.scene.get("Level2AScene")) {
      this.toast('Level2AScene belum terdaftar. Periksa "src/main.js".');
      console.error('Scene "Level2AScene" tidak ditemukan. Daftarkan di src/main.js.');
      return;
    }

    this.leaveTo("Level2AScene");
  }

  replay() {
    this.leaveTo("Level1VScene");
  }

  toMenu() {
    this.leaveTo("MainMenuScene");
  }

  leaveTo(key) {
    if (this.leaving) return;
    this.leaving = true;
    SoundFX.cancelSpeech();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop("Level1VScene");
      this.scene.start(key);
    });
  }

  toast(msg) {
    if (this.toastObj) this.toastObj.destroy();
    this.toastObj = makeText(this, DW / 2, 450, msg, { size: 9, color: "#ffd9a0", stroke: css(COL.outline), strokeW: 5, wrap: 600 }).setDepth(50);
    this.time.delayedCall(3000, () => {
      if (this.toastObj) this.toastObj.destroy();
    });
  }
}
