# Simple Todo Vite App

This Vite app provides a minimal todo UI that persists todos to a file at the root of the host project named `todos.json`.

Quick start:

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

Open http://localhost:5173 and add todos. The list is saved to `todos.json` in the current working directory (project root) where you ran `npm run dev`.

Files of interest:

- [vite.config.js](vite.config.js) — adds a small `/api/todos` endpoint that reads/writes `todos.json` at the project root.
- [src/App.jsx](src/App.jsx) — React UI that fetches and POSTs todos to `/api/todos`.
# joty
Open source local todo app
