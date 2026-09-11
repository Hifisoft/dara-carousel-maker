# ADR-001: Canonical Scene Schema v2.0

## Context
DARA V1 suffered from competing sources of truth across raw HTML DOM structures, LocalStorage post arrays, and client-side AI response fragments. To upgrade DARA to professional creative software standards, a single canonical document scene format is required.

## Decision
We establish `CarouselDocument` (`schemaVersion: 2.0`) as the immutable canonical scene document. All visual layout properties, slide segment roles, layer nodes, text formatting, and `styleRuns` ranges derive exclusively from this document.

## Consequences & Tradeoffs
- **Single Source of Truth**: Konva canvas nodes, inspect panels, and server-side PDF renderers project directly from `CarouselDocument`.
- **Migration Requirement**: Legacy V1 LocalStorage items are parsed and upgraded via `migrateV1ToV2` into schemaVersion 2.0 instances upon launch.
- **Rollback Safety**: Raw V1 data structures are backed up to IndexedDB `backups` object store prior to schema mutation.
