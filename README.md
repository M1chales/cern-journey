# Το τριήμερό μου στο CERN (My Weekend at CERN)

An interactive web app (and installable phone app) about my weekend at CERN (Friday 25 to Sunday 27 September 2026):
what CERN is, how particles are accelerated and detected, and the physics we learned there.
Every simulation is written from scratch in plain HTML, CSS and JavaScript. No frameworks.

## Run it

Just open `index.html` in a browser. To test the full app (offline mode + "Install" button), serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Make it yours

- **Your name / school:** edit `js/config.js`.
- **QR code on the last page:** once the app is online, put its link in `CONFIG.url`.
- **Photos:** put `NAME.webp` + `NAME-sm.webp` in `assets/photos/` and add a line to `PHOTOS` in `js/gallery.js`.
- **Language:** opens in Greek by default; the EN/ΕΛ button switches to English.
- **Text:** all text is in `index.html` in two languages: `<t-en>English</t-en><t-el>Ελληνικά</t-el>`.

## Put it online (free) with GitHub Pages

1. Create a new repository on GitHub and upload this folder (without `raw/`).
2. Settings → Pages → Deploy from branch → `main` / root.
3. After a minute it's live at `https://<username>.github.io/<repo>/`.
4. On a phone, open that link → "Add to Home Screen". It works like an app, even offline.

## Structure

One long page, like an exhibition catalogue:

| # | Section | Interactive part |
|---|---------|------------------|
| — | Landing | view along the two LHC beam pipes |
| 01 | Three days at CERN | photographs |
| 02 | What is CERN | map, key figures |
| 03 | What matter is made of | scale diagram, Standard Model, hydrogen |
| 04 | Following a proton | accelerator complex model: Linac4 → PSB → PS → SPS → LHC → 9 experiments |
| 05 | Detectors and experiments | detector cross-section, the nine experiments, ALICE photographs |
| 06 | Beyond the LHC | expandable list |
| 07 | The assignment: μ and σ | draggable measurements, Galton board, σ slider |
| 08 | When is it a discovery? | simulated Higgs → γγ spectrum to 5σ |
| 09 | The muon and time | cosmic muons with/without relativity, twin paradox |
| 10 | Photographs | photo essay + cloud chamber simulation |
| 11 | What I take home | |
