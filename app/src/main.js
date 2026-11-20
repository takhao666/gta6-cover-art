// Vice City Nights: editor wiring. Owns the state, the undo history, the photo
// library, panel selection (click or drag on the preview), and PNG export in
// 1080x1080, 1080x1350 and 1920x1080. Rendering lives in cover.js.
import { LAYOUTS, GRADES, TITLE_FONTS, layoutGeometry, drawCoverArt } from './cover.js';
import { runShot } from './shots.js';

export const EXPORT_SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

const DEFAULT_SLOTS = () => [
  { photo: 0, zoom: 1, ox: 0, oy: 0 },
  { photo: 0, zoom: 1, ox: 0, oy: 0 },
  { photo: 0, zoom: 1, ox: 0, oy: 0 },
  { photo: 0, zoom: 1, ox: 0, oy: 0 },
];

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'VICE CITY NIGHTS',
  subtitle: 'a sunset heist in the city that never sleeps',
  titleFont: 'Anton',
  titleColor: '#ffffff',
  size: 'square',
  photos: [],
  slots: DEFAULT_SLOTS(),
};

let selectedPanel = 0;
let past = [];
let future = [];
let fontsReady = false;

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, titleFont: state.titleFont, titleColor: state.titleColor,
    size: state.size, slots: state.slots, selectedPanel,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  selectedPanel = s.selectedPanel ?? 0;
  syncControls();
  redraw();
}

/** Pushes the current state onto the undo stack before a change. */
function commit() {
  const snap = snapshot();
  if (past.length && past[past.length - 1] === snap) return; // already captured
  past.push(snap);
  if (past.length > 60) past.shift();
  future = [];
  updateHistoryButtons();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  updateHistoryButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts; the cover still draws */ }
  fontsReady = true;
}

function redraw() {
  const size = EXPORT_SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCoverArt(canvas, state);
  renderPhotoStrip();
  renderPanelButtons();
}

function renderPhotoStrip() {
  const strip = $('photos');
  strip.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = p.name;
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = p.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      commit();
      state.slots[selectedPanel].photo = i;
      state.slots[selectedPanel].zoom = 1;
      state.slots[selectedPanel].ox = 0;
      state.slots[selectedPanel].oy = 0;
      redraw();
      status.textContent = `${p.name} is now in panel ${selectedPanel + 1}.`;
    });
    strip.appendChild(b);
  });
  if (!state.photos.length) {
    strip.textContent = 'No photos yet — add one below, or try a sample.';
  }
}

function renderPanelButtons() {
  const wrap = $('panels');
  wrap.innerHTML = '';
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === selectedPanel ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { selectedPanel = i; syncPanelControls(); redraw(); });
    wrap.appendChild(b);
  }
  if (selectedPanel >= count) selectedPanel = 0;
  syncPanelControls();
}

function syncPanelControls() {
  const slot = state.slots[selectedPanel];
  $('zoom').value = slot.zoom;
  $('zoomVal').textContent = `${Math.round(slot.zoom * 100)}%`;
  $('panX').value = slot.ox;
  $('panY').value = slot.oy;
}

function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('titleFont').value = state.titleFont;
  document.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('active', b.dataset.color === state.titleColor));
  syncPanelControls();
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    state.photos.push({ name: file.name, url, img });
    status.textContent = `Added ${file.name}. Click it, then a panel, to place it.`;
    redraw();
  } catch {
    status.textContent = `Could not read ${file.name} as an image.`;
  }
}

async function loadSample(name) {
  if (state.photos.some((p) => p.name === name)) return state.photos.findIndex((p) => p.name === name);
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos.push({ name, url: `samples/${name}.jpg`, img });
  return state.photos.length - 1;
}

/** Renders the cover at an export size and returns a PNG data URL. */
export async function exportDataURL(sizeKey) {
  await ensureFonts();
  const size = EXPORT_SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCoverArt(off, state);
  return off.toDataURL('image/png');
}

function exportPNG(sizeKey) {
  exportDataURL(sizeKey).then((url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-city-nights-${EXPORT_SIZES[sizeKey].w}x${EXPORT_SIZES[sizeKey].h}.png`;
    a.click();
    status.textContent = `Saved ${a.download}.`;
  });
}

/** Which panel, if any, is under a point on the preview canvas. */
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

// ---- controls ----
$('photoFile').addEventListener('change', (e) => {
  [...e.target.files].forEach(addPhotoFile);
  e.target.value = '';
});
document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', async () => {
  const i = await loadSample(b.dataset.sample);
  commit();
  state.slots[selectedPanel].photo = i;
  redraw();
  status.textContent = `Sample photo loaded into panel ${selectedPanel + 1}.`;
}));
$('fillAll').addEventListener('click', () => {
  const slot = state.slots[selectedPanel];
  if (state.photos[slot.photo] === undefined) { status.textContent = 'Load a photo first.'; return; }
  commit();
  state.slots.forEach((s) => { s.photo = slot.photo; s.zoom = 1; s.ox = 0; s.oy = 0; });
  redraw();
  status.textContent = 'One photo now fills every panel.';
});
$('oneEach').addEventListener('click', () => {
  if (state.photos.length < 2) { status.textContent = 'Load at least two photos first.'; return; }
  commit();
  state.slots.forEach((s, i) => { s.photo = i % state.photos.length; s.zoom = 1; s.ox = 0; s.oy = 0; });
  redraw();
  status.textContent = 'A different photo in each panel.';
});
document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
  commit();
  state.layout = b.dataset.layout;
  if (selectedPanel >= LAYOUTS[state.layout].panels) selectedPanel = 0;
  syncControls();
  redraw();
}));
document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
  commit();
  state.grade = b.dataset.grade;
  syncControls();
  redraw();
}));
document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
  commit();
  state.size = b.dataset.size;
  syncControls();
  redraw();
  status.textContent = `Preview is now ${EXPORT_SIZES[state.size].label}.`;
}));
$('title').addEventListener('focus', commit);
$('subtitle').addEventListener('focus', commit);
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleFont').addEventListener('change', (e) => { commit(); state.titleFont = e.target.value; redraw(); });
document.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
  commit();
  state.titleColor = b.dataset.color;
  syncControls();
  redraw();
}));
$('zoom').addEventListener('focus', commit);
$('panX').addEventListener('focus', commit);
$('panY').addEventListener('focus', commit);
$('zoom').addEventListener('pointerdown', commit);
$('panX').addEventListener('pointerdown', commit);
$('panY').addEventListener('pointerdown', commit);
$('zoom').addEventListener('input', (e) => {
  state.slots[selectedPanel].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Math.round(state.slots[selectedPanel].zoom * 100)}%`;
  redraw();
});
$('panX').addEventListener('input', (e) => { state.slots[selectedPanel].ox = Number(e.target.value); redraw(); });
$('panY').addEventListener('input', (e) => { state.slots[selectedPanel].oy = Number(e.target.value); redraw(); });
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
$('export').addEventListener('click', () => exportPNG(state.size));

// Drag on the preview to pan the selected panel's photo; click selects a panel.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selectedPanel = i;
  syncPanelControls();
  renderPanelButtons();
  const r = canvas.getBoundingClientRect();
  drag = { x: e.clientX, y: e.clientY, ox: state.slots[i].ox, oy: state.slots[i].oy, w: r.width, h: r.height, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const slot = state.slots[selectedPanel];
  const dx = (e.clientX - drag.x) / drag.w;
  const dy = (e.clientY - drag.y) / drag.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  slot.ox = Math.max(-0.5, Math.min(0.5, drag.ox + dx));
  slot.oy = Math.max(-0.5, Math.min(0.5, drag.oy + dy));
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) commit();
  drag = null;
});

// ---- screenshot scenes (?shot=) ----
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    loadSample,
    setState(patch) {
      Object.assign(state, patch);
      if (patch.slots) state.slots = patch.slots;
      syncControls();
    },
    getState: () => state,
    canvas,
    ensureFonts,
    redraw,
    exportDataURL,
  });
} else {
  ensureFonts().then(redraw);
  syncControls();
  updateHistoryButtons();
  redraw();
}
