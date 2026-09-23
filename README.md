# DARA Studio

A local-first carousel editor built with Next.js, React, Zustand, Konva, and IndexedDB. Create a 1080 x 1440 carousel from a template, edit its slides and layers, and export PNG, ZIP, or PDF files.

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The **Create draft** path works without an AI service. To enable **Generate with AI**, set `GEMINI_API_KEY` in `.env.local` and restart the dev server:

```text
GEMINI_API_KEY=your_server_side_key
```

Without that key, AI copy generation returns a clear error and keeps the topic in the creation dialog. Draft creation never claims its starter text was researched or generated. The image action currently depends on the external Pollinations image endpoint. The server checks the returned image before adding it to a slide; if the service fails, the existing slide remains intact.

Documents and custom templates are stored in browser IndexedDB. They are local to that browser profile and are not synchronized across devices.

## Validation

```bash
npm run build
```

The product source of truth is the DARA Studio V2 master product document supplied with this project. Architecture notes are in `docs/architecture`.
