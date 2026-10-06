# DARA Studio

A local-first carousel editor built with Next.js, React, Zustand, Konva, and IndexedDB. Create a 1080 x 1440 carousel from a template, edit its slides and layers, and export PNG, ZIP, or PDF files.

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The **Create draft** path works without an AI service. Configure server-side keys for the models you select in AI settings, then restart the dev server:

```text
GEMINI_API_KEY=your_server_side_key
OPENAI_API_KEY=your_server_side_key
DEEPSEEK_API_KEY=your_server_side_key
XAI_API_KEY=your_server_side_key
```

Carousel copy and content review can use Gemini 3.5 Flash or GPT-6 Luna. Visual direction can use GPT-6 Luna, ChatGPT (GPT-5.4 Mini), or DeepSeek Flash. Image generation can use GPT-Image-1.5, GPT-Image-1, Gemini 3.1 Flash Image, GPT-Image-2.5 Flare, or Grok Image. Gemini 3.5 Flash does not generate images, so the Gemini image option uses the image-capable 3.1 Flash model. GPT-Image-1 and 1.5 have announced API shutdown dates; migrate to a newer image model before those dates. Missing keys produce a clear error and preserve the existing carousel. Draft creation never claims its starter text was researched or generated.

AI settings let you route carousel copy, content review, visual direction, and image generation to supported models. These choices and any pasted or uploaded `.md`/`.txt` master instructions are stored in browser local storage, then sent with each applicable request. Visual instructions are edited separately for Cover, Content, and CTA slides; an existing single visual prompt is copied into all three when older settings are loaded. Do not put secrets in instruction files.

## Instagram import

To import image carousels from an Instagram professional account you manage, provide an access token with media read access in `.env.local`:

```text
INSTAGRAM_ACCESS_TOKEN=your_server_side_token
# For Instagram API with Facebook Login only:
INSTAGRAM_ACCOUNT_ID=your_ig_professional_account_id
```

With Instagram Login, omit `INSTAGRAM_ACCOUNT_ID`; DARA uses `/me/media`. With Facebook Login, set it so DARA can query that account's media. Restart the server, then choose **New carousel → Repurpose Instagram**. The importer finds the post in the connected account's recent media and saves its image slides locally. Videos are skipped; text baked into imported images is not automatically converted to editable text. Arbitrary public posts from accounts you do not manage are not available through this authenticated flow. For those, download images you have permission to reuse and choose **Upload slide images instead** in the creation dialog.

Without cloud configuration, development runs as a local-only editor. In production, missing cloud configuration closes the app and AI routes instead of exposing an unauthenticated workspace.

## Accounts and organisation workspaces

DARA supports email/password sign-in, account creation, password recovery, optional passwordless email links, organisation creation, member invitations, shared carousels and templates, and explicit import of existing local carousels. Passwords are handled by Supabase Auth, never stored in this repository. Organisation owners can invite or remove members. Invites are single-use, expire after seven days, and can only be accepted by the confirmed email address invited. Other members' updates appear in the workspace; if an editor is open, a reload notice is shown instead of replacing work silently. Each carousel save uses a version check, so concurrent edits fail with a visible conflict rather than overwriting a teammate's changes. This is asynchronous collaboration, not simultaneous editing of the same carousel.

To enable it:

1. Create a Supabase project and run the SQL migrations in timestamp order: [`20260924000000_organisations.sql`](supabase/migrations/20260924000000_organisations.sql), then [`20261005000000_brand_profiles.sql`](supabase/migrations/20261005000000_brand_profiles.sql). They enable RLS and Realtime for shared records and brand profiles.
2. Enable email/password authentication in Supabase Auth. Configure the Site URL and redirect allow list for your HTTPS app domain (and localhost during development). Configure a production SMTP provider for confirmation, recovery, and optional magic-link emails.
3. Verify your sending domain in Resend. Set the values in [`.env.example`](.env.example) in your deployment platform, keeping service-role and email keys server-side. `NEXT_PUBLIC_APP_URL` must be the canonical HTTPS origin used in invitation emails.
4. Deploy the Next.js app, create two test accounts, and verify owner creation, sending and accepting an invite, member access, cross-account editing, version conflicts, and removal. Test with a real browser and deployed database before inviting the public.

AI requests are authenticated, require organisation membership, and are limited per user per hour (12 images, 30 copy generations, 20 Instagram imports). Configure provider keys separately. Existing local carousels remain in IndexedDB until a user explicitly chooses **Import local carousels** from the organisation menu. Imported copies get new IDs; local originals remain untouched.

Brand Kit also stores reusable Brand Profiles with a primary logo. Logo layers can stay fixed or resolve a Brand Profile at render time. The editor preview is temporary and does not modify the carousel. Brand Batch export renders each selected brand sequentially into one ZIP organized by brand, while preserving the master carousel. Local profiles use a separate IndexedDB database so adding profiles does not require upgrading the main carousel database; organisation profiles require the brand-profile migration.

## Deploy on Railway

Connect the GitHub repository to a Railway service with the repository root as its root directory. Railway detects the npm scripts and runs `npm run build` followed by `npm start`; `next start` listens on Railway's assigned `PORT`.

Add these variables to the Railway service before its first deployment. The two `NEXT_PUBLIC_` values are included in the browser bundle, so set them before building and redeploy after changing them. The publishable key is intended for browser use; never put a secret key behind the `NEXT_PUBLIC_` prefix.

| Variable | Required for | Value source |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser sign-in and workspace access | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser sign-in and workspace access | Supabase publishable key |
| `SUPABASE_URL` | Server-side organisation and invite APIs | Same Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Supabase client setup | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Server-side organisation and invite APIs | Supabase secret key; keep private |
| `NEXT_PUBLIC_APP_URL` | Links in invitation emails | Railway's public HTTPS domain or your custom domain |

To enable email invitations, also set `RESEND_API_KEY` and `INVITE_FROM_EMAIL` with a verified sender address. Add only the AI provider keys for models you enable in AI settings (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`). Instagram import additionally uses `INSTAGRAM_ACCESS_TOKEN`; Facebook Login also requires `INSTAGRAM_ACCOUNT_ID`. These service keys must remain server-side.

After deployment, configure the same HTTPS domain as the Supabase Auth Site URL and add it to the redirect URL allow list. Apply the database migration described above, then verify sign-in, organisation creation, invite delivery, and the AI models you plan to offer. Railway can deploy the app, but it does not provision the Supabase project, email sender, or AI provider keys.

**Launch status:** The repository now has the core account and team workflow, but it is not verified for public release without a live Supabase project, an email sender, and end-to-end tests. High-resolution assets are currently embedded in carousel JSON rather than stored in object storage, and simultaneous editing is intentionally blocked by version checks. Add production asset storage, automated database/RLS tests, operational monitoring, backups, and privacy/terms review before a broad public launch.

## Validation

```bash
npm run build
```

The product source of truth is the DARA Studio V2 master product document supplied with this project. Architecture notes are in `docs/architecture`.
