# SomlengPit — Mock UI (Classic + ✨ New)

A clickable mock of the SomlengPit website with fake data, made for demos and design review.
Every page has two designs, **Classic** (like the real site) and **✨ New** (redesign).
Use the floating **Classic | ✨ New** button at the bottom centre to switch.

## Pages

| Group | Pages |
|---|---|
| Platform | Dashboard, Transcribe, Subscriptions, Redeem Code, API Tokens, MCP |
| SomlengPit | Projects, Studio, My Voices, Buy Tokens, Token History |

Studio extras: templates (Case 1–4), import, paste, JSON convert, multi-version lines, audio deck, SRT and caption download.
Header extras: dark mode, Khmer labels, and **Many voices** (adds 60 fake voices to test a big library).

## Run

Needs Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview      # http://localhost:4173
```

Share a public demo link (Cloudflare quick tunnel, link changes every time):

```bash
cloudflared tunnel --url http://localhost:4173 --no-autoupdate --protocol http2
```

## Data

All data is mock (`src/data.ts`, `src/store.tsx`). Nothing is saved; a refresh resets it.
The header badge shows **Mock data**.

Optional: this project also contains the backend (`server/index.mjs`). If you run `npm run backend`
(port 8787) and VoxPocket is running on port 7870, the badge turns green and Studio makes real speech.
For the real version use **SomlengPit Live** instead.

## Code map

```
src/
  App.tsx          router (page -> component, classic and -new)
  store.tsx        all app state, fake player, generate
  data.ts          mock voices, projects, templates, import/convert helpers
  Layout.tsx       sidebar, header, floating design switch
  ui.tsx           small UI parts (Button, Card, Modal, Toasts…)
  pages/
    Projects.tsx  ProjectsNew.tsx
    Studio.tsx    StudioNew.tsx
    MyVoices.tsx  VoicesNew.tsx  VoiceModal.tsx
    Platform.tsx  (classic Dashboard, Transcribe, Plans, Redeem, API, MCP, Buy, History)
    PlatformNew.tsx (the ✨ New versions of those)
```

Stack: Vite 8, React 19, TypeScript, Tailwind CSS v4, lucide-react.
