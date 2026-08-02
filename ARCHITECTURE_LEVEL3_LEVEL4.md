# KENC Level 3 + Level 4 architecture — Build 004.0.0

## Level 3: page isolation
Each workspace has its own directory under `app/pages/` and a fixed DOM root.
New CSS must be rooted to that page. New JS must query within that page root.

## Level 4: component isolation inside Drawing
The Drawing workspace is divided by contract into palette, 2D canvas, object inspector,
3D preview, production notes/history, stack list, review center, and cabinet inspector.
Existing v82 engine remains in the legacy runtime snapshot to avoid functional regression.
All future changes should be added through the Drawing module extension points rather than
editing the legacy snapshot.

## Compatibility layer
`app/core/styles/legacy-*.css` and `app/core/scripts/legacy-*.js` are an immutable compatibility
snapshot extracted from the previously working single-file build. Their load order is preserved.
Do not edit these files for new features. Use page/component modules.

## Change policy
1. One change request maps to one page/component module.
2. No global selectors in new page CSS.
3. No DOM reparenting for layout patches.
4. Drawing engine geometry and attachment logic are protected.
5. Run `python app/tests/verify_architecture.py` before packaging.
