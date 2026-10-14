import Phaser from "phaser";

export default class Level2AScene extends Phaser.Scene {
  constructor() {
    super("Level2AScene");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#193b2b");

    this.questions = [
      {
        question: "Di mana kita harus membuang sampah?",
        answers: ["Di sungai", "Di tempat sampah", "Di tengah hutan"],
        correct: 1,
      },
      {
        question: "Apa manfaat memilah sampah?",
        answers: ["Memudahkan daur ulang", "Membuat hutan kotor", "Menambah pencemaran"],
        correct: 0,
      },
      {
        question: "Bagaimana cara menjaga hutan?",
        answers: ["Merusak pohon", "Membuang sampah sembarangan", "Menjaga kebersihan lingkungan"],
        correct: 2,
      },
    ];

    this.index = 0;
    this.score = 0;
    this.locked = false;

    this.add
      .text(w / 2, 55, "SESI AUDITORY", {
        fontFamily: "Arial",
        fontSize: "32px",
        fontStyle: "bold",
        color: "#dcebbd",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 95, "Dengarkan pertanyaan Miko, lalu pilih jawabanmu.", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#e5eddf",
      })
      .setOrigin(0.5);

    this.questionText = this.add
      .text(w / 2, 155, "", {
        fontFamily: "Arial",
        fontSize: "21px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: w - 50 },
      })
      .setOrigin(0.5);

    this.answerButtons = [];

    for (let i = 0; i < 3; i++) {
      const y = Math.min(245 + i * 66, h - 170 + i * 5);

      const bg = this.add.rectangle(w / 2, y, Math.min(500, w - 40), 48, 0x294533).setStrokeStyle(1, 0x8da77a);

      const label = this.add
        .text(w / 2, y, "", {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: w - 80 },
        })
        .setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.answer(i));

      this.answerButtons.push({ bg, label });
    }

    this.feedback = this.add
      .text(w / 2, h - 65, "", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#e1efc5",
        align: "center",
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);

    this.showQuestion();
  }

  speak(text) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
  }

  showQuestion() {
    if (this.index >= this.questions.length) {
      this.showResults();
      return;
    }

    this.locked = false;
    const question = this.questions[this.index];

    this.questionText.setText(`${this.index + 1}. ${question.question}`);

    question.answers.forEach((answer, i) => {
      this.answerButtons[i].label.setText(answer);
      this.answerButtons[i].bg.setFillStyle(0x294533);
      this.answerButtons[i].bg.setAlpha(1);
    });

    this.feedback.setText("");
    this.speak(question.question);
  }

  answer(choice) {
    if (this.locked) return;

    this.locked = true;

    const question = this.questions[this.index];
    const correct = choice === question.correct;

    if (correct) {
      this.score += 1;
      this.feedback.setText("Benar! Miko bangga padamu.");
    } else {
      this.feedback.setText(`Belum tepat. Jawabannya: ${question.answers[question.correct]}`);
    }

    this.answerButtons.forEach((button, i) => {
      button.bg.setFillStyle(i === question.correct ? 0x547b42 : 0x294533);
    });

    this.speak(correct ? "Benar! Miko bangga padamu." : `Belum tepat. Jawabannya ${question.answers[question.correct]}`);

    this.time.delayedCall(1500, () => {
      this.index += 1;
      this.showQuestion();
    });
  }

  showResults() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.questionText.setText(`Hebat! Petualangan selesai.\nNilai Auditory: ${this.score}/${this.questions.length}`);

    this.answerButtons.forEach(({ bg, label }) => {
      bg.destroy();
      label.destroy();
    });

    this.feedback.setText("");
    this.registry.set("auditoryScore", this.score);

    const bg = this.add.rectangle(w / 2, h - 100, 260, 48, 0xbfd59e).setInteractive({ useHandCursor: true });

    this.add
      .text(w / 2, h - 100, "KEMBALI KE MENU", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#203626",
      })
      .setOrigin(0.5);

    bg.on("pointerdown", () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      this.scene.start("MainMenuScene");
    });
  }
}
