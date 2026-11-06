# kultr.cc

The website for Kultr, a music player for Navidrome in the
[browser](https://github.com/evropiani/Kultr), on
[Android](https://github.com/evropiani/Kultr_Android) and on
[iPhone](https://github.com/evropiani/Kultr_iOS).

One static page in the apps' cream look: plain HTML and CSS, no JavaScript, no
build step, no web fonts and no third-party requests. Details about the apps
live in their own READMEs, not here.

## What's where

| Path | What it is |
| --- | --- |
| `site/index.html` | The page |
| `site/404.html` | The not-found page (absolute paths, since it is served for any missing URL) |
| `site/assets/site.css` | All styles; light and dark follow the device |
| `site/assets/img/` | The logo and screenshots (taken from the app repos) and the link-preview image |
| `scripts/check.mjs` | Fails if any local link or image is missing |

## Previewing

```bash
npx http-server site -p 8080
node scripts/check.mjs
```

## Deploying

Every push to `main` runs `.github/workflows/pages.yml`, which checks the links
and publishes `site/` to GitHub Pages at **kultr.cc**.
