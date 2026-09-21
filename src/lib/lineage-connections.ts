const svgNamespace = 'http://www.w3.org/2000/svg';

type ConnectionOptions = {
  rowSelector: string;
  branchSelector: string;
};

export function drawLineageConnections(root: HTMLElement, options: ConnectionOptions) {
  root.querySelector<SVGSVGElement>(':scope > .lineage-connection-layer')?.remove();
  const rows = Array.from(root.querySelectorAll<HTMLElement>(options.rowSelector));
  if (rows.length < 2) return;

  const layer = document.createElementNS(svgNamespace, 'svg');
  layer.classList.add('lineage-connection-layer');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('preserveAspectRatio', 'none');
  root.append(layer);

  const redraw = () => {
    const nextRootRect = root.getBoundingClientRect();
    layer.setAttribute('width', String(nextRootRect.width));
    layer.setAttribute('height', String(nextRootRect.height));
    layer.setAttribute('viewBox', `0 0 ${nextRootRect.width} ${nextRootRect.height}`);
    layer.replaceChildren();

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0) return;
      const previousRow = rows[rowIndex - 1];
      const previousBranches = Array.from(previousRow.querySelectorAll<HTMLElement>(options.branchSelector));
      const currentBranches = Array.from(row.querySelectorAll<HTMLElement>(options.branchSelector));

      const childrenByParent = new Map<string, HTMLElement[]>();
      currentBranches.forEach((currentBranch) => {
        const parentIds = (currentBranch.dataset.parentBranchIds ?? '').split(',').filter(Boolean);
        parentIds.forEach((parentId) => {
          const children = childrenByParent.get(parentId) ?? [];
          children.push(currentBranch);
          childrenByParent.set(parentId, children);
        });
      });

      childrenByParent.forEach((children, parentId) => {
        const parentBranch = previousBranches.find((candidate) => candidate.dataset.branchId === parentId);
        if (!parentBranch || !children.length) return;
        const parentRect = parentBranch.getBoundingClientRect();
        const childRects = children.map((child) => child.getBoundingClientRect());
        const startX = parentRect.left - nextRootRect.left + parentRect.width / 2;
        const startY = parentRect.bottom - nextRootRect.top;
        const childCenters = childRects.map((rect) => rect.left - nextRootRect.left + rect.width / 2);
        const childTop = Math.min(...childRects.map((rect) => rect.top - nextRootRect.top));
        const junctionY = startY + (childTop - startY) / 2;
        const path = document.createElementNS(svgNamespace, 'path');
        path.classList.add('lineage-connection');
        if (children.length === 1) {
          path.setAttribute('d', `M ${startX} ${startY} V ${junctionY} H ${childCenters[0]} V ${childTop}`);
        } else {
          const minX = Math.min(...childCenters);
          const maxX = Math.max(...childCenters);
          const drops = childCenters.map((center, index) => `M ${center} ${junctionY} V ${childRects[index].top - nextRootRect.top}`).join(' ');
          path.setAttribute('d', `M ${startX} ${startY} V ${junctionY} M ${minX} ${junctionY} H ${maxX} ${drops}`);
        }
        layer.append(path);
      });
    });
  };

  requestAnimationFrame(redraw);
  window.addEventListener('resize', redraw, { passive: true });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(redraw);
    observer.observe(root);
  }
}
