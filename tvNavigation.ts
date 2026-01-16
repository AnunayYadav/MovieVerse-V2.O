
export function enableTVNavigation() {
  const isTV = /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent);
  if (!isTV) return;

  console.log("MovieVerse AI: TV navigation enabled");

  document.addEventListener("keydown", (e) => {
    // Get all elements that are potentially focusable and currently visible
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"]), .cursor-pointer'
      )
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none';
    });

    if (!focusable.length) return;

    const currentIdx = focusable.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (currentIdx + 1) % focusable.length;
      focusable[nextIdx].focus();
      focusable[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (currentIdx - 1 + focusable.length) % focusable.length;
      focusable[prevIdx].focus();
      focusable[prevIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (e.key === "Enter") {
      // Small delay to ensure visual feedback on some TV browsers
      const target = document.activeElement as HTMLElement;
      if (target) {
        e.preventDefault();
        target.click();
      }
    }
  });
}
