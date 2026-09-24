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

Carousel copy uses Gemini 3.5 Flash. Visual direction can use ChatGPT (GPT-5.4 Mini) or DeepSeek Flash. Image generation can use Gemini 3.1 Flash Image, ChatGPT Image, or Grok Image. Gemini 3.5 Flash does not generate images, so the Gemini image option uses the image-capable 3.1 Flash model. Missing keys produce a clear error and preserve the existing carousel. Draft creation never claims its starter text was researched or generated.

AI settings let you route carousel copy, visual direction, and image generation to supported models. These choices and any pasted or uploaded `.md`/`.txt` master instructions are stored in browser local storage, then sent with each applicable generation request. Do not put secrets in instruction files.

## Instagram import

To import image carousels from an Instagram professional account you manage, provide an access token with media read access in `.env.local`:

```text
INSTAGRAM_ACCESS_TOKEN=your_server_side_token
# For Instagram API with Facebook Login only:
INSTAGRAM_ACCOUNT_ID=your_ig_professional_account_id
```

With Instagram Login, omit `INSTAGRAM_ACCOUNT_ID`; DARA uses `/me/media`. With Facebook Login, set it so DARA can query that account's media. Restart the server, then choose **New carousel → Repurpose Instagram**. The importer finds the post in the connected account's recent media and saves its image slides locally. Videos are skipped; text baked into imported images is not automatically converted to editable text. Arbitrary public posts from accounts you do not manage are not available through this authenticated flow. For those, download images you have permission to reuse and choose **Upload slide images instead** in the creation dialog.

Documents, image concepts, and custom templates are stored in browser IndexedDB. They are local to that browser profile and are not synchronized across devices.

## Validation

```bash
npm run build
```

The product source of truth is the DARA Studio V2 master product document supplied with this project. Architecture notes are in `docs/architecture`.
