# DionAi Wiki

Προσωπικό navigation hub για HTML pages που ζουν στα `projects/`.

## Run

```bash
./scripts/wiki.sh
```

Ανοίγει browser στο `http://127.0.0.1:4173/wiki/`. Stop με `Ctrl+C`.

Override port: `WIKI_PORT=8080 ./scripts/wiki.sh`.

## Structure

- `index.html` — SPA shell (topbar, sidebar, iframe)
- `app.js` — routing + manifest loading
- `styles.css` — dark minimal chrome
- `manifest.json` — manual registry of pages

## Add a page

Edit `manifest.json`. Example:

```json
{
  "groups": [
    {
      "slug": "video-templates",
      "title": "Video Templates",
      "pages": [
        {
          "slug": "color-rules",
          "title": "Color Rules",
          "path": "../projects/video-templates/color-rules/index.html",
          "tags": ["design"]
        }
      ]
    }
  ]
}
```

Rules:
- `slug` must be unique within its group, URL-safe
- `path` is relative to `wiki/` (use `../projects/...`)
- Reload browser to pick up changes

## Deep links

`http://127.0.0.1:4173/wiki/#/<group-slug>/<page-slug>` opens directly.
