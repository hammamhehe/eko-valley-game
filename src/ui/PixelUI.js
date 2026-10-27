// src/ui/PixelUI.js
// Kumpulan alat bantu tampilan bergaya pixel-art kayu (earth tone) untuk Eko-Valley.
// Dipakai oleh MainMenuScene dan Level2AScene.
import Phaser from "phaser";
import SoundFX from "../audio/SoundFX.js";

// Ukuran "kanvas desain". Semua scene menggambar di ukuran ini,
// lalu kamera di-zoom otomatis agar pas di layar berapa pun.
export const DW = 960;
export const DH = 600;

export const FONT = '"Press Start 2P", "Courier New", monospace';

export const COL = {
  outline: 0x3b2412,
  cream: 0xfff3c4,
  gold: 0xffd24a,
  ink: 0x3b2412,
  leaf: 0x6fb04a,
  leafLight: 0x9fd86c,
  leafDark: 0x3f7a2f,
  red: 0xd9503f,
};

export const PAL = {
  wood: { base: 0xa56a37, light: 0xc98f50, shade: 0x7a4a24 },
  woodHover: { base: 0x6fae48, light: 0x9bd86c, shade: 0x467d30 },
  woodDark: { base: 0x6e4524, light: 0x855a30, shade: 0x55341a },
  parch: { base: 0xf3e2b3, light: 0xfff3cf, shade: 0xd9c38a },
  red: { base: 0xd9503f, light: 0xf0806a, shade: 0x9c3326 },
  slate: { base: 0x5a4d3f, light: 0x6b5d4c, shade: 0x43382d },
};

export const css = (n) => "#" + n.toString(16).padStart(6, "0");

// ---------------------------------------------------------------------
// Teks (otomatis tajam walau kamera di-zoom)
// ---------------------------------------------------------------------
export function makeText(scene, x, y, str, o = {}) {
  const { size = 12, color = css(COL.cream), stroke = null, strokeW = 0, origin = [0.5, 0.5], align = "center", wrap = 0, spacing = 6 } = o;

  const style = {
    fontFamily: FONT,
    fontSize: size + "px",
    color,
    align,
    lineSpacing: spacing,
    padding: { x: 0, y: 4 },
  };

  if (stroke) {
    style.stroke = stroke;
    style.strokeThickness = strokeW;
  }
  if (wrap) style.wordWrap = { width: wrap };

  const t = scene.add.text(x, y, str, style).setOrigin(origin[0], origin[1]);

  if (!scene._pxTexts) scene._pxTexts = [];
  scene._pxTexts.push(t);
  if (scene._textRes && t.setResolution) t.setResolution(scene._textRes);

  return t;
}

function applyTextResolution(scene) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const res = Math.min(4, Math.max(1, Math.ceil((scene._zoom || 1) * dpr)));
  if (res === scene._textRes) return;

  scene._textRes = res;
  scene._pxTexts = (scene._pxTexts || []).filter((t) => t && t.active);
  scene._pxTexts.forEach((t) => t.setResolution && t.setResolution(res));
}

// ---------------------------------------------------------------------
// Responsif: kamera di-zoom supaya area DW x DH selalu muat di layar
// ---------------------------------------------------------------------
export function setupResponsive(scene, onResize) {
  const apply = () => {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const z = Math.max(0.25, Math.min(w / DW, h / DH));

    const cam = scene.cameras.main;
    cam.setZoom(z);
    cam.setScroll(DW / 2 - w / 2, DH / 2 - h / 2);

    scene._zoom = z;
    scene._viewW = w / z; // lebar area yang terlihat (dalam satuan desain)
    scene._viewH = h / z;

    applyTextResolution(scene);
    if (onResize) onResize(scene._viewW, scene._viewH, z);
  };

  scene.scale.on("resize", apply);
  scene.events.once("shutdown", () => scene.scale.off("resize", apply));
  apply();
}

// Gambar latar yang selalu menutupi seluruh layar
export function coverScale(img, vw, vh) {
  if (!img) return;
  const s = Math.max(vw / img.width, vh / img.height);
  img.setScale(s);
}

// ---------------------------------------------------------------------
// Menggambar kayu bergaya pixel
// ---------------------------------------------------------------------
export function drawWood(g, x, y, w, h, pal, opt = {}) {
  const o = opt.outline !== undefined ? opt.outline : 4;

  // Garis tepi dengan sudut terpotong
  g.fillStyle(COL.outline, 1);
  g.fillRect(x + o, y, w - o * 2, h);
  g.fillRect(x, y + o, w, h - o * 2);

  const ix = x + o;
  const iy = y + o;
  const iw = w - o * 2;
  const ih = h - o * 2;

  g.fillStyle(pal.base, 1);
  g.fillRect(ix, iy, iw, ih);

  g.fillStyle(pal.light, 1);
  g.fillRect(ix, iy, iw, 4);

  g.fillStyle(pal.shade, 1);
  g.fillRect(ix, iy + ih - 6, iw, 6);

  if (opt.grain !== false) {
    g.fillStyle(pal.shade, 0.5);
    const n = Math.floor((iw * ih) / 1400) + 2;
    for (let i = 0; i < n; i++) {
      const lx = ix + 8 + ((i * 53) % Math.max(10, iw - 40));
      const ly = iy + 10 + ((i * 31) % Math.max(10, ih - 26));
      const len = Math.min(14 + ((i * 7) % 24), ix + iw - lx - 6);
      if (len > 2) g.fillRect(lx, ly, len, 2);
    }
  }

  if (opt.nails) {
    [
      [ix + 4, iy + 4],
      [ix + iw - 10, iy + 4],
      [ix + 4, iy + ih - 10],
      [ix + iw - 10, iy + ih - 10],
    ].forEach(([nx, ny]) => {
      g.fillStyle(COL.outline, 1);
      g.fillRect(nx, ny, 6, 6);
      g.fillStyle(0xd8c9a8, 1);
      g.fillRect(nx + 1, ny + 1, 2, 2);
    });
  }
}

// Panel besar: bingkai kayu + papan gelap di dalamnya
export function drawPanel(g, x, y, w, h) {
  drawWood(g, x, y, w, h, PAL.wood, { nails: true });
  drawWood(g, x + 16, y + 16, w - 32, h - 32, PAL.woodDark, { outline: 3 });
}

// ---------------------------------------------------------------------
// Tombol kayu
// ---------------------------------------------------------------------
export function createButton(scene, x, y, w, h, label, opts = {}) {
  const o = Object.assign({ size: 14, align: "center", badge: null, palN: PAL.wood, palH: PAL.woodHover, color: css(COL.cream), onClick: null, onHover: null, onOut: null }, opts);

  const left = o.align === "left";
  const textX = left ? -w / 2 + (o.badge ? 70 : 22) : 0;

  const c = scene.add.container(x, y);
  const g = scene.add.graphics();

  const txt = makeText(scene, textX, 0, label, {
    size: o.size,
    color: o.color,
    stroke: css(COL.outline),
    strokeW: 4,
    origin: left ? [0, 0.5] : [0.5, 0.5],
    align: left ? "left" : "center",
    wrap: left ? w - (o.badge ? 70 : 22) - 20 : 0,
    spacing: 4,
  });

  let badgeTxt = null;
  if (o.badge) {
    badgeTxt = makeText(scene, -w / 2 + 36, 0, o.badge, { size: 14, color: css(COL.ink), origin: [0.5, 0.5] });
  }

  const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0);

  c.add([g, txt]);
  if (badgeTxt) c.add(badgeTxt);
  c.add(hit);

  const st = { selected: false, pressed: false, enabled: true, palOverride: null, dim: false };

  const render = () => {
    g.clear();

    const lift = st.pressed ? 3 : 0;
    const pal = !st.enabled && !st.palOverride ? PAL.slate : st.palOverride ? st.palOverride : st.selected ? o.palH : o.palN;

    drawWood(g, -w / 2, -h / 2 + lift, w, h, pal);

    if (o.badge) {
      g.fillStyle(COL.outline, 1);
      g.fillRect(-w / 2 + 14, -15 + lift, 44, 30);
      g.fillStyle(PAL.parch.base, 1);
      g.fillRect(-w / 2 + 17, -12 + lift, 38, 24);
      badgeTxt.setY(lift);
    }

    // Penanda pilihan (panah pixel) di sisi kiri-kanan tombol tengah
    if (st.selected && st.enabled && !left) {
      g.fillStyle(COL.cream, 1);
      const ay = lift;
      const ax = -w / 2 + 16;
      g.fillRect(ax, ay - 8, 4, 16);
      g.fillRect(ax + 4, ay - 6, 4, 12);
      g.fillRect(ax + 8, ay - 4, 4, 8);
      g.fillRect(ax + 12, ay - 2, 4, 4);

      const bx = w / 2 - 16;
      g.fillRect(bx - 4, ay - 8, 4, 16);
      g.fillRect(bx - 8, ay - 6, 4, 12);
      g.fillRect(bx - 12, ay - 4, 4, 8);
      g.fillRect(bx - 16, ay - 2, 4, 4);
    }

    // Teks bergeser sedikit ke atas saat disorot, turun saat ditekan
    txt.setY(lift + (st.selected && !st.pressed && st.enabled ? -2 : 0));
    txt.setColor(!st.enabled && !st.palOverride ? "#b8a98c" : o.color);
    txt.setAlpha(st.dim ? 0.55 : 1);
  };

  const api = {
    container: c,
    label: txt,
    hit,
    w,
    h,
    setSelected(v) {
      if (st.selected !== v) {
        st.selected = v;
        render();
      }
    },
    setLabel(s) {
      txt.setText(s);
    },
    setEnabled(v) {
      st.enabled = v;
      if (hit.input) hit.input.enabled = v;
      if (!v) st.pressed = false;
      render();
    },
    setDim(v) {
      st.dim = v;
      render();
    },
    setPalette(p) {
      st.palOverride = p;
      render();
    },
    setVisible(v) {
      c.setVisible(v);
      api.setEnabled(v);
    },
    setDepth(d) {
      c.setDepth(d);
      return api;
    },
    click() {
      if (!st.enabled) return;
      SoundFX.click();
      if (o.onClick) o.onClick(api);
    },
    destroy() {
      c.destroy();
    },
  };

  hit.setInteractive({ useHandCursor: true });

  hit.on("pointerover", () => {
    if (!st.enabled) return;
    if (o.onHover) o.onHover(api);
    else api.setSelected(true);
  });

  hit.on("pointerout", () => {
    st.pressed = false;
    if (o.onOut) o.onOut(api);
    else api.setSelected(false);
    render();
  });

  hit.on("pointerdown", () => {
    if (!st.enabled) return;
    st.pressed = true;
    render();
  });

  hit.on("pointerup", () => {
    if (!st.pressed) return;
    st.pressed = false;
    render();
    api.click();
  });

  render();
  return api;
}

// ---------------------------------------------------------------------
// Efek: ledakan partikel pixel, teks melayang, daun jatuh, awan
// ---------------------------------------------------------------------
export function burst(scene, x, y, o = {}) {
  const { colors = [0xffd24a, 0x9fd86c, 0xfff3c4], count = 16, speed = 150, life = 750, size = 5, gravity = 380, depth = 500 } = o;

  for (let i = 0; i < count; i++) {
    const p = scene.add.rectangle(x, y, size, size, Phaser.Utils.Array.GetRandom(colors)).setDepth(depth);
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v - 70;

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: life,
      onUpdate: (tw) => {
        const t = (tw.getValue() * life) / 1000;
        p.x = x + vx * t;
        p.y = y + vy * t + 0.5 * gravity * t * t;
        p.setAlpha(1 - tw.getValue());
      },
      onComplete: () => p.destroy(),
    });
  }
}

export function floatText(scene, x, y, str, color = css(COL.gold), size = 14) {
  const t = makeText(scene, x, y, str, { size, color, stroke: css(COL.outline), strokeW: 5 }).setDepth(600);
  scene.tweens.add({
    targets: t,
    y: y - 40,
    alpha: 0,
    duration: 900,
    ease: "Sine.easeOut",
    onComplete: () => t.destroy(),
  });
  return t;
}

export function spawnLeaves(scene, count = 14, depth = 5) {
  const colors = [0x6fb04a, 0x9fd86c, 0xe0b34a, 0xb5793a, 0x3f7a2f];

  const make = (initial) => {
    const vw = scene._viewW || DW;
    const vh = scene._viewH || DH;
    const left = DW / 2 - vw / 2;
    const top = DH / 2 - vh / 2;
    const endY = top + vh + 20;

    const sx = left + Math.random() * vw;
    const sy = initial ? top + Math.random() * vh : top - 20;
    const amp = 20 + Math.random() * 45;
    const phase = Math.random() * Math.PI * 2;
    const spin = (Math.random() - 0.5) * 12;

    const leaf = scene.add.rectangle(sx, sy, 6, 4, Phaser.Utils.Array.GetRandom(colors)).setDepth(depth).setAlpha(0.92);
    const dur = Phaser.Math.Between(7000, 13000) * (initial ? Math.max(0.25, (endY - sy) / (vh + 40)) : 1);

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: dur,
      onUpdate: (tw) => {
        const p = tw.getValue();
        leaf.y = sy + (endY - sy) * p;
        leaf.x = sx + Math.sin(p * 9 + phase) * amp;
        leaf.rotation = p * spin;
      },
      onComplete: () => {
        leaf.destroy();
        make(false);
      },
    });
  };

  for (let i = 0; i < count; i++) make(true);
}

export function ensureCloudTexture(scene) {
  if (scene.textures.exists("px_cloud")) return;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 0.95);
  g.fillRect(28, 0, 28, 8);
  g.fillRect(12, 8, 64, 8);
  g.fillRect(4, 16, 88, 10);
  g.fillStyle(0xcfe3f5, 0.95);
  g.fillRect(8, 26, 80, 4);
  g.generateTexture("px_cloud", 96, 32);
  g.destroy();
}
