
export function enableTVNavigation() {
  // Detect if running on TV or Capacitor Android TV app (or debugging with ?tv=true)
  const isTV = 
    /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
    navigator.userAgent.includes("MovieVerseTV") ||
    (window as any).Capacitor?.platform === 'android' ||
    window.location.search.includes("tv=true");

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
  const allOverlays = Array.from(document.querySelectorAll<HTMLElement>(
    'div.fixed, div.absolute, section.fixed, section.absolute, dialog, [role="dialog"]'
  ));
  const overlays = allOverlays.filter(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    
    // Exclude offscreen/translated elements (e.g. closed sidebar)
    if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    
    // Check if it's a modal container (generally z-index >= 90)
    const zIndex = parseInt(style.zIndex, 10);
    if (isNaN(zIndex) || zIndex < 90) return false;

    // Check if it actually contains focusable elements. If not, it is a decoration or loading overlay.
    const hasFocusables = el.querySelector('a, button, input, textarea, select, [tabindex="0"], .cursor-pointer') !== null;
    return hasFocusables;
  });

  if (overlays.length > 0) {
    // Return overlay with highest z-index. If z-indexes are equal, return the one later in the DOM
    overlays.sort((a, b) => {
      const zA = parseInt(getComputedStyle(a).zIndex, 10) || 0;
      const zB = parseInt(getComputedStyle(b).zIndex, 10) || 0;
      if (zA !== zB) {
        return zB - zA;
      }
      const idxA = allOverlays.indexOf(a);
      const idxB = allOverlays.indexOf(b);
      return idxB - idxA;
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
  let isFixed = false;

  while (parent) {
    const style = getComputedStyle(parent);
    if (style.position === 'fixed') {
      isFixed = true;
    }

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

    if (parent === document.body || parent === document.documentElement) {
      break;
    }
    parent = parent.parentElement;
  }

  // Only scroll the window/body if the element is not inside a fixed overlay container
  if (!isFixed) {
    const rect = element.getBoundingClientRect();
    const isInViewport = rect.top >= 50 && rect.bottom <= window.innerHeight - 50;
    if (!isInViewport) {
      const currentScrollTop = window.scrollY || window.pageYOffset || 0;
      const targetScrollTop = currentScrollTop + rect.top - (window.innerHeight / 2) + (rect.height / 2);
      window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
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
    /* Visual feedback for TV remote navigation - premium hover-like scaling, soft white border, and white glow shadow */
    .tv-navigation-enabled :focus {
      outline: none !important;
      border-color: rgba(255, 255, 255, 0.7) !important;
      box-shadow: 0 10px 30px rgba(255, 255, 255, 0.15), 0 0 15px rgba(255, 255, 255, 0.1) !important;
      transform: scale(1.05) !important;
      transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s, box-shadow 0.15s, background-color 0.15s !important;
      z-index: 9999 !important;
      position: relative !important;
    }
    
    /* Interactive elements get a soft white background highlight on focus if they are transparent */
    .tv-navigation-enabled button:focus:not(.bg-white),
    .tv-navigation-enabled a:focus:not(.bg-white),
    .tv-navigation-enabled .cursor-pointer:focus:not(.bg-white) {
      background-color: rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }
    
    /* Disable performance-heavy backdrop blur filters on TV to resolve lagging issues */
    .tv-navigation-enabled .backdrop-blur-md,
    .tv-navigation-enabled .backdrop-blur-lg,
    .tv-navigation-enabled .backdrop-blur-xl,
    .tv-navigation-enabled .backdrop-blur-2xl,
    .tv-navigation-enabled .backdrop-blur-3xl,
    .tv-navigation-enabled .glass,
    .tv-navigation-enabled .glass-panel {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      background-color: rgba(10, 10, 10, 0.98) !important;
    }
    
    /* Flatten nested scrollable containers inside fixed pages for TV D-pad navigation */
    .tv-navigation-enabled .max-h-\\[820px\\] {
      max-height: none !important;
      overflow: visible !important;
    }
    .tv-navigation-enabled .max-h-40 {
      max-height: none !important;
      overflow: visible !important;
    }
    .tv-navigation-enabled .custom-scrollbar {
      scrollbar-width: none !important;
    }
    .tv-navigation-enabled .custom-scrollbar::-webkit-scrollbar {
      display: none !important;
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
