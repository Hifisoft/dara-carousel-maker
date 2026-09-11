# ADR-003: Local-First IndexedDB Persistence Engine

## Context
V1 stored all carousels as a JSON string inside browser `LocalStorage`. When users added multi-image carousels or extensive undo stacks, LocalStorage hit browser string limits (5MB) and threw silent quota exceptions.

## Decision
We adopt a **Local-First Architecture** using IndexedDB (via the `idb` library):
- All documents, history snapshots, and backup objects persist to IndexedDB asynchronously.
- Cloud sync (Supabase PostgreSQL & Cloudflare R2) occurs out-of-band in background tasks.
- Network latency or offline states never block local editor responsiveness.

## Consequences
- Unlocks gigabytes of local storage capacity for high-resolution images and document histories.
- Full offline editing support.
