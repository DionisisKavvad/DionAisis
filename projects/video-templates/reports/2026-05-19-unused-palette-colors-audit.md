# Unused Palette Colors Audit — Effective Templates

**Date:** 2026-05-19
**Status:** PARTIAL — template-98 out-of-bounds metadata FIXED. template-98 dead index 2 + template-121 bypass index 3 still pending.
**Full report:** `~/Projects/video-templates/reports/2026-05-19-unused-palette-colors-audit.md`

## TL;DR
Audit στα 19 effective templates. v3 revision αποκάλυψε στο template-98 και out-of-bounds `_metadata: { color: 3 }` (palette έχει μόνο indices 0-2). **Αφαιρέθηκαν τα 2 metadata blocks**, τα δύο product-card Rect μένουν `fill: 'white'` μόνιμα. Παραμένουν εκκρεμή: dead slot στο 98 (index 2 `#f6f6f6`) και bypass στο 121 (index 3 `#ff0000`).

## Findings (v2)

| Template | Palette | Issue |
|---|---|---|
| template-98 | `['#4C756C', '#d9c696', '#f6f6f6']` | index `[2]` (`#f6f6f6`) never referenced — dead slot |
| template-121 | `['#F7F06A', '#D5C62E', '#6B66FF', '#ff0000']` | index `[3]` (`#ff0000`) hardcoded στο `oldPriceLine` stroke (4 spots) αντί `__color[3]` — bypass |

Clean: 45, 48, 57, 60, 74, 78, 81, 95, 99, 106, 112, 115, 117, 118, 119, 124, 126.

## Method (v2)
Λαμβάνει υπόψη και τα τρία mechanisms:
1. `'__color[N]'` static placeholders
2. `palette[N]` runtime refs μέσω `useScene().variables.variables.palette`
3. `_metadata: { color: N }` (H-01 pattern) σε runtime nodes μέσα σε `Function*`

Plus grep raw hex για bypass detection.

## v1 false positives (corrected)

- **template-45 index 1**: χρησιμοποιείται. Οι `bgLines` φτιάχνονται runtime σε Function* και ταγκάρονται `_metadata = { color: 1 }` (`:1699, 1712`).
- **template-81 index 2**: χρησιμοποιείται. Spline φτιάχνεται runtime και ταγκάρεται `_metadata = { color: 2 }` (`:1201`).

## Pending decisions

**template-98 (dead slot):** αφαίρεση 3ου χρώματος από τις 12 παλέτες + `variables.palette`, ή wiring σε υπαρκτό element.

**template-121 (bypass):** αντικατάσταση των 4 `stroke: '#ff0000'` σε `stroke: '__color[3]'`.

## Next step
Decision per template πριν την υλοποίηση.
