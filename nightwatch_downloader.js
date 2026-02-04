(function () {
  'use strict';

  // ---------- SETTINGS ----------
  const CAPTURE_PAUSE_MS = 700;      // wait after each scroll to let new rows render
  const MAX_CAPTURE_LOOPS = 160;     // safety limit (increase if you have tons of reports)
  const SCROLL_STEP_PX = 900;

  const OPEN_DELAY_MS = 900;         // delay between opening report tabs
  const FIND_BTN_POLL_MS = 150;      // polling for Download button
  const FIND_BTN_MAX_POLLS = 220;    // ~33s max per tab
  const CLOSE_ALL_AFTER_MS = 15000;  // after finishing, close any leftover tabs

  // ---------- HELPERS ----------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function getActionHrefs() {
    const anchors = Array.from(document.querySelectorAll('.nw-table-column__col-actions a'));
    return anchors
      .map(a => a.getAttribute('href'))
      .filter(Boolean)
      .map(href => new URL(href, location.origin).href);
  }

  function isScrollable(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    const overflowY = style.overflowY;
    return (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10;
  }

  // Try to find the scroll container that actually moves the list
  function findScrollContainer() {
    // Common candidates: main, body wrapper, or a table/list wrapper
    const candidates = [
      document.querySelector('main'),
      document.querySelector('[class*="table"]'),
      document.querySelector('[class*="Table"]'),
      document.querySelector('[class*="list"]'),
      document.querySelector('[class*="List"]'),
      document.querySelector('[class*="content"]'),
      document.querySelector('[class*="Content"]'),
      document.scrollingElement
    ].filter(Boolean);

    // Prefer a scrollable ancestor of the actions column if possible
    const firstAction = document.querySelector('.nw-table-column__col-actions');
    if (firstAction) {
      let p = firstAction.parentElement;
      while (p && p !== document.body) {
        if (isScrollable(p)) return p;
        p = p.parentElement;
      }
    }

    // Otherwise pick the first truly scrollable candidate
    for (const el of candidates) {
      if (isScrollable(el)) return el;
    }

    // Fallback: window
    return null;
  }

  function findDownloadButton(doc) {
    // Button text match is most stable across CSS changes
    const buttons = Array.from(doc.querySelectorAll('button'));
    return buttons.find(b => (b.textContent || '').trim().toLowerCase().includes('download report')) || null;
  }

  async function captureAllReportUrls() {
    const scrollEl = findScrollContainer();
    const urls = new Set();

    let lastSize = 0;
    let noGrowthStreak = 0;

    for (let i = 0; i < MAX_CAPTURE_LOOPS; i++) {
      // capture whatever is currently rendered
      for (const u of getActionHrefs()) urls.add(u);

      // if we didn't add anything new for a few iterations, we're probably done
      if (urls.size === lastSize) noGrowthStreak++;
      else noGrowthStreak = 0;

      lastSize = urls.size;
      if (noGrowthStreak >= 8) break;

      // scroll the correct container
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollTop + SCROLL_STEP_PX;
      } else {
        window.scrollBy(0, SCROLL_STEP_PX);
      }

      await sleep(CAPTURE_PAUSE_MS);
    }

    // return to top (optional)
    if (scrollEl) scrollEl.scrollTop = 0;
    else window.scrollTo(0, 0);

    await sleep(300);
    return Array.from(urls);
  }

  function downloadAll(urls) {
    let idx = 0;
    const wins = [];

    function next() {
      if (idx >= urls.length) {
        setTimeout(() => wins.forEach(w => { try { w.close(); } catch (_) {} }), CLOSE_ALL_AFTER_MS);
        alert(`Done: attempted ${urls.length} reports.`);
        return;
      }

      const url = urls[idx];
      const w = window.open(url, '_blank');
      if (!w) {
        alert("Popups were blocked/throttled. Try increasing OPEN_DELAY_MS and ensure popups are allowed for app.nightwatch.io.");
        return;
      }
      wins.push(w);

      let polls = 0;
      const t = setInterval(() => {
        polls++;
        try {
          const btn = findDownloadButton(w.document);
          if (btn) {
            clearInterval(t);
            btn.click();
            idx++;
            setTimeout(next, OPEN_DELAY_MS);
          }
        } catch (e) {
          // ignore while loading
        }

        if (polls >= FIND_BTN_MAX_POLLS) {
          clearInterval(t);
          try { w.close(); } catch (_) {}
          console.warn('Timed out waiting for Download Report:', url);
          idx++;
          setTimeout(next, OPEN_DELAY_MS);
        }
      }, FIND_BTN_POLL_MS);
    }

    next();
  }

  (async function main() {
    alert("Nightwatch downloader: scrolling to collect ALL report links (virtualized list safe)…");
    const urls = await captureAllReportUrls();
    alert(`Captured ${urls.length} report links. Starting downloads…`);
    downloadAll(urls);
  })();

})();
