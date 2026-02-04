(function () {
  'use strict';

  // ---- SETTINGS ----
  const SCROLL_STEP_PX = 900;
  const SCROLL_PAUSE_MS = 700;
  const MAX_SCROLL_LOOPS = 80; // safety limit
  const OPEN_DELAY_MS = 900;   // delay between opening report tabs

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getActionLinks() {
    // Your working selector
    const links = Array.from(document.querySelectorAll('.nw-table-column__col-actions a'))
      .map(a => a.getAttribute('href'))
      .filter(Boolean);

    // De-dupe, and convert relative to absolute
    const uniq = [];
    const seen = new Set();
    for (const href of links) {
      const abs = new URL(href, location.origin).href;
      if (!seen.has(abs)) { seen.add(abs); uniq.push(abs); }
    }
    return uniq;
  }

  async function loadAllRowsByScrolling() {
    let lastCount = 0;
    let sameCountStreak = 0;

    for (let i = 0; i < MAX_SCROLL_LOOPS; i++) {
      window.scrollBy(0, SCROLL_STEP_PX);
      await sleep(SCROLL_PAUSE_MS);

      const count = getActionLinks().length;

      // If count stops increasing for a few loops, assume we're done
      if (count === lastCount) {
        sameCountStreak++;
      } else {
        sameCountStreak = 0;
        lastCount = count;
      }

      if (sameCountStreak >= 5) break;
    }

    // Return to top so popups don’t get weird with off-screen focus
    window.scrollTo(0, 0);
    await sleep(400);

    return getActionLinks();
  }

  function findDownloadButton(doc) {
    const buttons = Array.from(doc.querySelectorAll('button'));
    return buttons.find(b => (b.textContent || '').trim() === 'Download Report') || null;
  }

  function runDownloads(urls) {
    let index = 0;
    const windows = [];

    function processNext() {
      if (index >= urls.length) {
        setTimeout(() => windows.forEach(w => { try { w.close(); } catch (_) {} }), 15000);
        return;
      }

      const reportUrl = urls[index];
      const w = window.open(reportUrl, '_blank');
      if (!w) {
        alert("Popups throttled/blocked. Try increasing OPEN_DELAY_MS or allow popups for app.nightwatch.io.");
        return;
      }
      windows.push(w);

      // Poll for button because Nightwatch is dynamic
      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        try {
          const btn = findDownloadButton(w.document);
          if (btn) {
            clearInterval(timer);
            btn.click();
            index++;
            setTimeout(processNext, OPEN_DELAY_MS);
          }
        } catch (e) {
          // ignore until the document is ready
        }
        if (tries > 300) { // ~30s
          clearInterval(timer);
          try { w.close(); } catch (_) {}
          index++;
          setTimeout(processNext, OPEN_DELAY_MS);
        }
      }, 100);
    }

    processNext();
  }

  (async function main() {
    alert("Nightwatch downloader: loading all reports, then downloading…");
    const urls = await loadAllRowsByScrolling();
    alert(`Found ${urls.length} reports. Starting downloads…`);
    runDownloads(urls);
  })();

})();
