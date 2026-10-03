# Icon Crate

Type a keyword (or pick a sample search) and Claude picks the cute icons that match it. The matches fly out of the pile at the bottom into a wooden crate, best match first. Icons that don't match stay in the pile.

- **Frontend:** plain HTML/CSS/JavaScript in `public/`. Icons are local emoji, so no images are downloaded.
- **Server:** `server.mjs`, a small Node server. It serves the page and calls Claude (`claude-opus-5-5`) using the official `@anthropic-ai/sdk`. The API key stays on the server and is never sent to the browser.

## Setup

Requires Node.js 18 or newer.

```bash
cd icon-crate
npm install
```

### Add your Claude API key

Create a folder named `api_keys` at the repository root (next to `icon-crate/`) or inside `icon-crate/`. Put a file in it named `CLAUDE_API_KEY.txt` or `CLAUDE.txt` (any capitalization, e.g. `claude.txt`) that contains your Anthropic API key, either on its own or as `ANTHROPIC_API_KEY = "sk-ant-..."`:

```
BUS4498_InClass_Builds/
├── api_keys/
│   └── CLAUDE_API_KEY.txt   ← your API key
└── icon-crate/
```

`api_keys/` is listed in `.gitignore`, so the key won't be committed. The server never prints the key. It only logs which file it loaded the key from.

## Run

```bash
npm start
```

Then open http://localhost:3000. To use a different port, set `PORT`, for example `PORT=4000 npm start`.

## How it works

1. The browser sends the keyword to `POST /api/sort`.
2. The server sends Claude the keyword and the icon catalog (ID, name, tags). It uses structured outputs, so Claude can only return a list of catalog IDs, in relevance order.
3. The server checks every returned ID against the catalog and drops unknown or repeated ones. The browser checks them again before showing anything. Claude's output is never inserted into the page as markup.

## Without a key: local fallback

If there's no key file, the app still runs. It uses **local keyword matching**, which compares the keyword against icon names and tags. The page labels this mode clearly and says which file is missing. Add the key file and search again; you don't need to restart the server.

If a Claude request fails (bad key, rate limit, no network), the page shows the error and uses local matches for that search.

## Files

| File | Purpose |
|---|---|
| `server.mjs` | Local server: static files, `/api/status`, `/api/sort` (Claude call, key loading, ID validation) |
| `public/index.html` | Page structure |
| `public/styles.css` | Dark theme, wooden crate, responsive layout, reduced-motion rules |
| `public/app.js` | Search, loading/empty/error states, crate animation |
| `public/icons.js` | Icon catalog with stable IDs, names, and tags (shared with the server) |
| `public/match.js` | Local keyword-matching fallback |
