# kultr.cc

The website for [Kultr](https://github.com/evropiani/Kultr), a modern, minimalist
Navidrome client for the web, [Android](https://github.com/evropiani/Kultr_Android)
and [iOS](https://github.com/evropiani/Kultr_iOS).

It is plain HTML, CSS and JavaScript: no build step, no framework, no web fonts
and no third-party requests — the same rule the app keeps.

## What's where

| Path | What it is |
| --- | --- |
| `site/index.html` | The landing page, with a working player that blends one track into the next and retints the page from the cover |
| `site/features.html` | Every feature, section by section, with platform badges |
| `site/404.html` | The not-found page (uses absolute paths, since it is served for any missing URL) |
| `site/assets/css/site.css` | All styles. Design tokens and the glass recipe come from the app's own `tokens.css` and `glass.css` |
| `site/assets/js/site.js` | The hero player, InjeKt diagram, screenshot tabs, equaliser presets, scroll tinting |
| `site/assets/icons.svg` | An SVG sprite of the [Lucide](https://lucide.dev) icons the app uses (ISC) |
| `site/assets/img/` | The logo, the app's screenshots as WebP, and the social preview image |
| `scripts/check.mjs` | Fails if any local link, image or icon reference is broken |

## Previewing

Any static server works:

```bash
npx http-server site -p 8080
node scripts/check.mjs
```

## Deploying

Every push to `main` runs `.github/workflows/pages.yml`, which checks the links
and publishes `site/` to GitHub Pages.

Two one-time settings make it live at **kultr.cc**:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Pages → Custom domain: `kultr.cc`**, then tick **Enforce HTTPS**
   once the certificate is issued. (The workflow tries to set the domain
   itself, but the default token usually is not allowed to.)

And at the DNS provider for `kultr.cc`:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `evropiani.github.io` |

`web.kultr.cc` stays pointed at the app, as it is now.
