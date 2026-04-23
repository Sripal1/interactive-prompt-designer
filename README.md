# Interactive Prompt Designer

Interactive prompt editor for building prompts in two modes:

- `Designer`: compose a prompt from structured sections like role, task, context, constraints, examples, and format
- `Chat`: talk to the model directly in a simpler back-and-forth UI

The app is frontend-only. It runs in the browser, stores state locally, and sends requests directly to Google's Generative Language API using a Gemini-compatible key.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand for client state
- Dexie / IndexedDB for local session logging
- Vitest + Testing Library

## Requirements

- Node.js 20 recommended
- `pnpm` 9 recommended
- A Gemini API key

CI currently uses Node 20 and `pnpm`.

## Setup

```bash
cd /Users/shivomdhamija/Documents/GitHub/interactive-prompt-designer
cp .env.example .env.local
```

Set your local environment values in `.env.local`:

```env
VITE_GEMINI_API_KEY=your_key_here
VITE_GEMINI_BASE_URL=
```

Notes:

- `VITE_GEMINI_API_KEY` is optional for local development. If omitted, you can paste the key into the in-app Settings dialog instead.
- `VITE_GEMINI_BASE_URL` is optional and usually should be left blank.
- `VITE_*` variables are embedded into the browser bundle. Do not ship a private shared API key in a public deployment.

## Install

If `pnpm` is not installed yet:

```bash
npm install -g pnpm
```

Then install dependencies:

```bash
pnpm install
```

## Run

Start the dev server:

```bash
pnpm dev
```

Vite will print a local URL, typically:

```text
http://localhost:5173
```

If the API key was not supplied through `.env.local`, open Settings in the app and paste it there.

## Scripts

```bash
pnpm dev         # start local dev server
pnpm build       # type-check and build production assets
pnpm preview     # serve the production build locally
pnpm typecheck   # run TypeScript checks
pnpm test        # run tests once
pnpm test:watch  # run tests in watch mode
pnpm aggregate   # run scripts/aggregate.ts
```

## How It Works

Main areas of the codebase:

- `src/components`: UI components
- `src/store`: Zustand stores for session, settings, and prompt components
- `src/providers`: model provider integration
- `src/prompt`: prompt schema, rendering, and starter content
- `src/meta`: helper flows for clarifying questions, drafting, and diff explanations
- `src/logger`: local session persistence and export

The current provider wiring is centered on:

- provider: Gemini / Generative Language API
- model: `gemma-3-27b-it`
- transport: streaming SSE responses in the browser

## Data and Privacy

- This app does not require a backend to run locally.
- Settings are stored in browser local storage.
- Session logs are stored in browser IndexedDB.
- Requests are sent from the browser directly to the configured model endpoint.

## Deployment

GitHub Actions builds and deploys the app to GitHub Pages on pushes to `main`. The workflow also runs:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

See [deploy.yml](/Users/shivomdhamija/Documents/GitHub/interactive-prompt-designer/.github/workflows/deploy.yml).
