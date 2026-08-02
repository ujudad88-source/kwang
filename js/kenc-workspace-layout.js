/* KENC Drawing Workspace component assembler — Build 003.6.7 */
(() => {
  'use strict';

  function assembleBottomWorkspace() {
    const drawingPanel = document.getElementById('drawingPanel');
    if (!drawingPanel) return;

    const workspace = drawingPanel.querySelector('.drawing-pro-workspace');
    const bottomGrid = workspace?.querySelector('.stack-section');
    const notesDock = workspace?.querySelector('.drawing-bottom-dock');
    if (!workspace || !bottomGrid || !notesDock) return;

    bottomGrid.classList.add('kenc-bottom-workspace');

    const stackList = Array.from(bottomGrid.children).find((node) =>
      node.querySelector?.('#stackList')
    );
    const review = bottomGrid.querySelector('.drawing-review-workbench');
    const properties = bottomGrid.querySelector('.stack-properties');

    stackList?.classList.add('kenc-stack-list-component');
    review?.classList.add('kenc-review-component');
    properties?.classList.add('kenc-properties-component');

    // Move the complete notes/history/check/output component into the first grid area.
    // Moving the existing node preserves every event listener, ID and data binding.
    if (notesDock.parentElement !== bottomGrid) {
      bottomGrid.insertBefore(notesDock, bottomGrid.firstElementChild);
    }

    // Enforce deterministic component order independent of legacy markup/CSS.
    [notesDock, stackList, review, properties].forEach((component) => {
      if (component && component.parentElement === bottomGrid) bottomGrid.appendChild(component);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', assembleBottomWorkspace, { once: true });
  } else {
    assembleBottomWorkspace();
  }

  // The drawing panel may be initialized after authentication; reassemble safely.
  window.addEventListener('hashchange', assembleBottomWorkspace);
  window.addEventListener('load', assembleBottomWorkspace, { once: true });
})();
