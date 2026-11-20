#!/usr/bin/env python3
"""Takes the screenshots in shots.json with headless Chromium, then converts
each PNG to JPEG (quality 88) so it fits the 256 KiB gate cap. Run from the
repo root while `node serve.ts` is serving app/ on :8080."""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
CHROME = str(Path.home() / ".cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell")
BASE = "http://127.0.0.1:8080/"

shots = json.loads((ROOT / "shots.json").read_text())
for shot in shots:
    png = Path(f"/tmp/shot-{shot['name']}.png")
    url = BASE + "index.html" + shot["query"]
    cmd = [
        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",        "--hide-scrollbars", f"--window-size={shot['w']},{shot['h']}",
        "--virtual-time-budget=12000", f"--screenshot={png}", url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or not png.exists():
        print(f"FAILED {shot['name']}: rc={r.returncode}\n{r.stderr[-500:]}")
        sys.exit(1)
    out = ROOT / "screenshots" / shot["name"]
    with Image.open(png) as im:
        im.convert("RGB").save(out, "JPEG", quality=88)
    print(f"{shot['name']}: {out.stat().st_size} bytes, {im.size}")
    png.unlink()
print("done")
