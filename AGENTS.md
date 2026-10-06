# DARA Studio: Agent Context

Read this before changing the product. It describes the current implementation and the product decisions that matter when working in this repository. Confirm details in the source before relying on them; this file is a map, not a substitute for reading affected code.

## Product

DARA Studio is an AI-assisted creative studio for making professional social-media carousels. Its central promise is to help a creator move from an idea to an editable, designed carousel, then export it, while keeping the creator in control. It is a focused carousel product, not a general chatbot or generic image generator.

The primary audience includes creators, publishers, marketers, agencies, founders, and social-media teams. Users range from non-designers who need a strong first draft to experienced designers who need precise control.

The core content hierarchy is:

**Workspace → Carousel → Slides → Layers → Properties**

Slides use a 1080 × 1440 px, 4:5 canvas by default. A carousel is a complete document with topic, template reference, slide scenes, creative direction, optional source URL, image concepts, and timestamps. A slide holds editable layers. Layers are typed objects (text, image, image slot, shape, logo, group) with position, size, visibility, locking, order, and type-specific properties.

The full product specification was supplied as `DARA Studio V2 Master Product Document` in the original project conversation. It is not currently checked into this repository. Its durable principles are: protect user work, reduce cognitive load, preserve creative control, keep state deterministic, make the carousel central, optimize common actions, and reveal advanced controls progressively.

## Current Product Surface

Top-level navigation in `src/components/NavigationHeader.tsx`:

- **Carousels:** local or workspace carousel library; create/open/manage documents.
- **Brand Kit:** reusable design templates, brand instructions/guidelines, and reusable Brand Profiles (currently primary logos).
- **Settings:** AI task routing, editable task instructions, profile, and sign-out.

Inside the editor, the right inspector tabs are ordered **Design, Layers, Create, Slots, Export**. The editor also has a canvas, left tool rail, slide filmstrip, document history controls, and mobile-specific layout behavior. Keep these familiar areas intact unless the user explicitly asks to change the product flow.

The New Carousel dialog supports starting from an idea or repurposing an Instagram carousel. Idea creation accepts a topic, slide count, and template, then offers **Create draft** (no AI call) or **Generate with AI**. Instagram import accepts a post URL but can only import media available through the authenticated professional account configured on the server. Imported image assets and the source URL are attached to the new carousel; it does not scrape arbitrary public accounts or extract text from images.

Editor capabilities visible in the current code include:

- Multi-slide editing, slide add/duplicate/delete/reorder, layout changes, slide backgrounds, and template editing.
- Text, image, image-slot, shape, logo, and group layers; empty image layers are useful targets for generated imagery.
- Layer selection, hierarchy, visibility/lock controls, grouping, stacking order, copying and pasting assets/layers across slides, and undo/redo.
- Image generation with a selectable model, prompt editing, per-carousel generated-image concept history/gallery, and the ability to apply an earlier concept to a slide or image layer.
- Image crop/reposition via direct manipulation in crop mode, corner radius, stroke/color/size, and exposure, contrast, saturation, temperature, highlights, and shadows.
- Text styling and resizing, shapes and gradients, template slots, snapping, and template save/reuse.
- Export to PNG files, ZIP of slide PNGs, or PDF.
- Brand logo layers can use a fixed image or resolve the Primary Logo from a selected Brand Profile. The editor preview is non-destructive; Brand Batch export renders each selected profile separately into one ZIP.
- AI content review panel. It critiques clarity, claim strength, and audience response; it explicitly warns that external claims have not been independently verified.

## Important Product Decisions

- The user prefers an Apple-inspired level of polish: calm, deliberate, compact, high-quality UI, with sensible defaults and expert controls available when relevant. Do not turn operational/editor pages into marketing pages or add explanatory feature-tour copy inside the UI.
- Keep the canvas central and maintain the current compact editor mental model. On mobile, make the existing controls usable rather than hiding essential workflows.
- AI output must remain editable. Failed generation must preserve the topic, existing slide content, and prior image assets.
- Preserve the current inspector order: Design → Layers → Create → Slots → Export.
- The user explicitly rejected the recently added four-stage **Create → Review → Edit → Publish** rollout and asked to restore the previous state. Do not reintroduce its storyboard-first creation flow, carousel-wide controls, one-click copy alternatives/history, built-in team approval/comments workflow, or publishing handoff unless the user asks again. This does not remove the separate AI content-review tool or the requested Supabase organisation collaboration.
- The user has reported custom templates missing in the past. Treat user-authored templates, carousel data, browser IndexedDB and workspace data as valuable. Never clear, overwrite, reseed, migrate destructively, or delete those records as a troubleshooting shortcut. Back up and use a reversible migration when a schema change requires one.
- Several files are already modified or untracked from ongoing work. Before editing, inspect `git status` and the relevant diff. Preserve changes you did not make; do not reset or clean the worktree.

## AI Tasks and Actual Limits

Settings currently provide four routes:

| Task | Current choices in `src/lib/aiModels.ts` |
| --- | --- |
| Carousel copy | Gemini 3.5 Flash; GPT-6 Luna |
| Content review | Gemini 3.5 Flash; GPT-6 Luna |
| Visual direction | GPT-6 Luna; ChatGPT (GPT-5.4 Mini); DeepSeek Flash |
| Image generation | GPT-Image-1.5; GPT-Image-1; Gemini 3.1 Flash Image; GPT-Image-2.5 Flare; Grok Image |

Provider identifiers and choices are centralized in `src/lib/aiModels.ts`; route validation and UI options must stay aligned. Gemini 3.5 Flash is text-only. The image route maps configured model identifiers to their image-capable provider/model. Provider availability, names, and retirement status can change; verify current official provider docs before changing model IDs or making service claims.

Users can edit or upload `.md`/`.txt` instructions for copy, content review, and separate Cover, Content, and CTA visual/image tasks in Settings. Files are limited to 20 KB; the imported text is model input, not executable code. Routing and instructions are saved in browser local storage. Do not store API credentials in these instructions or expose server keys in the browser.

Be precise about current capabilities:

- `/api/ai/pipeline` generates structured carousel copy. It does **not** browse the web or return researched citations. Despite the UI detail mentioning research, do not claim facts were independently researched.
- `/api/ai/review` produces an AI critique. It is not an independent fact-check, source retrieval, or guarantee of truth.
- Visual direction is used to produce an image prompt as part of the image workflow; check `src/components/InspectorPanel.tsx` and `/api/ai/image` before changing its routing.
- AI operations require the appropriate server-side provider key. Missing keys should produce actionable errors and leave existing user work intact.

## Architecture and Data

- Framework: Next.js 15 App Router, React 19, TypeScript, Zustand with Immer, `react-konva`/Konva, Tailwind utilities plus `src/app/globals.css`.
- `src/types/schema.ts` defines the canonical `CarouselDocument` schema version `2.0`, templates, slides, layers, AI settings, and asset records. Prefer extending this schema over adding competing document representations.
- `src/store/useCarouselStore.ts` is the main application state and mutation layer. Components should dispatch store actions rather than directly mutate the document. Keep undo/redo and saving semantics in mind when adding mutations.
- `src/components/KonvaCanvas.tsx` projects scene data onto the interactive canvas. `src/components/SlidePreview.tsx` renders previews. `src/lib/export.ts` renders PNG/ZIP/PDF output. Changes to text/image/shape rendering may need matching preview and export changes to prevent discrepancies.
- `src/lib/textEngine.ts`, `src/lib/imageRendering.ts`, `src/lib/fontLoader.ts`, and `src/lib/colorUtils.ts` contain shared rendering/measurement helpers. Reuse these instead of introducing slightly different calculations in each component.
- `src/lib/idb.ts` persists local documents and templates to IndexedDB database `dara-v2-db`. It embeds blob URL assets as data URLs when saving and supports a V1-to-V2 migration via `src/lib/migration.ts`.
- Brand Profiles are persisted in a separate local IndexedDB database (`dara-brand-profiles-db`) and in the org-scoped Supabase `brand_profiles` table for workspace use. Keep them out of the main carousel DB schema so old open tabs cannot block profile creation. Any legacy brand store is copied without deletion. `src/lib/brandResolution.ts` is the shared resolver for editor, preview, and export; fixed-logo layers and older documents retain fixed behavior. The additive migration is `supabase/migrations/20261005000000_brand_profiles.sql`.
- The app is local-first in development. Without public Supabase URL and publishable key, browser documents/templates/settings are stored locally. In production, cloud account configuration gates the app; missing config should not expose an unauthenticated public workspace.
- When an organisation is active, carousel documents and templates are read/written through Supabase (`src/lib/cloud.ts`). Carousel writes use version checks; conflicts are surfaced rather than silently overwriting a teammate's changes. Collaboration is asynchronous, not live multi-cursor editing.
- `supabase/migrations/20260924000000_organisations.sql` defines organisation tables, access policies, realtime setup, and service-rate reservation. Review RLS and migration effects carefully before modifying account/data access.
- Images are embedded in document JSON/data URLs today. There is no production object-storage pipeline (for example, R2) implemented. Large assets therefore affect document size and sync performance.
- Architecture notes: `docs/architecture/decisions/ADR-001-Scene-Schema.md`, `ADR-002-State-Projection.md`, and `ADR-003-Local-First-IndexedDB.md`.

## Main Code Map

| Area | Files |
| --- | --- |
| Application shell and page views | `src/app/page.tsx`, `src/components/NavigationHeader.tsx` |
| Carousel create/import dialog | `src/components/NewCarouselModal.tsx`, `src/components/InstagramImportForm.tsx`, `src/app/api/instagram/import/route.ts` |
| Canvas and editor controls | `src/components/KonvaCanvas.tsx`, `src/components/InspectorPanel.tsx`, `src/components/AddSlideModal.tsx` |
| Templates/Brand Kit | `src/components/SaveAsTemplateModal.tsx`, `src/components/BrandProfilesPanel.tsx`, `src/lib/brandResolution.ts`, `src/store/useCarouselStore.ts`, template views in `src/app/page.tsx` |
| AI preferences/prompts | `src/components/AISettingsPanel.tsx`, `src/lib/aiModels.ts`, `src/lib/reviewPrompt.ts` |
| AI APIs | `src/app/api/ai/pipeline/route.ts`, `src/app/api/ai/review/route.ts`, `src/app/api/ai/image/route.ts`, `src/lib/openaiServer.ts` |
| Export | `src/components/ExportModal.tsx`, `src/lib/export.ts` |
| Accounts and workspaces | `src/components/WorkspaceGate.tsx`, `src/components/ProfileSettingsPanel.tsx`, `src/lib/cloud.ts`, `src/lib/serverAuth.ts`, `src/app/api/organisations/**`, `src/app/api/invites/accept/route.ts`, Supabase migration |
| Schema and persistence | `src/types/schema.ts`, `src/store/useCarouselStore.ts`, `src/lib/idb.ts`, `src/lib/migration.ts` |
| Styling | `src/app/globals.css`, component-local class names |

## Accounts, Collaboration, and Security

Supabase Auth handles email/password registration and sign-in, password recovery, and optional email links. Users can create organisations, invite members, switch organisations, import their local carousels into a workspace, and manage their profile/sign out. Owners manage membership. Invite links are single-use, expire after seven days, and are restricted to the invited confirmed email. Resend sends invite mail.

Server routes authenticate bearer tokens and check organisation membership for AI/Instagram services. Limits are currently 12 image operations, 30 copy/review operations, and 20 Instagram imports per user per hour through the database RPC. Validate inputs and enforce authorization on the server; client-side visibility is not access control.

Never commit `.env*` secrets, print secrets in logs, include private keys in client-side code, or place API keys in example values. `NEXT_PUBLIC_*` values are browser-visible. Server-only variables include `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, AI provider keys, and Instagram tokens. `.env.example` is the variable-name checklist; actual values belong in Railway/service environment settings or ignored local environment files.

## Running and Deployment

Use Node/npm and the lockfile:

```bash
npm ci
npm run dev
```

The local app defaults to `http://localhost:3000`. Production scripts are `npm run build` and `npm start` (`next start`). Railway is connected to the GitHub repository; the repository root is this app's root. Railway can detect those npm scripts and passes its dynamic `PORT` to Next. See the Railway section in `README.md` before deployment.

Supabase values for a cloud deployment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` for invitation links

Public Supabase values are inlined during Next build, so set them before building and rebuild after changes. Invite mail also needs `RESEND_API_KEY` and `INVITE_FROM_EMAIL`. AI providers are optional and require their matching server key (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`). Instagram professional-account import needs `INSTAGRAM_ACCESS_TOKEN`; Facebook Login additionally needs `INSTAGRAM_ACCOUNT_ID`. Apply the Supabase migration and configure Supabase Auth's site/redirect URLs and SMTP before public account use.

## Working Rules for Future Changes

1. Read the relevant code and existing git diff before editing; work with dirty files.
2. Make the smallest change that completes the user's request and follow established patterns.
3. Preserve user data. For schema/persistence work, plan a backwards-compatible migration and avoid destructive defaults.
4. Keep the document schema canonical. Mutate it through store actions and preserve undo/redo, autosave, template mapping, and workspace scoping.
5. For visual changes, inspect desktop and mobile sizes; do not let controls overlap or hide essential editor actions.
6. When changing a visual property, verify interactive canvas, thumbnail preview, and export behavior all agree.
7. Give clear loading/error states. AI/network failures must not erase or replace existing content.
8. Do not say an AI fact-check is verified unless independent sources were fetched and checked.
9. Avoid broad workflow redesigns unless requested. In particular, do not resurrect the rejected storyboard/Create→Review→Edit→Publish experiment.
10. Be honest about what was run and what remains unverified. Do not claim a production deployment or live integration was verified just because the code compiles.

## Current Known Launch Gaps

- A live Supabase project, the SQL migration, Auth email settings, verified Resend sender, and Railway variables must be configured outside this repo.
- Copy generation and AI review do not independently retrieve sources; review is critique, not fact verification.
- Media is embedded into document records instead of managed in cloud object storage.
- Collaboration detects version conflicts, but it does not merge concurrent edits or support simultaneous editing.
- Public launch still needs production browser testing, database/RLS tests, operational logging/monitoring, backup/recovery planning, and privacy/terms review.
- Check provider model support and lifecycle against official docs before release; model IDs in this code may become outdated.
