import Phaser from "phaser";
import SoundFX from "../audio/SoundFX.js";
import { DW, DH, COL, PAL, css, makeText, drawWood, drawPanel, createButton, setupResponsive, coverScale, burst, floatText, spawnLeaves } from "../ui/PixelUI.js";

// =====================================================================
// IntroScene : cerita pembuka (4 bab) sebelum Level 1.
//  Bab 1  Lembah yang asri        -> klik burung (interaktif)
//  Bab 2  Sampah berjatuhan        -> animasi hujan sampah plastik
//  Bab 3  Bersihkan lembah!        -> klik semua sampah (interaktif)
//  Bab 4  Misimu & latihan         -> jalan (WASD) & ambil sampah (SPASI)
// =====================================================================
const PAGES = [
  {
    title: "BAB 1 : LEMBAH YANG ASRI",
    text: "Di sebuah lembah hijau, burung berkicau dan air mengalir jernih. Semua hidup damai di Eko-Valley. Coba klik burung yang terbang itu!",
  },
  {
    title: "BAB 2 : TAMU TAK DIUNDANG",
    text: "Suatu hari, sampah plastik berjatuhan dari mana-mana! Plastik butuh ratusan tahun untuk terurai, dan lembah pun mulai sakit.",
  },
  {
    title: "BAB 3 : BERSIHKAN LEMBAH!",
    text: "Aku Miko, penjaga hutan. Aku butuh bantuanmu! Klik semua sampah itu untuk membersihkannya.",
    locked: true,
  },
  {
    title: "BAB 4 : MISIMU",
    text: "Terima kasih! Tapi sampah akan datang lagi. Di Sesi VISUAL, cari sampah sesuai warna perintah. Di Sesi AUDITORY, dengarkan Miko. Ayo berlatih dulu!",
  },
];

const TRASH_KEYS = ["trash_blue", "trash_green", "trash_cokelat"];

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    this._pxTexts = [];
    this._textRes = 0;
    this.leaving = false;
    this.page = -1;
    this.typing = false;
    this.pageEvents = [];
    this.nextLocked = false;
    this.practice = null;

    SoundFX.unlock();
    SoundFX.setEnabled(this.registry.get("audioEnabled") !== false);
    SoundFX.cancelSpeech();

    // ---- Latar & suasana ----
    if (this.textures.exists("menu_bg")) this.bg = this.add.image(DW / 2, DH / 2, "menu_bg").setDepth(0);
    else this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0x6fb7e8).setDepth(0);

    this.mood = this.add
      .rectangle(DW / 2, DH / 2, 6000, 6000, 0x2b2620)
      .setDepth(1)
      .setAlpha(0);
    spawnLeaves(this, 8, 2);

    // Tumpukan sampah (posisi tetap supaya konsisten antar bab)
    this.pile = [];
    const keys = TRASH_KEYS.filter((k) => this.textures.exists(k));
    for (let i = 0; i < 8; i++) {
      this.pile.push({
        key: keys.length ? keys[i % keys.length] : null,
        x: 90 + i * 104 + Phaser.Math.Between(-18, 18),
        y: Phaser.Math.Between(335, 392),
        angle: Phaser.Math.Between(-35, 35),
      });
    }

    this.stage = this.add.container(0, 0).setDepth(10);
    this.buildDialog();

    setupResponsive(this, () => {
      if (this.bg) coverScale(this.bg, this._viewW, this._viewH);
    });

    this.keys = this.input.keyboard ? this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") : null;
    this.spaceKey = this.input.keyboard ? this.input.keyboard.addKey("SPACE") : null;

    this.keyHandler = (e) => this.onKey(e);
    if (this.input.keyboard) this.input.keyboard.on("keydown", this.keyHandler);

    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.events.once("shutdown", () => {
      this.clearPageEvents();
      SoundFX.cancelSpeech();
      SoundFX.stopCue();
      if (this.input.keyboard) this.input.keyboard.off("keydown", this.keyHandler);
    });

    this.goPage(0);
  }

  // ------------------------------------------------------------------
  // Kotak dialog tetap di bawah (Miko + teks + tombol)
  // ------------------------------------------------------------------
  buildDialog() {
    const ui = this.add.container(0, 0).setDepth(30);
    this.ui = ui;

    // Pita judul bab
    const rg = this.add.graphics();
    drawWood(rg, DW / 2 - 270, 12, 540, 40, PAL.wood, { grain: false });
    ui.add(rg);
    this.titleText = makeText(this, DW / 2, 33, "", { size: 12, color: css(COL.cream), stroke: css(COL.outline), strokeW: 5 });
    ui.add(this.titleText);

    // Titik halaman
    this.dots = [];
    for (let i = 0; i < PAGES.length; i++) {
      const d = this.add.rectangle(DW / 2 + (i - (PAGES.length - 1) / 2) * 22, 70, 12, 12, 0x3a2a1a).setStrokeStyle(2, COL.outline);
      ui.add(d);
      this.dots.push(d);
    }

    // Tombol atas
    this.skipBtn = createButton(this, 884, 32, 120, 34, "LEWATI", { size: 8, onClick: () => this.startGame() });
    this.soundBtn = createButton(this, 76, 32, 120, 34, "", { size: 8, onClick: () => this.toggleSound() });
    ui.add([this.skipBtn.container, this.soundBtn.container]);
    this.updateSoundLabel();

    // Kotak dialog
    const dg = this.add.graphics();
    drawWood(dg, 50, 420, 860, 152, PAL.parch, { grain: false });
    ui.add(dg);

    // Potret Miko
    const pg = this.add.graphics();
    drawWood(pg, 66, 434, 112, 124, PAL.woodDark, { outline: 3, grain: false });
    ui.add(pg);
    if (this.textures.exists("player_sheet")) {
      this.miko = this.add.sprite(122, 552, "player_sheet", 1).setOrigin(0.5, 1).setScale(1.7);
      ui.add(this.miko);
    }

    ui.add(makeText(this, 200, 442, "MIKO", { size: 10, color: "#8a5a30", origin: [0, 0.5] }));
    this.textObj = makeText(this, 200, 460, "", { size: 12, color: css(COL.ink), origin: [0, 0], align: "left", spacing: 9 });
    ui.add(this.textObj);

    this.nextBtn = createButton(this, 810, 520, 170, 50, "LANJUT", { size: 11, palN: PAL.woodHover, palH: PAL.wood, onClick: () => this.onNext() });
    ui.add(this.nextBtn.container);

    this.hint = makeText(this, DW / 2, 588, "ENTER / KLIK: LANJUT", { size: 8, stroke: css(COL.outline), strokeW: 3 });
    ui.add(this.hint);
  }

  updateSoundLabel() {
    this.soundBtn.setLabel(SoundFX.enabled ? "SUARA: ON" : "SUARA: OFF");
  }

  toggleSound() {
    const on = !SoundFX.enabled;
    this.registry.set("audioEnabled", on);
    SoundFX.setEnabled(on);
    this.updateSoundLabel();
    if (on && this.page >= 0) this.narrate(PAGES[this.page].text);
  }

  // ------------------------------------------------------------------
  // Mesin halaman
  // ------------------------------------------------------------------
  clearPageEvents() {
    this.pageEvents.forEach((e) => e && e.remove && e.remove(false));
    this.pageEvents = [];
    if (this.typeEvent) {
      this.typeEvent.remove(false);
      this.typeEvent = null;
    }
  }

  goPage(i) {
    this.clearPageEvents();
    SoundFX.cancelSpeech();
    SoundFX.stopCue();
    this.tweens.killTweensOf(this.mood);

    this.stage.removeAll(true);
    this.practice = null;
    this.page = i;

    const p = PAGES[i];
    this.titleText.setText(p.title);
    this.dots.forEach((d, k) => d.setFillStyle(k < i ? COL.leaf : k === i ? COL.gold : 0x3a2a1a));

    this.nextLocked = !!p.locked;
    this.nextBtn.setLabel(i === PAGES.length - 1 ? "MULAI MISI!" : "LANJUT");
    this.nextBtn.setDim(false);
    this.hint.setText(i === 3 ? "WASD / PANAH: JALAN    SPASI: AMBIL    ENTER: MULAI" : "ENTER / KLIK: LANJUT");

    if (i === 0) this.pageValley();
    else if (i === 1) this.pageRain();
    else if (i === 2) this.pageClean();
    else this.pagePractice();

    this.typeText(p.text);
  }

  onNext() {
    if (this.leaving) return;

    if (this.typing) {
      this.finishTyping(true);
      return;
    }

    if (this.nextLocked) {
      this.tweens.add({ targets: this.nextBtn.container, x: 820, duration: 50, yoyo: true, repeat: 3, onComplete: () => (this.nextBtn.container.x = 810) });
      floatText(this, 810, 480, "BERSIHKAN DULU!", css(COL.cream), 9);
      return;
    }

    if (this.page >= PAGES.length - 1) this.startGame();
    else this.goPage(this.page + 1);
  }

  onKey(e) {
    if (this.leaving) return;
    if (e.code === "Enter" || (e.code === "Space" && this.page !== 3) || (e.code === "ArrowRight" && this.page !== 3)) this.onNext();
    else if (e.code === "Space" && this.page === 3) this.tryPickup();
    else if (e.code === "Escape") this.startGame();
  }

  startGame() {
    if (this.leaving) return;

    if (!this.scene.get("Level1VScene")) {
      console.error('Scene "Level1VScene" tidak ditemukan. Periksa pendaftaran scene di src/main.js.');
      return;
    }

    this.leaving = true;
    SoundFX.cancelSpeech();
    SoundFX.stopCue();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Level1VScene"));
  }

  // ------------------------------------------------------------------
  // Teks berjalan (typewriter) + suara narasi Miko
  // ------------------------------------------------------------------
  typeText(str) {
    // Pecah baris dulu supaya kata tidak "melompat" saat diketik
    this.textObj.setWordWrapWidth(500);
    this.textObj.setText(str);
    let wrapped = str;
    if (this.textObj.getWrappedText) wrapped = this.textObj.getWrappedText(str).join("\n");
    this.textObj.setWordWrapWidth(0);
    this.textObj.setText("");

    this.fullText = wrapped;
    this.typed = 0;
    this.typing = true;
    this.nextBtn.setDim(true);

    const speaking = SoundFX.enabled && SoundFX.speechSupported;
    const delay = speaking ? 58 : 26;

    this.typeEvent = this.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        this.typed++;
        this.textObj.setText(this.fullText.slice(0, this.typed));
        if (this.typed % 3 === 0 && this.fullText[this.typed - 1] !== " ") SoundFX.tone(620 + (this.typed % 5) * 40, { dur: 0.03, type: "square", vol: 0.02 });
        if (this.typed >= this.fullText.length) this.finishTyping(false);
      },
    });

    this.narrate(str);
  }

  finishTyping(skipped) {
    if (this.typeEvent) {
      this.typeEvent.remove(false);
      this.typeEvent = null;
    }
    this.typing = false;
    this.textObj.setText(this.fullText);
    this.nextBtn.setDim(this.nextLocked);

    if (skipped) SoundFX.cancelSpeech();
  }

  narrate(text) {
    if (!SoundFX.enabled) return;
    SoundFX.speak(text);

    // Miko "berbicara": sedikit memantul selama teks berjalan
    if (this.miko) {
      this.tweens.killTweensOf(this.miko);
      this.miko.y = 552;
      this.tweens.add({
        targets: this.miko,
        y: 548,
        duration: 180,
        yoyo: true,
        repeat: Math.min(30, Math.floor(text.length / 8)),
        ease: "Sine.easeOut",
        onComplete: () => (this.miko.y = 552),
      });
    }
  }

  // ------------------------------------------------------------------
  // BAB 1 : lembah asri + burung yang bisa diklik
  // ------------------------------------------------------------------
  pageValley() {
    this.mood.setAlpha(0);
    this.time.delayedCall(500, () => this.page === 0 && SoundFX.playCue("birds"));

    for (let i = 0; i < 3; i++) this.makeBird(i);

    const hintTxt = makeText(this, DW / 2, 150, "KLIK BURUNGNYA!", { size: 10, color: css(COL.cream), stroke: css(COL.outline), strokeW: 5 });
    this.stage.add(hintTxt);
    this.tweens.add({ targets: hintTxt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  makeBird(i) {
    const baseY = 150 + i * 62;
    const c = this.add.container(-60 - i * 150, baseY);
    const g = this.add.graphics();
    c.add(g);
    c.setScale(2.6);

    let up = false;
    const draw = () => {
      g.clear();
      const wing = (sx) => {
        // sayap berbentuk "V": sx = -1 (kiri) atau 1 (kanan)
        g.fillStyle(0x4a2c17, 1);
        for (let k = 0; k < 4; k++) {
          const x = sx * (3 + k * 4) - (sx > 0 ? 0 : 4);
          const y = up ? -2 - k * 3 : 2 + k * 3;
          g.fillRect(x, y, 4, 3);
        }
      };
      wing(-1);
      wing(1);
      g.fillStyle(COL.outline, 1);
      g.fillRect(-4, -2, 8, 8);
      g.fillStyle(0xb5602f, 1);
      g.fillRect(-3, -1, 6, 6);
      g.fillStyle(0xf0d79a, 1);
      g.fillRect(-2, 2, 4, 3);
      g.fillStyle(COL.gold, 1);
      g.fillRect(4, 0, 3, 2);
    };
    draw();

    this.pageEvents.push(
      this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => {
          up = !up;
          draw();
        },
      }),
    );

    const vw = this._viewW || DW;
    const left = DW / 2 - vw / 2 - 80;
    const right = DW / 2 + vw / 2 + 80;

    this.tweens.add({
      targets: c,
      x: { from: left - i * 150, to: right },
      duration: 11000 + i * 2500,
      repeat: -1,
    });
    this.tweens.add({ targets: c, y: baseY + 24, duration: 900 + i * 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    c.setSize(24, 18);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => {
      const f = 2400 + Math.random() * 1400;
      SoundFX.tone(f, { dur: 0.09, type: "sine", vol: 0.14, to: f * 1.5 });
      SoundFX.tone(f * 1.4, { t: 0.1, dur: 0.08, type: "sine", vol: 0.12, to: f });
      floatText(this, c.x, c.y - 30, "CIT CIT!", css(COL.gold), 10);
      burst(this, c.x, c.y, { count: 10, colors: [COL.gold, COL.cream], size: 4, depth: 60 });
    });

    this.stage.add(c);
  }

  // ------------------------------------------------------------------
  // BAB 2 : hujan sampah plastik
  // ------------------------------------------------------------------
  makeTrash(p, depthBase = 0) {
    if (!p.key) return null;
    const img = this.add.image(p.x, p.y, p.key);
    img.setScale(46 / img.height);
    img.setAngle(p.angle);
    img.setDepth(depthBase + p.y);
    return img;
  }

  pageRain() {
    this.tweens.add({ targets: this.mood, alpha: 0.5, duration: 2600, ease: "Sine.easeIn" });
    SoundFX.playCue("plastic");

    this.pile.forEach((p, i) => {
      if (!p.key) return;
      const shadow = this.add.ellipse(p.x, p.y + 20, 44, 10, 0x000000, 0.3).setAlpha(0);
      const img = this.add.image(p.x, -70, p.key);
      img.setScale(46 / img.height);
      img.setAngle(p.angle + 200);
      this.stage.add([shadow, img]);

      this.tweens.add({
        targets: img,
        y: p.y,
        angle: p.angle,
        duration: 900,
        delay: 250 + i * 240,
        ease: "Bounce.easeOut",
        onComplete: () => {
          shadow.setAlpha(1);
          SoundFX.tone(130, { dur: 0.1, type: "triangle", vol: 0.1, to: 60 });
        },
      });
    });

    // Teks peringatan berkedip
    const warn = makeText(this, DW / 2, 150, "AWAS!", { size: 22, color: "#ff8a6a", stroke: css(COL.outline), strokeW: 8 });
    this.stage.add(warn);
    this.tweens.add({ targets: warn, alpha: 0, scale: 1.4, duration: 1600, delay: 300 });
  }

  // ------------------------------------------------------------------
  // BAB 3 : klik semua sampah
  // ------------------------------------------------------------------
  pageClean() {
    this.mood.setAlpha(0.5);

    this.remaining = this.pile.filter((p) => p.key).length;
    this.counter = makeText(this, DW / 2, 108, "", { size: 11, color: css(COL.cream), stroke: css(COL.outline), strokeW: 5 });
    this.stage.add(this.counter);
    this.updateCounter();

    this.pile.forEach((p) => {
      if (!p.key) return;
      const shadow = this.add.ellipse(p.x, p.y + 20, 44, 10, 0x000000, 0.3);
      const img = this.makeTrash(p);
      this.stage.add([shadow, img]);

      const baseScale = img.scale;
      img.setInteractive({ useHandCursor: true });
      img.on("pointerover", () => img.setScale(baseScale * 1.2));
      img.on("pointerout", () => img.setScale(baseScale));
      img.on("pointerdown", () => this.cleanOne(img, shadow));

      // Kilau kecil agar terlihat bisa diklik
      this.tweens.add({ targets: img, y: p.y - 4, duration: 700 + Math.random() * 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
  }

  updateCounter() {
    this.counter.setText(this.remaining > 0 ? `SISA SAMPAH: ${this.remaining}` : "LEMBAH BERSIH!");
  }

  cleanOne(img, shadow) {
    if (!img.input || !img.input.enabled) return;
    img.disableInteractive();
    this.tweens.killTweensOf(img);

    const total = this.pile.filter((p) => p.key).length;
    this.remaining--;
    this.updateCounter();
    this.mood.setAlpha(0.5 * (this.remaining / total));

    const n = 1 + (total - this.remaining);
    SoundFX.tone(660 + n * 70, { dur: 0.08, type: "square", vol: 0.1 });
    SoundFX.tone(990 + n * 70, { t: 0.07, dur: 0.1, type: "square", vol: 0.08 });
    burst(this, img.x, img.y, { count: 14, colors: [COL.leafLight, COL.leaf, COL.cream], depth: 70 });

    this.tweens.add({ targets: [img, shadow], alpha: 0, scale: 0.1, y: img.y - 30, duration: 260, ease: "Back.easeIn", onComplete: () => shadow.destroy() });

    if (this.remaining <= 0) this.cleanDone();
  }

  cleanDone() {
    this.nextLocked = false;
    this.mood.setAlpha(0);
    SoundFX.correct();

    const flash = this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0xfff3c4, 0.6).setDepth(25);
    this.tweens.add({ targets: flash, alpha: 0, duration: 900, onComplete: () => flash.destroy() });
    burst(this, DW / 2, 260, { count: 40, speed: 300, colors: [COL.gold, COL.leaf, COL.leafLight, COL.cream], depth: 80 });

    if (this.page === 2) {
      this.time.delayedCall(700, () => {
        if (this.page !== 2) return;
        this.finishTyping(true);
        const msg = "Hebat, lembahnya bersih kembali! Tapi sampah masih banyak di luar sana. Siap jadi Penjaga Hutan?";
        this.typeText(msg);
        this.nextBtn.setDim(false);
      });
    }
  }

  // ------------------------------------------------------------------
  // BAB 4 : papan misi + latihan jalan & ambil sampah
  // ------------------------------------------------------------------
  pagePractice() {
    this.mood.setAlpha(0);
    const S = this.stage;

    // Dua papan misi
    const board = (x, title, body, chips) => {
      const g = this.add.graphics();
      drawWood(g, x, 84, 420, 92, PAL.wood, { nails: true });
      S.add(g);
      S.add(makeText(this, x + 22, 108, title, { size: 10, color: css(COL.gold), origin: [0, 0.5], stroke: css(COL.outline), strokeW: 4 }));
      S.add(makeText(this, x + 22, 140, body, { size: 8, origin: [0, 0.5], align: "left", wrap: chips ? 280 : 370, spacing: 6, stroke: css(COL.outline), strokeW: 3 }));
      if (chips) {
        chips.forEach((c, k) => {
          const r = this.add.rectangle(x + 340 + k * 24, 140, 18, 18, c).setStrokeStyle(3, COL.outline);
          S.add(r);
        });
      }
    };
    board(50, "SESI 1 : VISUAL", "Cari sampah sesuai WARNA yang diminta.", [0x439bd3, 0x5bbd64, 0xb87543]);
    board(490, "SESI 2 : AUDITORY", "DENGARKAN Miko dan suara hutan, lalu jawab.", null);

    // Area latihan
    const area = { x1: 270, x2: 890, y1: 232, y2: 400 };
    const ag = this.add.graphics();
    ag.fillStyle(COL.outline, 1);
    ag.fillRect(area.x1 - 4, area.y1 - 4, area.x2 - area.x1 + 8, area.y2 - area.y1 + 8);
    ag.fillStyle(0x2f5d2a, 0.72);
    ag.fillRect(area.x1, area.y1, area.x2 - area.x1, area.y2 - area.y1);
    S.add(ag);

    S.add(makeText(this, 60, 206, "LATIHAN", { size: 10, color: css(COL.gold), origin: [0, 0.5], stroke: css(COL.outline), strokeW: 4 }));

    // Tuts keyboard (menyala saat ditekan)
    const caps = {};
    const cap = (id, label, x, y, w) => {
      const g = this.add.graphics();
      const t = makeText(this, x, y - 2, label, { size: 10, color: css(COL.cream), stroke: css(COL.outline), strokeW: 4 });
      S.add([g, t]);
      caps[id] = { g, x, y, w, on: null };
      this.drawCap(caps[id], false);
    };
    cap("W", "W", 125, 258, 40);
    cap("A", "A", 81, 302, 40);
    cap("S", "S", 125, 302, 40);
    cap("D", "D", 169, 302, 40);
    cap("SPACE", "SPASI", 125, 352, 130);
    S.add(makeText(this, 125, 382, "JALAN & AMBIL", { size: 8, color: css(COL.cream), stroke: css(COL.outline), strokeW: 3 }));

    // Pemain latihan
    this.practice = { area, caps, count: 0, trash: null, last: 0 };
    const pr = this.practice;
    pr.player = this.add
      .sprite((area.x1 + area.x2) / 2, 360, "player_sheet", 1)
      .setOrigin(0.5, 1)
      .setScale(1.4);
    pr.shadow = this.add.ellipse(pr.player.x, pr.player.y, 36, 9, 0x000000, 0.35);
    pr.counter = makeText(this, area.x2 - 12, area.y1 + 16, "LATIHAN: 0 / 3", { size: 9, origin: [1, 0.5], stroke: css(COL.outline), strokeW: 4 });
    S.add([pr.shadow, pr.player, pr.counter]);
    this.spawnPracticeTrash();
  }

  drawCap(c, on) {
    if (c.on === on) return;
    c.on = on;
    const g = c.g;
    g.clear();
    drawWood(g, c.x - c.w / 2, c.y - 17 + (on ? 3 : 0), c.w, 34, on ? PAL.woodHover : PAL.wood, { grain: false });
  }

  spawnPracticeTrash() {
    const pr = this.practice;
    if (!pr) return;
    const keys = TRASH_KEYS.filter((k) => this.textures.exists(k));
    if (!keys.length) return;

    const x = Phaser.Math.Between(pr.area.x1 + 50, pr.area.x2 - 50);
    const y = Phaser.Math.Between(pr.area.y1 + 90, pr.area.y2 - 12);
    const img = this.add.image(x, y, Phaser.Utils.Array.GetRandom(keys));
    img.setScale(34 / img.height);
    img.setDepth(0);
    this.stage.add(img);
    pr.trash = img;
    this.tweens.add({ targets: img, scale: img.scale * 1.15, duration: 500, yoyo: true, repeat: -1 });
  }

  tryPickup() {
    const pr = this.practice;
    if (!pr || !pr.trash) return;

    const d = Phaser.Math.Distance.Between(pr.player.x, pr.player.y - 20, pr.trash.x, pr.trash.y);
    if (d > 70) {
      floatText(this, pr.player.x, pr.player.y - 100, "DEKATI SAMPAH!", css(COL.cream), 8);
      return;
    }

    const t = pr.trash;
    pr.trash = null;
    this.tweens.killTweensOf(t);
    burst(this, t.x, t.y, { count: 14, colors: [COL.leafLight, COL.gold, COL.cream], depth: 80 });
    t.destroy();
    SoundFX.tone(880, { dur: 0.08, vol: 0.12 });
    SoundFX.tone(1320, { t: 0.07, dur: 0.12, vol: 0.1 });

    pr.count++;
    pr.counter.setText(`LATIHAN: ${Math.min(3, pr.count)} / 3`);
    floatText(this, pr.player.x, pr.player.y - 100, "+1", css(COL.gold), 14);

    if (pr.count >= 3) {
      pr.counter.setText("LATIHAN SELESAI!");
      pr.counter.setColor(css(COL.leafLight));
      SoundFX.correct();
      burst(this, pr.player.x, pr.player.y - 60, { count: 30, speed: 260, colors: [COL.gold, COL.leaf, COL.cream], depth: 80 });
      this.tweens.add({ targets: this.nextBtn.container, scaleX: 1.12, scaleY: 1.12, duration: 300, yoyo: true, repeat: 3 });
      if (!this.typing) {
        this.typeText("Mantap! Kamu sudah siap. Tekan MULAI MISI dan bersihkan hutan dari sampah plastik!");
        this.nextBtn.setDim(false);
      }
    } else {
      this.spawnPracticeTrash();
    }
  }

  // ------------------------------------------------------------------
  update(time, delta) {
    const pr = this.practice;
    if (!pr || !this.keys) return;

    const k = this.keys;
    const left = k.LEFT.isDown || k.A.isDown;
    const right = k.RIGHT.isDown || k.D.isDown;
    const up = k.UP.isDown || k.W.isDown;
    const down = k.DOWN.isDown || k.S.isDown;

    // Tuts menyala sesuai tombol yang ditekan
    this.drawCap(pr.caps.W, up);
    this.drawCap(pr.caps.A, left);
    this.drawCap(pr.caps.S, down);
    this.drawCap(pr.caps.D, right);
    this.drawCap(pr.caps.SPACE, !!(this.spaceKey && this.spaceKey.isDown));

    const speed = 170;
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    if (vx && vy) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    const p = pr.player;
    p.x = Phaser.Math.Clamp(p.x + (vx * speed * delta) / 1000, pr.area.x1 + 20, pr.area.x2 - 20);
    p.y = Phaser.Math.Clamp(p.y + (vy * speed * delta) / 1000, pr.area.y1 + 90, pr.area.y2 - 4);
    pr.shadow.setPosition(p.x, p.y);

    if (this.anims.exists("walk-down")) {
      if (left) p.anims.play("walk-left", true);
      else if (right) p.anims.play("walk-right", true);
      else if (up) p.anims.play("walk-up", true);
      else if (down) p.anims.play("walk-down", true);
      else if (p.anims.isPlaying) {
        p.anims.stop();
        p.setFrame(1);
      }
    }
  }
}
