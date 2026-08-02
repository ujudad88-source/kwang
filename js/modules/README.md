# KENC UI module boundaries (Build 003.6.10)

This folder defines the ownership boundary for future JavaScript changes.

- drawing-engine: protected object geometry, attachment, coordinate and rotation logic
- drawing-ui: 2D editor controls only
- drawing-preview-3d: live 3D orbit/pan/zoom only
- drawing-bottom-workspace: bottom four-panel interactions only
- price-manager: price table and Firestore overrides only
- notice-manager: notice CRUD and realtime display only

Do not add global layout mutations from JavaScript. Layout is controlled only by the CSS modules under `assets/css/`.
