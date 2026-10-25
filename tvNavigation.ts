import React, { useRef } from 'react';

/**
 * Standard web UI helpers (formerly TV navigation stubs).
 * Keeps compatibility with existing component imports while running cleanly as pure web.
 */

export function enableTVNavigation() {
  // Legacy TV navigation removed for web
}

export function useTvFocus(config?: any) {
  const ref = useRef<any>(null);
  return {
    ref,
    focused: false,
    focusSelf: () => ref.current?.focus?.(),
    ...config
  };
}

export const TvFocusButton = ({
  children,
  onClick,
  className,
  ...props
}: any) => {
  return React.createElement('button', { onClick, className, ...props }, children);
};

export const TvFocusInput = React.forwardRef((props: any, ref: any) => {
  return React.createElement('input', { ...props, ref });
});

export function smartScrollIntoView(element: HTMLElement) {
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
