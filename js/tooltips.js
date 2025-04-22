/* ===================================================================*/
/* ======================== ... TOOLTIP ==============================*/
/* ===================================================================*/

// 1) single active tooltip reference
let activeTooltip = null;

// 2) clear any old tooltip/timer, then show after delay
function tooltipMouseEnter(e) {
  const el = e.currentTarget;
  if (el.scrollWidth <= el.clientWidth) return;  // only truncated

  clearTimeout(el._tooltipTimer);
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }

  el._tooltipTimer = setTimeout(() => {
    const tip = document.createElement('div');
    tip.classList.add('text-tooltip');
    tip.textContent = el.textContent;
    document.body.appendChild(tip);

    const rect = el.getBoundingClientRect();
    tip.style.left = `${rect.left}px`;
    tip.style.top  = `${rect.bottom + 5}px`;

    activeTooltip = tip;
  }, 750);
}

// 3) wipe timer + tooltip
function tooltipMouseLeave(e) {
  const el = e.currentTarget;
  clearTimeout(el._tooltipTimer);
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

// 4) helper to bind events onto a NodeList
function attachTooltipHandlers(nodes) {
  nodes.forEach(el => {
    el.removeEventListener('mouseenter', tooltipMouseEnter);
    el.removeEventListener('mouseleave', tooltipMouseLeave);
    el.addEventListener('mouseenter', tooltipMouseEnter);
    el.addEventListener('mouseleave', tooltipMouseLeave);
  });
}

// 5) global “safety net”
['scroll','resize','blur'].forEach(evt =>
  window.addEventListener(evt, () => {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  })
);

// 6) public API: find your targets and bind handlers
export function attachDynamicTooltips() {
  const targets = document.querySelectorAll(
    '.block-title h4, .action-name, .action-description'
  );
  attachTooltipHandlers(targets);
}