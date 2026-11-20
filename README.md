[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice City Nights — GTA-style Cover Maker

An offline browser web app that turns your photos and a caption into GTA-style
cover art: the multi-panel poster look, bold display lettering, and a Vice City
sunset or neon colour grade — exported as a PNG to share.

## What it does

- **Four layouts** — Four Panel Grid, Hero And Three, Full Bleed, and Tilted
  Snapshots (rotated polaroid-style cards on a sunset sky).
- **Five grades** — Sunset, Neon Nights, Vice Pink, Noir, and Original, washed
  over every panel with film grain and a vignette on top.
- **Any photo** — load your own photos from your machine (never uploaded), or
  try the two built-in samples. Fill every panel with one photo or put a
  different photo in each panel.
- **Crop and position each panel** — click a panel on the preview (or its
  button), then zoom and pan it with sliders or by dragging the photo.
- **Caption editing** — title and subtitle, three display fonts (Anton,
  Bebas Neue, Pacifico — all SIL OFL, shipped under `app/fonts/`), five title
  colours, with outline and drop shadow.
- **Undo / redo** for every change.
- **Export** as PNG in 1080×1080, 1080×1350, or 1920×1080 — three clicks from
  photo to post.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `app/index.html` plus its local files is the whole
app. Photos are read on your own machine and never leave it.

## Handing in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the vendored make.fun
library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Originality

No Rockstar Games logo, wordmark, artwork, character, or font is used. The
lettering uses Anton, Bebas Neue, and Pacifico under the SIL Open Font License
(see `app/fonts/OFL.txt`). The sample photos were made with an image model
for make.fun and are free to use.
