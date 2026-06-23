import { App } from '@capacitor/app';
import { init, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import React, { useEffect } from 'react';

let cleanupTvNavigation: (() => void) | null = null;
let noriginInitialized = false;

export function enableTVNavigation() {
  const checkTV = () => {
    return (
      /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent) || 
      navigator.userAgent.includes("MovieVerseTV") ||
      window.location.search.includes("tv=true")
    );
  };

  // If already enabled, do not re-enable
  if (document.body.classList.contains("tv-navigation-enabled")) {
    return;
  }

  if (!checkTV()) {
    // Retry in case Capacitor is loading asynchronously
    const retryInterval = setInterval(() => {
      if (checkTV()) {
        clearInterval(retryInterval);
        cleanupTvNavigation = enableTVNavigationActual();
      }
    }, 100);
    // Timeout after 3 seconds to avoid infinite polling if not on TV
    setTimeout(() => clearInterval(retryInterval), 3000);
    return;
  }

  cleanupTvNavigation = enableTVNavigationActual();
}

function enableTVNavigationActual() {
  console.log("MovieVerse AI: Norigin Spatial TV navigation enabled");

  // Initialize Norigin Spatial Navigation library
  if (!noriginInitialized) {
    init({
      debug: false,
      visualDebug: false,
    });
    noriginInitialized = true;
  }

  // Add navigation helper classes and custom focus CSS
  document.body.classList.add("tv-navigation-enabled");
  injectTvStyles();

  // Register native Android TV back button listener using Capacitor
  let backButtonListener: any = null;
  if ((window as any).Capacitor) {
    try {
      backButtonListener = App.addListener('backButton', () => {
        console.log("MovieVerse TV: Native back button event intercepted");

        // 1. First priority: Close video player if active
        const playerCloseBtn = document.getElementById('tv-player-close-btn');
        if (playerCloseBtn) {
          console.log("MovieVerse TV: Programmatically closing media player");
          playerCloseBtn.click();
          return;
        }

        // 2. Second priority: Close any active modal / overlay
        const activeContainer = getActiveContainer();
        if (activeContainer && activeContainer !== document.body) {
          console.log("MovieVerse TV: Programmatically closing active container modal");
          const closeBtn = activeContainer.querySelector('[data-modal-close="true"]') || activeContainer.querySelector('button');
          if (closeBtn) {
            (closeBtn as HTMLElement).click();
          } else {
            // Fallback Escape dispatch
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(escEvent);
          }
          return;
        }

        // 3. Third priority: Exit application if on homepage
        console.log("MovieVerse TV: No active overlays. Exiting application.");
        App.exitApp();
      });
    } catch (err) {
      console.warn("MovieVerse TV: Capacitor App plugin failed to initialize listener", err);
    }
  }

  // Listen for BACK keys (Backspace / Escape) to close modals/sidebars
  const backKeyListener = (e: KeyboardEvent) => {
    if (e.key === "Backspace" || e.key === "Escape") {
      const active = document.activeElement as HTMLElement;
      const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!isTyping) {
        e.preventDefault();
        // Dispatch standard Escape key event to close active modals/sidebars
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escEvent);
      }
    }
  };

  document.addEventListener("keydown", backKeyListener);

  // Clean up listeners
  return () => {
    document.removeEventListener("keydown", backKeyListener);
    if (backButtonListener) {
      backButtonListener.remove();
    }
  };
}

/**
 * Custom React hook wrapping useFocusable from Norigin Spatial Navigation.
 * Automatically triggers smartScrollIntoView and toggles tv-focused class list and input focus.
 */
export function useTvFocus(config?: any) {
  const isTvMode = typeof document !== 'undefined' && document.body.classList.contains("tv-navigation-enabled");

  const { ref, focused, focusSelf, ...rest } = useFocusable({
    ...config,
    focusable: isTvMode && (config?.focusable !== false),
    onFocus: (layout, props) => {
      if (isTvMode && ref.current) {
        smartScrollIntoView(ref.current);
      }
      if (config?.onFocus) {
        config.onFocus(layout, props);
      }
    }
  });

  // Manage tv-focused class and native focus for input elements without forcing repeatedly
  useEffect(() => {
    if (!isTvMode || !ref.current) return;
    if (focused) {
      ref.current.classList.add('tv-focused');
      if (ref.current.tagName === 'INPUT') {
        ref.current.focus();
      }
    } else {
      ref.current.classList.remove('tv-focused');
    }
  }, [focused, isTvMode]);

  return { ref, focused, focusSelf, ...rest };
}

export function TvFocusButton({ children, onClick, className, ...props }: any) {
  const { ref } = useTvFocus({
    onEnterPress: onClick
  });
  return React.createElement('button', { ref, onClick, className, ...props }, children);
}

export const TvFocusInput = React.forwardRef((props: any, ref: any) => {
  const { ref: focusRef } = useTvFocus({
    onEnterPress: () => {
      if (props.onSubmit) {
        props.onSubmit();
      }
    }
  });

  const combinedRef = (node: any) => {
    focusRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const inputProps = { ...props, ref: combinedRef };
  delete inputProps.onSubmit;

  return React.createElement('input', inputProps);
});

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
 * Optimized row-based and viewport-relative scrolling helper.
 * Uses fast layout offset lookups and edge detection (only scrolls near boundaries).
 */
export function smartScrollIntoView(element: HTMLElement) {
  let parent = element.parentElement;
  let depth = 0;
  
  while (parent && depth < 4) {
    const isScrollContainer = 
      parent.classList.contains('overflow-x-auto') || 
      parent.classList.contains('overflow-y-auto') || 
      parent.classList.contains('hide-scrollbar') ||
      parent.tagName === 'MAIN' ||
      parent.id === 'root';

    if (isScrollContainer) {
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      
      const elLeft = element.offsetLeft;
      const elWidth = element.offsetWidth;
      const parentScrollLeft = parent.scrollLeft;
      
      // Horizontal scrolling with 120px edge-detection padding
      const paddingX = 120;
      if (elLeft < parentScrollLeft + paddingX) {
        parent.scrollTo({ left: Math.max(0, elLeft - paddingX), behavior: 'auto' });
      } else if ((elLeft + elWidth) > (parentScrollLeft + parentWidth - paddingX)) {
        parent.scrollTo({ left: elLeft + elWidth - parentWidth + paddingX, behavior: 'auto' });
      }

      // Vertical scrolling with 80px edge-detection padding
      const paddingY = 80;
      const elTop = element.offsetTop;
      const elHeight = element.offsetHeight;
      const parentScrollTop = parent.scrollTop;
      
      if (elTop < parentScrollTop + paddingY) {
        parent.scrollTo({ top: Math.max(0, elTop - paddingY), behavior: 'auto' });
      } else if ((elTop + elHeight) > (parentScrollTop + parentHeight - paddingY)) {
        parent.scrollTo({ top: elTop + elHeight - parentHeight + paddingY, behavior: 'auto' });
      }
      break;
    }
    
    parent = parent.parentElement;
    depth++;
  }

  // Scroll window if the element is out of the screen's vertical viewport bounds
  const elRect = element.getBoundingClientRect();
  const isInViewport = elRect.top >= 80 && elRect.bottom <= window.innerHeight - 80;
  if (!isInViewport) {
    const currentScrollTop = window.scrollY || window.pageYOffset || 0;
    const targetScrollTop = currentScrollTop + elRect.top - (window.innerHeight / 2) + (elRect.height / 2);
    window.scrollTo({ top: targetScrollTop, behavior: 'auto' });
  }
}

/**
 * Injects high-performance focus outlines, containment rules, and specific disables.
 */
function injectTvStyles() {
  const styleId = "tv-navigation-custom-styles";
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement("style");
  styleEl.id = styleId;
  styleEl.innerHTML = `
    /* Disable transitions only on interactive elements to prevent lag */
    .tv-navigation-enabled .tv-focused,
    .tv-navigation-enabled button,
    .tv-navigation-enabled a,
    .tv-navigation-enabled input,
    .tv-navigation-enabled [role="button"],
    .tv-navigation-enabled .movie-card {
      transition: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
    }

    /* CSS Containment and hardware acceleration for cards and focused items */
    .tv-navigation-enabled .movie-card,
    .tv-navigation-enabled .tv-focused {
      contain: layout paint !important;
      will-change: transform !important;
    }

    /* Snappy TV remote focus style using tv-focused class with subtle scale */
    .tv-navigation-enabled .tv-focused {
      outline: 3.5px solid #ffffff !important;
      outline-offset: 2.5px !important;
      transform: scale(1.02) !important;
      box-shadow: none !important;
      z-index: 9999 !important;
    }
    
    /* Disable performance-heavy box-shadows, text-shadows, and filters globally on TV */
    .tv-navigation-enabled *,
    .tv-navigation-enabled .shadow-2xl,
    .tv-navigation-enabled .shadow-xl,
    .tv-navigation-enabled .shadow-lg,
    .tv-navigation-enabled .shadow-md,
    .tv-navigation-enabled .shadow {
      box-shadow: none !important;
      text-shadow: none !important;
      filter: none !important;
    }
    
    /* Focused interactive items get a soft translucent background */
    .tv-navigation-enabled button.tv-focused:not(.bg-white),
    .tv-navigation-enabled a.tv-focused:not(.bg-white),
    .tv-navigation-enabled .cursor-pointer.tv-focused:not(.bg-white) {
      background-color: rgba(255, 255, 255, 0.18) !important;
      color: #ffffff !important;
    }
    
    /* Disable performance-heavy backdrop blur filters on TV */
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
    
    /* Hide player close button on TV as we use physical Back button instead */
    .tv-navigation-enabled #tv-player-close-btn {
      display: none !important;
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
  `;
  document.head.appendChild(styleEl);
}
