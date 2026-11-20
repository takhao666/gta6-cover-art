// Cover engine: draws a GTA-style multi-panel poster cover onto any canvas.
// Layouts, colour grades, display lettering, grain and vignette all live here;
// main.js owns the editor state and calls drawCoverArt whenever it changes.
// No network, no libraries: plain Canvas 2D plus the OFL fonts under app/fonts.

export const LAYOUTS = {
  grid: { label: 'Four Panel Grid', panels: 4 },
  hero: { label: 'Hero And Three', panels: 4 },
  full: { label: 'Full Bleed', panels: 1 },
  tilted: { label: 'Tilted Snapshots', panels: 3 },
};

export const GRADES = {
  sunset: { label: 'Sunset', top: '#ff9a3d', bottom: '#e0218a', band: ['#160a2e', '#ff5e62'], accent: '#ffd166' },
  neon: { label: 'Neon Nights', top: '#ff2fb3', bottom: '#00e5ff', band: ['#0d0221', '#b537f2'], accent: '#00e5ff' },
  vice: { label: 'Vice Pink', top: '#ff5da2', bottom: '#19d3da', band: ['#2b0a3d', '#ff5da2'], accent: '#19d3da' },
  noir: { label: 'Noir', top: '#ffffff', bottom: '#111111', band: ['#0c0c0c', '#3a3a3a'], accent: '#f5f5f5' },
  original: { label: 'Original Photo', top: '#ffffff', bottom: '#ffffff', band: ['#14101c', '#4a2b6b'], accent: '#ffd166' },
};

export const TITLE_FONTS = ['Anton', 'Bebas Neue', 'Pacifico'];

/** Panel rectangles for a layout, in pixels, plus the title band. */
export function layoutGeometry(layout, W, H) {
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.008)); // gutter
  const bandH = Math.round(H * 0.3);
  const top = H - bandH;
  if (layout === 'grid') {
    const pw = (W - g * 3) / 2;
    const ph = (top - g * 3) / 2;
    return {
      band: { x: 0, y: top, w: W, h: bandH },
      panels: [
        { x: g, y: g, w: pw, h: ph, rot: 0 },
        { x: g * 2 + pw, y: g, w: pw, h: ph, rot: 0 },
        { x: g, y: g * 2 + ph, w: pw, h: ph, rot: 0 },
        { x: g * 2 + pw, y: g * 2 + ph, w: pw, h: ph, rot: 0 },
      ],
    };
  }
  if (layout === 'hero') {
    const leftW = Math.round(W * 0.6) - g;
    const rightX = Math.round(W * 0.6) + g;
    const rightW = W - rightX - g;
    const ph = (top - g * 4) / 3;
    return {
      band: { x: 0, y: top, w: W, h: bandH },
      panels: [
        { x: g, y: g, w: leftW, h: top - g * 2, rot: 0 },
        { x: rightX, y: g, w: rightW, h: ph, rot: 0 },
        { x: rightX, y: g * 2 + ph, w: rightW, h: ph, rot: 0 },
        { x: rightX, y: g * 3 + ph * 2, w: rightW, h: ph, rot: 0 },
      ],
    };
  }
  if (layout === 'full') {
    return {
      band: { x: 0, y: Math.round(H * 0.62), w: W, h: H - Math.round(H * 0.62), overlay: true },
      panels: [{ x: 0, y: 0, w: W, h: H, rot: 0 }],
    };
  }
  // tilted: three snapshot cards with white borders, slightly rotated, on a grade sky.
  const cw = Math.round(W * 0.3);
  const ch = Math.round(H * 0.5);
  const cy = Math.round(H * 0.07);
  const border = Math.max(6, Math.round(Math.min(W, H) * 0.012));
  return {
    band: { x: 0, y: Math.round(H * 0.66), w: W, h: H - Math.round(H * 0.66) },
    panels: [
      { x: Math.round(W * 0.04), y: cy, w: cw, h: ch, rot: -0.09, border },
      { x: Math.round(W * 0.35), y: cy - Math.round(H * 0.02), w: cw, h: ch, rot: 0.02, border },
      { x: Math.round(W * 0.66), y: cy, w: cw, h: ch, rot: 0.08, border },
    ],
  };
}

/** Seeded pseudo-random, so the grain looks the same on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const s = 160;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const x = c.getContext('2d');
  const img = x.createImageData(s, s);
  const rnd = mulberry32(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Draws one photo into a panel rect, cover-fit, with the slot's zoom and pan. */
export function drawPhotoInto(ctx, img, rect, slot, grade) {
  if (!img) return;
  const zoom = slot?.zoom ?? 1;
  const ox = slot?.ox ?? 0;
  const oy = slot?.oy ?? 0;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  const dx = rect.x + (rect.w - pw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - ph) / 2 + oy * rect.h;
  ctx.save();
  if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.25) brightness(1.06)';
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Sunset / neon colour grade washed over a panel rect. */
export function applyGrade(ctx, rect, gradeName) {
  if (gradeName === 'original') return;
  const g = GRADES[gradeName] ?? GRADES.sunset;
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.25, rect.y + rect.h);
  grad.addColorStop(0, g.top);
  grad.addColorStop(1, g.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = gradeName === 'noir' ? 0.18 : 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = gradeName === 'neon' ? '#00e5ff' : '#ff7a00';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Bold display lettering: title fitted to the band, subtitle in script below it. */
export function drawLettering(ctx, W, H, band, state) {
  const g = GRADES[state.grade] ?? GRADES.sunset;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const cx = band.x + band.w / 2;
  const cy = band.y + band.h / 2 + (subtitle ? -band.h * 0.06 : band.h * 0.02);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    let size = band.h * (subtitle ? 0.42 : 0.52);
    const family = `'${state.titleFont || 'Anton'}', sans-serif`;
    const setFont = (s) => { ctx.font = `${s}px ${family}`; };
    setFont(size);
    while (ctx.measureText(title).width > band.w * 0.92 && size > 10) {
      size -= 2;
      setFont(size);
    }
    ctx.translate(cx, cy);
    ctx.rotate(-0.026);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = state.titleColor === '#ffffff' ? '#1a0b2e' : '#111111';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(title, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }
  if (subtitle) {
    const size = Math.max(12, band.h * 0.16);
    ctx.font = `${size}px 'Pacifico', cursive`;
    let sw = ctx.measureText(subtitle).width;
    let s = size;
    while (sw > band.w * 0.88 && s > 10) {
      s -= 1;
      ctx.font = `${s}px 'Pacifico', cursive`;
      sw = ctx.measureText(subtitle).width;
    }
    ctx.fillStyle = g.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = s * 0.2;
    ctx.fillText(subtitle, cx, band.y + band.h * 0.82);
  }
  ctx.restore();
}

/** Film grain plus a soft vignette over the whole cover. */
export function addFinish(ctx, W, H) {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover at the canvas's own pixel size.
 * state: { layout, grade, title, subtitle, titleFont, titleColor,
 *          photos: [Image|null], slots: [{photo, zoom, ox, oy}] }
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const g = GRADES[state.grade] ?? GRADES.sunset;
  const geo = layoutGeometry(state.layout, W, H);

  // Backdrop: grade sky, so tilted cards and gutters sit on colour, not black.
  const sky = ctx.createLinearGradient(0, 0, W * 0.2, H);
  sky.addColorStop(0, g.band[0]);
  sky.addColorStop(1, g.band[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Sun disc glow behind the panels, the Vice City sunset.
  const sun = ctx.createRadialGradient(W * 0.72, H * 0.2, 10, W * 0.72, H * 0.2, Math.max(W, H) * 0.45);
  sun.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
  sun.addColorStop(0.35, 'rgba(255, 120, 80, 0.28)');
  sun.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  geo.panels.forEach((rect, i) => {
    const slot = state.slots?.[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const entry = state.photos?.[slot.photo] ?? null;
    const img = entry?.img ?? null;
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    if (rect.rot) ctx.rotate(rect.rot);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    const border = rect.border ?? 0;
    if (border) {
      ctx.fillStyle = '#fdf8ef';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(Math.min(W, H) * 0.02);
      ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.008);
      ctx.fillRect(-border, -border, rect.w + border * 2, rect.h + border * 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(0, 0, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPhotoInto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, slot, state.grade);
    } else {
      const ph = ctx.createLinearGradient(0, 0, rect.w, rect.h);
      ph.addColorStop(0, '#3d2358');
      ph.addColorStop(1, '#120a24');
      ctx.fillStyle = ph;
      ctx.fillRect(0, 0, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(14, Math.round(rect.w * 0.045))}px 'Bebas Neue', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.w / 2, rect.h / 2);
    }
    applyGrade(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, state.grade);
    ctx.restore();
  });

  // Title band: gradient, a thin accent rule, then the lettering.
  const band = geo.band;
  if (!band.overlay) {
    const bg = ctx.createLinearGradient(band.x, band.y, band.x + band.w, band.y);
    bg.addColorStop(0, g.band[0]);
    bg.addColorStop(1, g.band[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    ctx.fillStyle = g.accent;
    ctx.fillRect(band.x, band.y, band.w, Math.max(2, Math.round(H * 0.004)));
  } else {
    const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.4, 0, H);
    scrim.addColorStop(0, 'rgba(10,2,24,0)');
    scrim.addColorStop(1, 'rgba(10,2,24,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(band.x, band.y - band.h * 0.4, band.w, band.h + band.h * 0.4);
  }
  drawLettering(ctx, W, H, band, state);
  addFinish(ctx, W, H);
}
