
export function enableTVNavigation() {
  const isTV = /Android TV|GoogleTV|AFT|Tizen|Web0S|SmartTV/i.test(navigator.userAgent);
  if (!isTV) return;

  console.log("MovieVerse AI: Spatial TV navigation enabled");

  document.addEventListener("keydown", (e) => {
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
    if (!keys.includes(e.key)) return;

    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"]), .cursor-pointer'
      )
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
    });

    const active = document.activeElement as HTMLElement;
    if (!active || active === document.body) {
      if (focusable.length > 0) focusable[0].focus();
      return;
    }

    if (e.key === "Enter") {
      active.click();
      return;
    }

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

      // Check if element is in the correct direction
      let isCorrectDirection = false;
      if (e.key === "ArrowUp") isCorrectDirection = dy < -5;
      if (e.key === "ArrowDown") isCorrectDirection = dy > 5;
      if (e.key === "ArrowLeft") isCorrectDirection = dx < -5;
      if (e.key === "ArrowRight") isCorrectDirection = dx > 5;

      if (isCorrectDirection) {
        // Distance calculation weighted for the primary axis to prefer linear movements
        const distance = Math.sqrt(
          Math.pow(dx * (e.key === "ArrowUp" || e.key === "ArrowDown" ? 2 : 1), 2) +
          Math.pow(dy * (e.key === "ArrowLeft" || e.key === "ArrowRight" ? 2 : 1), 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          bestElement = el;
        }
      }
    });

    if (bestElement) {
      (bestElement as HTMLElement).focus();
      (bestElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  });
}
