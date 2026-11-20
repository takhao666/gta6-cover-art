// Fixed scenes for screenshots, driven by ?shot=:
//   ?shot=cover&size=1920x1080&layout=hero&grade=neon&photo=pier&caption=...
//       the cover alone, filling the viewport
//   ?shot=editor&layout=grid&grade=sunset&photo=boulevard&caption=...
//       the editor with a sample photo loaded
//   ?shot=export&size=1080x1080&layout=full&grade=vice&photo=pier&caption=...
//       the actual PNG the app exported, shown at screenshot size
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, app) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Vice City Nights';
  const subtitle = query.get('subtitle') ?? 'a sunset heist in the city that never sleeps';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  const font = query.get('font') ?? 'Anton';

  await app.ensureFonts();
  const idx = await app.loadSample(photo);
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  const idx2 = await app.loadSample(other);
  const slots = [
    { photo: idx, zoom: 1.0, ox: 0, oy: 0 },
    { photo: idx2, zoom: 1.1, ox: 0, oy: -0.04 },
    { photo: idx, zoom: 1.25, ox: 0.05, oy: 0 },
    { photo: idx2, zoom: 1.05, ox: 0, oy: 0.03 },
  ];
  app.setState({ layout, grade, title: caption, subtitle, titleFont: font, size, slots });
  app.redraw();

  if (shot === 'cover' || shot === 'export') {
    document.body.classList.add('shot-cover');
    if (shot === 'export') {
      // Show the PNG bytes the app itself exported, scaled to the viewport.
      const url = await app.exportDataURL(size);
      const img = document.createElement('img');
      img.id = 'exported';
      img.src = url;
      img.alt = 'Exported cover PNG';
      document.querySelector('.stage').replaceChildren(img);
    }
  }

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
