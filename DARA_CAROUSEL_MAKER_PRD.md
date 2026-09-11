# Product Requirements Document (PRD)
## DARA Carousel Maker Platform

**Document Version:** 1.0  
**Status:** Approved / Active  
**Author:** AI Product & Engineering Team  
**Last Updated:** September 2026  

---

## 1. Executive Summary

**DARA Carousel Maker** is a state-of-the-art, web-based platform engineered for content creators, marketers, founders, and social media strategists to design, generate, and publish viral, high-converting carousels (LinkedIn, Instagram, Twitter/X). 

By uniting a **Template-First Design System** with an advanced **AI Creative Director & Copywriting Engine**, DARA automates the end-to-end carousel creation workflow: from topic research and narrative structuring (Hook, Setup, Insights, CTA) to high-resolution asset export (1080x1440 4:5 vertical carousel format).

---

## 2. Product Vision & Core Objectives

### 2.1 Vision
To empower creators to produce world-class, visual narrative carousels in seconds without needing professional design agency resources or complex graphic design tools.

### 2.2 Core Objectives
* **Speed to Publish:** Reduce carousel creation time from 2+ hours to under 60 seconds.
* **Template-First Consistency:** Establish the selected design template as the single source of truth for all styling, layout coordinates, typography, shapes, and logo placement.
* **High-Impact Copywriting:** Enforce concise, high-converting copy guidelines (headlines under 8-10 words, body copy strictly under 200 characters with detailed explanations).
* **Multi-Provider AI Freedom:** Support flexible routing across top-tier LLMs (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini Pro) and Image Generators (Flux.1, Replicate, Fal.ai, Midjourney prompts).
* **Pixel-Perfect Canvas Editing:** Provide zero-friction visual editing (drag-and-drop, real-time resizing, layer alignment, multi-language translation, and manual text highlighting).

---

## 3. User Personas & Target Use Cases

| Persona | Primary Needs | Key DARA Features Used |
| :--- | :--- | :--- |
| **B2B Thought Leaders & Executives** | Fast LinkedIn carousel production, strict brand voice, data-driven narrative flows. | AI Copywriter, Hook Headline Wizard, Custom AI Creative Director Guidelines. |
| **Social Media Managers & Agencies** | Managing multiple visual styles, rapid multi-format exports, client template reusability. | Template Library, Deep Edit Mode, PNG/PDF Export, Brand Kit. |
| **Creators & Solo Founders** | High visual polish without design skills, multi-language localization, automated image prompts. | Image Generation Integration, Multi-Language Translator, Story Flow Engine. |

---

## 4. Architecture & Technical Foundations

### 4.1 Technology Stack
* **Frontend Core:** Single-Page Application (SPA) built with Vanilla HTML5, Vanilla JavaScript (ES2024), and custom CSS3 design tokens.
* **Design System:** Custom Dark Mode / Glassmorphism UI tokens, typography system, responsive flexbox/grid containers.
* **AI API Integration:** Fetch-based API client with rate-limiting, error fallbacks, and multi-provider routing (OpenAI, Anthropic, Gemini, Replicate, Fal.ai).
* **Canvas Rendering:** Dynamic HTML/CSS interactive canvas with pre-computed DOM bounds calculation to prevent layout thrashing (60fps drag & resize).
* **Storage & State:** LocalStorage state persistence with debounced 1-second auto-saves and background template draft recovery.

---

## 5. Detailed Feature Specifications

### 5.1 Dashboard & Project Management (`#view-dashboard`)
* **Project Grid:** Displays all saved carousel projects with real-time thumbnail previews, title, slide count, and last-edited timestamps.
* **Search & Filters:** Instant keyword filtering across project titles and topics.
* **Project Actions:** Single-click project creation, duplication, renaming, deletion, and quick export.
* **Creation Wizard Modal (`#modal-new-post`):**
  * Topic / Prompt input field.
  * Slide count selector (3 to 10 slides).
  * Custom Hook Headline field (optional user-provided hook).
  * **Design Style / Template Dropdown Selector (`#newpost-template-selector`):** Allows users to select which design template from the Brand Kit will style the new carousel upon creation.

### 5.2 AI Copywriter & Carousel Generator Engine
* **Narrative Structuring:**
  * **Slide 1 (Cover):** Powerful Hook Headline + Subtitle + Hero Visual.
  * **Slide 2 (Setup):** Friction / Problem context.
  * **Slides 3 to N-1 (Value/Insights):** Actionable insights, frameworks, or key points.
  * **Slide N (CTA):** High-converting summary and call-to-action.
* **Strict Copy Length Constraints:**
  * **Headline:** 8–10 words max, high-impact title phrasing.
  * **Slide Body Text:** Strictly under 200 characters (letters), providing clear explanations and details.
* **Clean Text Rendering (No Auto-Highlights):** Disables automatic green/accent color highlights during AI generation, reserving text styling for user-initiated editor formatting.

### 5.3 Interactive Slide Canvas Editor (`#view-editor`)
* **Aspect Ratio:** Fixed 1080x1440 vertical 4:5 ratio (standard LinkedIn/Instagram format).
* **Slide Deck Strip:** Bottom thumbnail strip enabling real-time navigation across slides, slide reordering, adding new slides, and slide duplication.
* **Canvas Layer Types:**
  1. **Text Layers:** Headline, Body, Subtitle, CTA text with full control over font family, font size, weight, color, alignment, line-height, and custom `styleRuns` (range-based highlighting).
  2. **Shape Layers:** Rectangles, circles, accent bars, and banners with custom solid or gradient fills.
  3. **Image Layers:** Integrated AI prompt generation, status indicators (`not_generated`, `generating`, `ready`), and asset URL handling.
  4. **Logo Layers:** Dedicated position, width, height, and asset source parameters.
* **Quick Edit Sidebar Panel:**
  * Quick text inputs for active slide title and body text.
  * Story Flow Segment selector (Cover, Setup, Insight, CTA).
  * **Multi-Language Translate:** Instant translation of slide copy into 10+ target languages (Spanish, French, German, Japanese, etc.).
* **Visual Manipulation:** Direct drag-and-drop position manipulation, bounding box resize handles, snap alignment, and keyboard nudge controls.

### 5.4 Template-First Brand Kit Library (`#view-brandkit`)
* **Architecture Principle:** The template is the ultimate source of truth. All visual parameters (shapes, colors, font families, text sizes, weights, background gradients, and logo coordinates) live inside the template structure.
* **Sub-Tab 1: Design Templates (`#tab-brandkit-templates`)**
  * Active Template Selector with instant inline template renaming (`#brandkit-template-name-input`).
  * `+ New Template` creator.
  * `Deep Edit` mode launcher: Opens the canvas editor in template-customization mode with full slide layer editing (Cover, Content, CTA master layouts).
  * `Save Template` Action Button (`#btn-save-template-done`): Saves deep edit layout changes, regenerates preview thumbnails, and returns to the Brand Kit.
  * `Apply to Current Carousel`: Applies the template's cloned shapes, background gradients, typography rules, and logo layout directly to an active carousel without overwriting user-written text content.
* **Sub-Tab 2: AI Creative Director Guidelines (`#tab-brandkit-skills`)**
  * Interactive markdown rule editors categorized by section:
    * **Global Guidelines:** Brand voice, tone, visual style rules.
    * **Cover Slide Guidelines:** Hook styling, hero composition.
    * **Content Slide Guidelines:** Layout structure, background contrast.
    * **CTA Slide Guidelines:** Branding elements, follow prompts.
  * File Uploader (`.md` / `.txt` custom prompt injection).
  * Guidelines status toggles and interactive **Simulation Console** to preview AI responses before generation.

### 5.5 Settings & Provider Routing (`#view-settings`)
* **API Key Management:** Secure client-side configuration for OpenAI, Anthropic, Gemini, Replicate, and Fal.ai.
* **Model Routing Selectors:**
  * **Copy Generation Model:** (e.g. `gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-pro`).
  * **Image Generation Model:** (e.g. `flux-1-schnell`, `flux-1-dev`, `dall-e-3`).

### 5.6 Export & Publishing System
* **Export Options:**
  * **Single Slide PNG:** High-resolution 1080x1440 image rasterization.
  * **All Slides (ZIP):** Bundles all slide images into a single zip archive for Instagram upload.
  * **Carousel PDF:** Combines all slides into a multi-page PDF document optimized for LinkedIn native carousel posts.

---

## 6. Data Schema Specifications

### 6.1 Carousel Post Schema
```json
{
  "id": "post-1725500000000",
  "title": "Ethiopia's Coffee Exports Hit All-Time High",
  "topic": "Ethiopia coffee trade boom",
  "templateId": "temp-building-empire",
  "createdAt": "2026-09-05T00:00:00.000Z",
  "updatedAt": "2026-09-05T00:15:00.000Z",
  "slides": [
    {
      "id": "slide-0",
      "segment": "Cover Slide",
      "backgroundColor": "#121212",
      "backgroundGradient": null,
      "layers": [
        {
          "id": "layer-text-headline",
          "type": "text",
          "role": "headline",
          "content": "Coffee: Ethiopia's Economic Backbone",
          "x": 60,
          "y": 800,
          "width": 960,
          "height": 200,
          "fontFamily": "Montserrat",
          "fontSize": 48,
          "fontWeight": "800",
          "color": "#FFFFFF",
          "textAlign": "left",
          "styleRuns": []
        },
        {
          "id": "layer-text-body",
          "type": "text",
          "role": "body",
          "content": "Explore the pivotal role of coffee in Ethiopia's booming export economy and record global revenue growth.",
          "x": 60,
          "y": 1020,
          "width": 960,
          "height": 160,
          "fontFamily": "Inter",
          "fontSize": 24,
          "fontWeight": "400",
          "color": "#CCCCCC",
          "textAlign": "left",
          "styleRuns": []
        }
      ]
    }
  ]
}
```

### 6.2 Design Template Schema
```json
{
  "id": "temp-building-empire",
  "name": "Building Empire",
  "category": "Corporate / Executive",
  "coverSlide": {
    "backgroundColor": "#111111",
    "layers": [ /* Master layer positions and styles */ ]
  },
  "contentSlide": {
    "backgroundColor": "#111111",
    "layers": [ /* Master layer positions and styles */ ]
  },
  "ctaSlide": {
    "backgroundColor": "#111111",
    "layers": [ /* Master layer positions and styles */ ]
  }
}
```

---

## 7. UX / UI Design Principles & Quality Standards

1. **Rich Modern Aesthetic:** Dark mode background (`#0D0D11`), sleek glassmorphism panels, vibrant accent tokens, and crisp typography (Google Fonts: Inter, Montserrat, Outfit).
2. **Zero Layout Thrashing:** Pre-computed element dimensions during mouse dragging and resizing cycles ensure smooth 60fps interaction.
3. **Template Supremacy:** Visual properties defined in customized template designs take 100% precedence over system fallbacks.
4. **Resilient Asset Loading:** Graceful `onerror` handling for image assets prevents broken image URL render loops.

---

## 8. Release Verification & Test Coverage

* **Syntax & JS Integrity:** Verified via script block validation (`check_html_js.js`).
* **Template Inheritance & Deep Edits:** Tested via headless DOM automation scripts (`test_rename_and_styling.js`, `test_apply_template_first.js`).
* **Build Compliance:** Monorepo package build verified via `npm run build`.

---

*End of Product Requirements Document.*
