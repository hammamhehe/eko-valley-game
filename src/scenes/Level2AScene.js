import Phaser from "phaser";
import SoundFX from "../audio/SoundFX.js";
import { DW, DH, COL, PAL, css, makeText, drawWood, drawPanel, createButton, setupResponsive, coverScale, burst, floatText, spawnLeaves } from "../ui/PixelUI.js";

// =====================================================================
// SESI 2 : AUDITORY  -  "Dengarkan Hutan"
// Pemain belajar lewat PENDENGARAN:
//   - "dengar" : Miko membacakan pertanyaan + pilihan jawaban (suara).
//   - "suara"  : pemain menebak suara hutan (burung, gergaji, plastik).
// Tema materi sama dengan Level 1: sampah plastik & kebersihan hutan.
// =====================================================================
const ROUNDS = [
  {
    type: "dengar",
    q: "Berapa lama waktu yang dibutuhkan plastik untuk terurai di alam?",
    answers: ["Satu minggu", "Satu bulan", "Ratusan tahun"],
    correct: 2,
    explain: "Plastik sangat sulit terurai. Butuh ratusan tahun, jadi jangan dibuang sembarangan!",
  },
  {
    type: "suara",
    cue: "birds",
    intro: "Dengarkan baik-baik! Suara apakah ini?",
    answers: ["Kicau burung", "Mesin gergaji", "Hujan deras"],
    correct: 0,
    explain: "Itu kicau burung. Hutan yang bersih dan sehat dipenuhi suara satwa.",
  },
  {
    type: "dengar",
    q: "Apa kepanjangan dari 3R dalam mengelola sampah?",
    answers: ["Reduce, Reuse, Recycle", "Run, Rest, Repeat", "Read, Rewrite, Repeat"],
    correct: 0,
    explain: "3R artinya Reduce atau kurangi, Reuse atau pakai ulang, dan Recycle atau daur ulang.",
  },
  {
    type: "dengar",
    q: "Cara apa yang paling baik untuk mengurangi sampah plastik sekali pakai?",
    answers: ["Membawa tas belanja dan botol minum sendiri", "Membakar sampah plastik di kebun", "Membuang plastik ke parit"],
    correct: 0,
    explain: "Membawa tas dan botol sendiri mengurangi plastik sekali pakai dari sumbernya.",
  },
  {
    type: "suara",
    cue: "chainsaw",
    intro: "Ada suara yang lain! Dengarkan, suara apakah ini?",
    answers: ["Aliran sungai", "Mesin gergaji", "Angin sepoi-sepoi"],
    correct: 1,
    explain: "Itu mesin gergaji. Menebang pohon sembarangan membuat satwa kehilangan rumah.",
  },
  {
    type: "dengar",
    q: "Apa yang dihasilkan jika sampah plastik dibakar?",
    answers: ["Pupuk untuk tanaman", "Asap beracun yang mencemari udara", "Udara yang lebih segar"],
    correct: 1,
    explain: "Membakar plastik menghasilkan asap beracun yang berbahaya bagi pernapasan dan lingkungan.",
  },
  {
    type: "suara",
    cue: "plastic",
    intro: "Satu lagi! Dengarkan, suara apakah ini?",
    answers: ["Air menetes", "Plastik diremas", "Petir menyambar"],
    correct: 1,
    explain: "Itu suara plastik diremas. Plastik tidak hancur di tanah, jadi kumpulkan dan daur ulang.",
  },
  {
    type: "dengar",
    q: "Botol plastik bekas sebaiknya dibuang ke tempat sampah yang mana?",
    answers: ["Sampah organik (hijau)", "Sampah anorganik (kuning)", "Sampah B3 (merah)"],
    correct: 1,
    explain: "Botol plastik termasuk sampah anorganik. Pilah dulu supaya mudah didaur ulang.",
  },
];

const LETTERS = ["A", "B", "C"];

function prepareRounds() {
  return ROUNDS.map((r) => {
    const order = Phaser.Utils.Array.Shuffle([0, 1, 2]);
    return Object.assign({}, r, {
      answers: order.map((i) => r.answers[i]),
      correct: order.indexOf(r.correct),
    });
  });
}

export default class Level2AScene extends Phaser.Scene {
  constructor() {
    super("Level2AScene");
  }

  create() {
    this._pxTexts = [];
    this._textRes = 0;

    // Hentikan musik Level 1 supaya telinga fokus pada sesi ini
    this.sound.stopAll();
    SoundFX.unlock();
    SoundFX.stopTheme();
    SoundFX.setEnabled(this.registry.get("audioEnabled") !== false);
    SoundFX.cancelSpeech();
    SoundFX.stopCue();

    this.rounds = prepareRounds();
    this.index = 0;
    this.score = 0;
    this.answered = false;
    this.showText = true; // false = "mode dengar" (teks disembunyikan)
    this.eqMode = "idle";
    this.audioToken = 0;
    this.state = "intro";

    this.buildBackdrop();
    this.layer = this.add.container(0, 0).setDepth(10);

    setupResponsive(this, (vw, vh) => this.onResize(vw, vh));

    this.cameras.main.fadeIn(350, 0, 0, 0);

    this.keyHandler = (e) => this.onKey(e);
    if (this.input.keyboard) this.input.keyboard.on("keydown", this.keyHandler);

    this.showIntro();

    this.events.once("shutdown", () => {
      this.audioToken++;
      SoundFX.cancelSpeech();
      SoundFX.stopCue();
      if (this.input.keyboard) this.input.keyboard.off("keydown", this.keyHandler);
    });
  }

  // ------------------------------------------------------------------
  // Umum
  // ------------------------------------------------------------------
  buildBackdrop() {
    if (this.textures.exists("menu_bg")) {
      this.bg = this.add.image(DW / 2, DH / 2, "menu_bg").setDepth(0);
      this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0x0b2418, 0.66).setDepth(1);
    } else {
      this.add.rectangle(DW / 2, DH / 2, 6000, 6000, 0x1c3a2a).setDepth(0);
    }
    spawnLeaves(this, 10, 2);
  }

  onResize() {
    if (this.bg) coverScale(this.bg, this._viewW, this._viewH);
  }

  clearLayer() {
    this.layer.removeAll(true);
    this.pips = null;
    this.bars = null;
  }

  title(text, y = 0) {
    return makeText(this, DW / 2, y, text, { size: 24, color: css(COL.gold), stroke: css(COL.outline), strokeW: 8 });
  }

  addMiko(x, y, scale) {
    const shadow = this.add.ellipse(x, y + 2, 28 * scale, 7 * scale, 0x000000, 0.3);
    this.layer.add(shadow);

    if (!this.textures.exists("player_sheet")) return null;

    const s = this.add.sprite(x, y, "player_sheet", 1).setOrigin(0.5, 1).setScale(scale);
    this.layer.add(s);
    return s;
  }

  // ------------------------------------------------------------------
  // 1) Layar pembuka
  // ------------------------------------------------------------------
  showIntro() {
    this.state = "intro";
    this.clearLayer();
    const L = this.layer;

    const g = this.add.graphics();
    drawPanel(g, DW / 2 - 360, 50, 720, 500);
    L.add(g);

    L.add(this.title("SESI 2 : AUDITORY", 104));
    L.add(makeText(this, DW / 2, 146, "DENGARKAN SUARA HUTAN", { size: 10, color: css(COL.leafLight), stroke: css(COL.outline), strokeW: 4 }));

    // Miko di kiri, penjelasan di kanan
    this.addMiko(DW / 2 - 235, 330, 3);
    L.add(makeText(this, DW / 2 - 235, 352, "MIKO", { size: 10, color: css(COL.gold), stroke: css(COL.outline), strokeW: 4 }));

    const body =
      "Halo! Aku Miko, penjaga hutan.\n\n" +
      "Di sesi ini kamu akan MENDENGARKAN:\n" +
      "- Pertanyaan dari Miko\n" +
      "- Suara-suara misterius di hutan\n\n" +
      "Pasang headphone atau naikkan volume ya!";

    L.add(makeText(this, DW / 2 - 90, 196, body, { size: 10, origin: [0, 0], align: "left", wrap: 370, spacing: 9 }));

    this.noVoiceNote = makeText(this, DW / 2, 396, "", { size: 8, color: "#ffd9a0", wrap: 560 });
    L.add(this.noVoiceNote);
    if (!SoundFX.enabled) this.noVoiceNote.setText("SUARA SEDANG MATI. Nyalakan SUARA di Menu Utama untuk pengalaman terbaik.");
    else if (!SoundFX.speechSupported) this.noVoiceNote.setText("Browser ini tidak mendukung suara Miko. Teks tetap ditampilkan.");
    else if (SoundFX.lacksIndonesianVoice()) this.noVoiceNote.setText("Suara Bahasa Indonesia tidak ditemukan di perangkat ini. Miko memakai suara bawaan.");

    const test = createButton(this, DW / 2 - 130, 452, 230, 52, "TES SUARA", { size: 12, onClick: () => this.testSound() });
    const start = createButton(this, DW / 2 + 130, 452, 230, 52, "MULAI", { size: 14, palN: PAL.woodHover, palH: PAL.wood, onClick: () => this.startQuiz() });
    const back = createButton(this, DW / 2, 512, 260, 34, "KEMBALI KE MENU", { size: 8, onClick: () => this.toMenu() });
    [test, start, back].forEach((b) => L.add(b.container));
  }

  testSound() {
    this.cancelAudio();
    const token = this.audioToken;

    const ok = SoundFX.speak("Halo! Aku Miko. Kalau kamu mendengar suaraku, berarti perangkatmu siap.", {
      onEnd: () => {
        if (token === this.audioToken) SoundFX.playCue("birds");
      },
    });
    if (!ok) SoundFX.playCue("birds");
  }

  startQuiz() {
    this.cancelAudio();
    this.index = 0;
    this.score = 0;
    this.buildQuiz();
    this.loadRound(0);
  }

  toMenu() {
    this.cancelAudio();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("MainMenuScene"));
  }

  // ------------------------------------------------------------------
  // 2) Layar kuis
  // ------------------------------------------------------------------
  buildQuiz() {
    this.state = "quiz";
    this.clearLayer();
    const L = this.layer;
    const n = this.rounds.length;

    // ---- Bilah atas ----
    L.add(makeText(this, 24, 24, "SESI 2 : AUDITORY", { size: 10, color: css(COL.gold), origin: [0, 0.5], stroke: css(COL.outline), strokeW: 4 }));
    this.scoreText = makeText(this, 24, 46, "BENAR: 0", { size: 8, origin: [0, 0.5], stroke: css(COL.outline), strokeW: 3 });
    L.add(this.scoreText);

    this.pips = [];
    const total = n * 24 - 10;
    const startX = DW / 2 - total / 2 + 7;
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(startX + i * 24, 30, 14, 14, 0x3a2a1a).setStrokeStyle(2, COL.outline);
      L.add(r);
      this.pips.push(r);
    }

    this.textBtn = createButton(this, 738, 30, 140, 34, "", { size: 8, onClick: () => this.toggleText() });
    this.soundBtn = createButton(this, 876, 30, 120, 34, "", { size: 8, onClick: () => this.toggleSound() });
    L.add(this.textBtn.container);
    L.add(this.soundBtn.container);
    this.updateToggleLabels();

    // ---- Miko ----
    const grass = this.add.ellipse(130, 328, 190, 44, 0x4f8f3a).setStrokeStyle(3, COL.outline);
    L.add(grass);
    this.miko = this.addMiko(130, 334, 3);
    this.mikoBaseY = 334;
    L.add(makeText(this, 130, 376, "MIKO", { size: 10, color: css(COL.gold), stroke: css(COL.outline), strokeW: 4 }));

    // ---- Kotak dialog ----
    const dg = this.add.graphics();
    drawWood(dg, 250, 76, 660, 176, PAL.parch, { grain: false });
    // ekor dialog menuju Miko
    dg.fillStyle(COL.outline, 1);
    dg.fillRect(238, 140, 14, 28);
    dg.fillRect(230, 146, 10, 16);
    dg.fillStyle(PAL.parch.base, 1);
    dg.fillRect(242, 144, 12, 20);
    dg.fillRect(234, 150, 8, 8);
    L.add(dg);

    this.headerText = makeText(this, 278, 98, "", { size: 8, color: "#8a5a30", origin: [0, 0.5] });
    this.qText = makeText(this, 278, 120, "", { size: 14, color: css(COL.ink), origin: [0, 0], align: "left", wrap: 604, spacing: 10 });
    L.add([this.headerText, this.qText]);

    // ---- Visualizer suara ----
    L.add(this.add.rectangle(455, 296, 410, 56, 0x1d3322).setStrokeStyle(3, COL.outline));
    this.bars = [];
    this.barH = [];
    for (let i = 0; i < 24; i++) {
      const b = this.add.rectangle(266 + i * 16, 318, 10, 4, COL.leaf).setOrigin(0, 1);
      L.add(b);
      this.bars.push(b);
      this.barH.push(4);
    }

    this.replayBtn = createButton(this, 790, 296, 200, 48, "ULANG [R]", { size: 11, onClick: () => this.replay() });
    L.add(this.replayBtn.container);

    // ---- Tombol jawaban ----
    this.answerBtns = [];
    for (let i = 0; i < 3; i++) {
      const b = createButton(this, 580, 372 + i * 62, 660, 52, "", {
        size: 12,
        align: "left",
        badge: LETTERS[i],
        onClick: () => this.answer(i),
      });
      L.add(b.container);
      this.answerBtns.push(b);
    }

    // ---- Bawah ----
    L.add(makeText(this, 250, 562, "A/B/C: JAWAB   R: ULANG   T: TEKS   M: SUARA", { size: 8, origin: [0, 0.5], stroke: css(COL.outline), strokeW: 3 }));
    this.nextBtn = createButton(this, 830, 562, 220, 44, "LANJUT", { size: 12, palN: PAL.woodHover, palH: PAL.wood, onClick: () => this.next() });
    L.add(this.nextBtn.container);
    this.nextBtn.setVisible(false);
  }

  updatePips() {
    if (!this.pips) return;
    this.pips.forEach((p, i) => {
      if (i < this.index || (i === this.index && this.answered)) p.setFillStyle(this.results[i] ? COL.leaf : COL.red);
      else if (i === this.index) p.setFillStyle(COL.gold);
      else p.setFillStyle(0x3a2a1a);
    });
  }

  updateToggleLabels() {
    if (this.textBtn) this.textBtn.setLabel(this.showText ? "TEKS: ON" : "TEKS: OFF");
    if (this.soundBtn) this.soundBtn.setLabel(SoundFX.enabled ? "SUARA: ON" : "SUARA: OFF");
  }

  // Menampilkan ulang teks pertanyaan & jawaban sesuai mode saat ini
  refreshTexts() {
    if (this.state !== "quiz" || !this.round) return;

    const r = this.round;
    const text = this.showText || !SoundFX.enabled;
    const reveal = text || this.answered;

    this.answerBtns.forEach((b, i) => {
      b.setLabel(reveal ? r.answers[i] : `PILIHAN ${LETTERS[i]} (DENGARKAN MIKO)`);
    });

    if (this.answered) return; // teks umpan balik dibiarkan

    this.headerText.setText(`PERTANYAAN ${this.index + 1} / ${this.rounds.length}`);
    this.qText.setFontSize(14);

    let body;
    if (r.type === "suara") {
      body = r.intro;
      if (!SoundFX.enabled) body += "\n\nSUARA MATI. Nyalakan SUARA (tombol M) untuk mendengar.";
    } else if (text) {
      body = r.q;
    } else {
      body = "MODE DENGAR\n\nTeks disembunyikan. Dengarkan Miko, lalu pilih A, B, atau C!";
    }
    this.qText.setText(body);
  }

  loadRound(i) {
    this.index = i;
    this.round = this.rounds[i];
    this.answered = false;
    if (i === 0) this.results = [];

    this.nextBtn.setVisible(false);
    this.answerBtns.forEach((b) => {
      b.setPalette(null);
      b.setEnabled(true);
      b.setDim(false);
      b.container.x = 580;
    });

    this.updatePips();
    this.refreshTexts();
    this.playRound();
  }

  // ------------------------------------------------------------------
  // Audio ronde
  // ------------------------------------------------------------------
  cancelAudio() {
    this.audioToken++;
    SoundFX.cancelSpeech();
    SoundFX.stopCue();
    this.eqMode = "idle";
  }

  optionsSpeech() {
    const a = this.round.answers;
    return `Pilihan A, ${a[0]}. Pilihan B, ${a[1]}. Pilihan C, ${a[2]}.`;
  }

  // Miko berbicara. onDone dipanggil setelah selesai (atau setelah jeda jika suara tidak tersedia).
  say(text, token, onDone) {
    this.eqMode = "speech";

    const finish = () => {
      if (token !== this.audioToken) return;
      this.eqMode = "idle";
      if (onDone) onDone();
    };

    if (!SoundFX.enabled) {
      this.time.delayedCall(500, finish);
      return;
    }

    const ok = SoundFX.speak(text, { onEnd: finish });
    if (!ok) this.time.delayedCall(Math.min(4000, 800 + text.length * 40), finish);
  }

  playCue(token, onDone) {
    const dur = SoundFX.playCue(this.round.cue);
    if (!dur) {
      if (onDone) onDone();
      return;
    }

    this.eqMode = "cue";
    this.time.delayedCall(dur * 1000 + 250, () => {
      if (token !== this.audioToken) return;
      this.eqMode = "idle";
      if (onDone) onDone();
    });
  }

  playRound(skipIntro = false) {
    this.cancelAudio();
    const token = this.audioToken;
    const r = this.round;

    if (r.type === "dengar") {
      this.say(`${r.q} ${this.optionsSpeech()}`, token);
      return;
    }

    const afterCue = () => this.say(this.optionsSpeech(), token);
    const cue = () => this.playCue(token, afterCue);

    if (skipIntro) cue();
    else this.say(r.intro, token, cue);
  }

  replay() {
    if (this.state !== "quiz" || !this.round) return;

    if (this.answered) {
      // Setelah menjawab, ulang penjelasan Miko
      this.cancelAudio();
      this.say(this.feedbackSpeech, this.audioToken);
      return;
    }
    this.playRound(this.round.type === "suara");
  }

  // ------------------------------------------------------------------
  // Menjawab
  // ------------------------------------------------------------------
  answer(i) {
    if (this.state !== "quiz" || this.answered) return;

    this.answered = true;
    this.cancelAudio();

    const r = this.round;
    const ok = i === r.correct;
    this.results[this.index] = ok;

    const chosen = this.answerBtns[i];

    if (ok) {
      this.score++;
      SoundFX.correct();
      burst(this, chosen.container.x, chosen.container.y + this.layer.y, { count: 22 });
      floatText(this, chosen.container.x + 200, chosen.container.y - 30, "+1");
    } else {
      SoundFX.wrong();
      this.tweens.add({
        targets: chosen.container,
        x: 580 + 10,
        duration: 55,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          chosen.container.x = 580;
        },
      });
    }

    this.answerBtns.forEach((b, k) => {
      if (k === r.correct) b.setPalette(PAL.woodHover);
      else if (k === i) b.setPalette(PAL.red);
      else b.setDim(true);
      b.setEnabled(false);
    });

    this.scoreText.setText(`BENAR: ${this.score}`);
    this.updatePips();
    this.refreshTexts(); // membuka teks semua jawaban

    this.headerText.setText(ok ? "MIKO BERKATA: BENAR!" : "MIKO BERKATA: BELUM TEPAT");
    this.qText.setFontSize(12);
    this.qText.setText((ok ? "Hebat! " : "Jawaban yang benar: " + r.answers[r.correct] + ".\n") + r.explain);

    this.feedbackSpeech = (ok ? "Benar! " : `Belum tepat. Jawabannya ${r.answers[r.correct]}. `) + r.explain;

    const token = this.audioToken;
    this.time.delayedCall(700, () => {
      if (token === this.audioToken) this.say(this.feedbackSpeech, token);
    });

    this.nextBtn.setLabel(this.index + 1 >= this.rounds.length ? "LIHAT HASIL" : "LANJUT");
    this.nextBtn.setVisible(true);
  }

  next() {
    if (this.state !== "quiz" || !this.answered) return;
    this.cancelAudio();

    if (this.index + 1 >= this.rounds.length) this.showResults();
    else this.loadRound(this.index + 1);
  }

  toggleText() {
    this.showText = !this.showText;
    this.updateToggleLabels();
    this.refreshTexts();
  }

  toggleSound() {
    const on = !SoundFX.enabled;
    this.registry.set("audioEnabled", on);
    SoundFX.setEnabled(on);
    this.updateToggleLabels();

    if (this.state !== "quiz") return;

    if (on) {
      this.refreshTexts();
      if (!this.answered) this.playRound();
    } else {
      this.cancelAudio();
      this.refreshTexts();
    }
  }

  // ------------------------------------------------------------------
  // 3) Hasil
  // ------------------------------------------------------------------
  showResults() {
    this.state = "result";
    this.clearLayer();
    this.eqMode = "idle";
    const L = this.layer;
    const n = this.rounds.length;

    this.registry.set("auditoryScore", this.score);
    this.registry.set("auditoryTotal", n);
    const vark = this.registry.get("varkScores");
    if (vark) this.registry.set("varkScores", Object.assign({}, vark, { A: this.score }));

    const g = this.add.graphics();
    drawPanel(g, DW / 2 - 360, 50, 720, 500);
    L.add(g);

    L.add(this.title("SESI AUDITORY SELESAI!", 100));

    // Bintang
    const stars = this.score >= 7 ? 3 : this.score >= 5 ? 2 : this.score >= 3 ? 1 : 0;
    for (let i = 0; i < 3; i++) {
      const sg = this.add.graphics();
      const earned = i < stars;
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rad = k % 2 === 0 ? 34 : 15;
        pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
      }
      sg.fillStyle(COL.outline, 1);
      sg.lineStyle(8, COL.outline, 1);
      sg.strokePoints(pts, true);
      sg.fillPoints(pts, true);
      sg.fillStyle(earned ? COL.gold : 0x5a4d3f, 1);
      const inner = pts.map((p) => ({ x: p.x * 0.78, y: p.y * 0.78 }));
      sg.fillPoints(inner, true);

      sg.setPosition(DW / 2 + (i - 1) * 90, 190);
      sg.setScale(0);
      L.add(sg);

      this.tweens.add({
        targets: sg,
        scale: 1,
        duration: 320,
        delay: 300 + i * 260,
        ease: "Back.easeOut",
        onStart: () => {
          if (earned) SoundFX.star(i);
        },
      });
    }

    L.add(makeText(this, DW / 2, 262, `NILAI AUDITORY: ${this.score} / ${n}`, { size: 16, color: css(COL.cream), stroke: css(COL.outline), strokeW: 6 }));

    const visual = this.registry.get("visualScore");
    if (visual !== undefined) {
      L.add(makeText(this, DW / 2, 296, `SESI VISUAL: ${visual} SAMPAH TERKUMPUL`, { size: 9, color: css(COL.leafLight), stroke: css(COL.outline), strokeW: 4 }));
    }

    let msg;
    if (this.score >= 7) msg = "Luar biasa! Telingamu tajam. Kamu Penjaga Hutan sejati!";
    else if (this.score >= 5) msg = "Bagus sekali! Sedikit lagi kamu jadi ahli dengar hutan.";
    else if (this.score >= 3) msg = "Lumayan! Ayo dengarkan lagi supaya makin paham.";
    else msg = "Jangan menyerah! Coba lagi dan dengarkan Miko baik-baik.";

    L.add(makeText(this, DW / 2, 350, msg, { size: 11, wrap: 580, spacing: 8 }));

    L.add(makeText(this, DW / 2, 424, "TAHUKAH KAMU?\nSatu kantong plastik bisa bertahan ratusan tahun di alam.", { size: 9, color: css(COL.gold), wrap: 560, spacing: 8, stroke: css(COL.outline), strokeW: 4 }));

    const again = createButton(this, DW / 2 - 130, 492, 230, 48, "MAIN LAGI", { size: 12, palN: PAL.woodHover, palH: PAL.wood, onClick: () => this.scene.restart() });
    const menu = createButton(this, DW / 2 + 130, 492, 230, 48, "MENU UTAMA", { size: 12, onClick: () => this.toMenu() });
    L.add([again.container, menu.container]);

    SoundFX.win();

    // Konfeti daun
    this.time.delayedCall(250, () => {
      burst(this, DW / 2, 160, { count: 30, speed: 260, colors: [COL.gold, COL.leaf, COL.leafLight, COL.cream], depth: 50 });
    });

    const token = this.audioToken;
    if (SoundFX.enabled) {
      this.time.delayedCall(1800, () => {
        if (token !== this.audioToken || this.state !== "result") return;
        SoundFX.speak(`Sesi auditory selesai. Nilai kamu ${this.score} dari ${n}. ${msg}`);
      });
    }
  }

  // ------------------------------------------------------------------
  // Keyboard
  // ------------------------------------------------------------------
  onKey(e) {
    if (this.state === "intro") {
      if (e.code === "Enter" || e.code === "Space") this.startQuiz();
      else if (e.code === "Escape") this.toMenu();
      return;
    }

    if (this.state === "result") {
      if (e.code === "Enter") this.toMenu();
      else if (e.code === "KeyR") this.scene.restart();
      return;
    }

    switch (e.code) {
      case "KeyA":
      case "Digit1":
        this.answer(0);
        break;
      case "KeyB":
      case "Digit2":
        this.answer(1);
        break;
      case "KeyC":
      case "Digit3":
        this.answer(2);
        break;
      case "KeyR":
        this.replay();
        break;
      case "KeyT":
        this.toggleText();
        break;
      case "KeyM":
        this.toggleSound();
        break;
      case "Enter":
      case "Space":
        this.next();
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------
  // Animasi visualizer & Miko
  // ------------------------------------------------------------------
  update(time) {
    if (this.state !== "quiz" || !this.bars) return;

    const n = this.bars.length;
    let target = null;

    if (this.eqMode === "cue") {
      target = SoundFX.getLevels(n);
    } else if (this.eqMode === "speech") {
      target = [];
      for (let i = 0; i < n; i++) {
        target.push(0.2 + 0.8 * Math.abs(Math.sin(time * 0.011 + i * 0.7) * Math.sin(time * 0.0047 + i * 1.3)));
      }
    }

    for (let i = 0; i < n; i++) {
      const goal = target ? 4 + target[i] * 40 : 4 + 2 * Math.abs(Math.sin(time * 0.002 + i * 0.5));
      this.barH[i] += (goal - this.barH[i]) * 0.35;

      const h = Math.max(4, Math.round(this.barH[i] / 4) * 4);
      this.bars[i].setSize(10, h);
      this.bars[i].setFillStyle(h > 30 ? COL.gold : h > 18 ? COL.leafLight : COL.leaf);
    }

    // Miko bergoyang saat berbicara
    if (this.miko) {
      this.miko.y = this.eqMode === "speech" ? this.mikoBaseY - Math.abs(Math.sin(time * 0.014)) * 5 : this.mikoBaseY;
    }
  }
}
