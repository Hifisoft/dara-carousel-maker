# ADR-002: Reactive State Projection Architecture

## Context
In V1, user interactions manually edited DOM elements via procedural jQuery-like scripts. This resulted in out-of-sync UI state across inspect panels, thumbnail bars, and slide canvas layers.

## Decision
We enforce a strict single-directional state projection flow using **Zustand + Immer**:

```
APPLICATION STATE  ──>  DERIVED STATE  ──>  REACT COMPONENT RENDER  ──>  USER ACTION DISPATCH
```

- Components never edit DOM elements procedurally.
- Mouse drag operations update local Konva node transforms at 60fps via `requestAnimationFrame`, committing exactly **one mutation transaction** on `pointerup` to ensure `1 Drag = 1 Undo`.

## Consequences
- Eliminates DOM race conditions.
- Guarantees predictable Undo/Redo behavior (minimum 50 transactions).
