
export function enableTVNavigation() {
  // Detect if running on TV or Capacitor Android TV app
  const isTV = 
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    (window as any).Capacitor?.platform === 'android';

  if (!isTV) return;

  console.log("MovieVerse AI: Spatial TV navigation enabled");

  // Add navigation helper classes and custom focus CSS
  document.body.classList.add("tv-navigation-enabled");
  injectTvStyles();

  // Initialize auto-tabindex mapping for interactive elements
  const observer = initAutoTabIndex();

  // Listen for D-pad navigation keys
  document.addEventListener("keydown", (e) => {
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Backspace", "Escape"];
    if (!keys.includes(e.key)) return;

    // Handle Android TV Back Button (Backspace / Escape)
    if (e.key === "Backspace" || e.key === "Escape") {
      const active = document.activeElement as HTMLElement;
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isTyping) {
        e.preventDefault();
        // Dispatch standard Escape key event to close active modals/sidebars
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escEvent);
        return;
      }
      return;
    }

    // Identify the active modal/view container to isolate navigation
    const activeContainer = getActiveContainer();

    // Query focusable elements within the active container
    const focusable = Array.from(
      activeContainer.querySelectorAll<HTMLElement>(
        'a, button, input, textarea, select, [tabindex="0"], .cursor-pointer'
      )
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    });

    const active = document.activeElement as HTMLElement;
    
    // If no element in the active container is focused, focus the first one
    if (!active || !activeContainer.contains(active) || active === document.body) {
      if (focusable.length > 0) {
        focusable[0].focus();
        smartScrollIntoView(focusable[0]);
      }
      return;
    }

    // Enter Key -> Click focused element
    if (e.key === "Enter") {
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isTyping) {
        e.preventDefault();
        active.click();
      }
      return;
    }

    // Spatial Navigation Algorithm
    e.preventDefault();
    const activeRect = active.getBoundingClientRect();
    const activeCenter = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2
    };

    let bestElement: HTMLElement | null = null;
    let minDistance = Infinity;

    focusable.forEach(el => {
      if (el === active) return;
      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - activeCenter.x;
      const dy = center.y - activeCenter.y;

      // Verify direction bounds
      let isCorrectDirection = false;
      if (e.key === "ArrowUp") isCorrectDirection = dy < -5;
      if (e.key === "ArrowDown") isCorrectDirection = dy > 5;
      if (e.key === "ArrowLeft") isCorrectDirection = dx < -5;
      if (e.key === "ArrowRight") isCorrectDirection = dx > 5;

      if (isCorrectDirection) {
        // Weight non-primary axes to prefer direct alignment
        const isVertical = e.key === "ArrowUp" || e.key === "ArrowDown";
        const weightX = isVertical ? 4 : 1;
        const weightY = isVertical ? 1 : 4;

        const distance = Math.sqrt(
          Math.pow(dx, 2) * weightX +
          Math.pow(dy, 2) * weightY
        );

        if (distance < minDistance) {
          minDistance = distance;
          bestElement = el;
        }
      }
    });

    if (bestElement) {
      (bestElement as HTMLElement).focus();
      smartScrollIntoView(bestElement);
    }
  });

  // Clean up observer if needed (though navigation lives for the page lifecycle)
  return () => {
    observer.disconnect();
  };
}

/**
 * Finds the top-most visible modal container or sidebar to trap focus.
 */
function getActiveContainer(): HTMLElement {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>(
    '.fixed, .absolute, [role="dialog"]'
  )).filter(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    
    // Exclude offscreen/translated elements (e.g. closed sidebar)
    if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    
    // Check if it's a modal container (generally z-index >= 90)
    const zIndex = parseInt(style.zIndex, 10);
    return !isNaN(zIndex) && zIndex >= 90;
  });

  if (overlays.length > 0) {
    // Return overlay with highest z-index
    overlays.sort((a, b) => {
      const zA = parseInt(getComputedStyle(a).zIndex, 10) || 0;
      const zB = parseInt(getComputedStyle(b).zIndex, 10) || 0;
      return zB - zA;
    });
    return overlays[0];
  }

  return document.body;
}

/**
 * Dynamically maps tabindex="0" to all interactive elements on render.
 */
function initAutoTabIndex(): MutationObserver {
  const assignTabIndex = (element: HTMLElement) => {
    const isInteractive = 
      element.tagName === 'A' ||
      element.tagName === 'BUTTON' ||
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.tagName === 'SELECT' ||
      element.classList.contains('cursor-pointer') ||
      element.hasAttribute('onClick') ||
      element.getAttribute('role') === 'button';

    if (isInteractive && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  };

  // Run on load
  document.querySelectorAll<HTMLElement>('*').forEach(assignTabIndex);

  // Monitor DOM modifications for dynamically loaded React nodes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          assignTabIndex(node);
          node.querySelectorAll<HTMLElement>('*').forEach(assignTabIndex);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

/**
 * Smoothly centers the focused element within its scrollable rows / viewports.
 */
function smartScrollIntoView(element: HTMLElement) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    const isScrollableX = parent.scrollWidth > parent.clientWidth && (style.overflowX === 'auto' || style.overflowX === 'scroll');
    const isScrollableY = parent.scrollHeight > parent.clientHeight && (style.overflowY === 'auto' || style.overflowY === 'scroll');

    if (isScrollableX || isScrollableY) {
      const parentRect = parent.getBoundingClientRect();
      const elRect = element.getBoundingClientRect();

      if (isScrollableX) {
        const targetScrollLeft = parent.scrollLeft + (elRect.left - parentRect.left) - (parentRect.width / 2) + (elRect.width / 2);
        parent.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }

      if (isScrollableY) {
        const targetScrollTop = parent.scrollTop + (elRect.top - parentRect.top) - (parentRect.height / 2) + (elRect.height / 2);
        parent.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
    parent = parent.parentElement;
  }

  // Double check viewport bounds and adjust main screen if necessary
  const rect = element.getBoundingClientRect();
  const isInViewport = rect.top >= 50 && rect.bottom <= window.innerHeight - 50;
  if (!isInViewport) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Injects premium focus ring and scale styles into the page head.
 */
function injectTvStyles() {
  const styleId = "tv-navigation-custom-styles";
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement("style");
  styleEl.id = styleId;
  styleEl.innerHTML = `
    /* Visual feedback for TV remote navigation */
    .tv-navigation-enabled :focus {
      outline: 4px solid #ef4444 !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 25px rgba(239, 68, 68, 0.8) !important;
      transform: scale(1.05) !important;
      transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), outline 0.15s, box-shadow 0.15s !important;
      z-index: 9999 !important;
      position: relative !important;
    }
    
    /* Ensure scrolling containers do not clip scaling elements */
    .tv-navigation-enabled .flex,
    .tv-navigation-enabled .grid {
      /* Remove boundary clipping so transform scale looks clean */
      /* overflow: visible; */
    }
  `;
  document.head.appendChild(styleEl);
}
