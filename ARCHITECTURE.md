# KENC UI 2.0 — isolated layout architecture

## Baseline
Build 003.6.9 is the functional baseline. Build 003.6.10 separates layout ownership without altering drawing objects or engine logic.

## CSS ownership
- `kenc-shell-layout.css`: browser width, page and main panels
- `drawing-workspace-layout.css`: upper drawing workspace only
- `drawing-bottom-workspace.css`: lower four panels only
- `drawing-responsive.css`: tablet/mobile layout transitions only

## Protected areas
Do not change object shapes, attachment behavior, coordinates, rotation, 2D/3D engine data, Firebase auth, or Firestore structures when editing layout.

## Rule
A feature patch may change only its owning module. No JavaScript DOM re-parenting is allowed for layout.
