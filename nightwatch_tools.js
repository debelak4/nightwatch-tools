// Nightwatch bulk report downloader
// Hosted on GitHub Pages
// Updated: 2026-02-04

(function () {
  'use strict';

  alert("Nightwatch tools loaded, starting SERP Downloads - updated 2026-02-04");

  // --- CONFIG ---
  const OPEN_DELAY_MS = 1400;        // delay between opening each report tab
  const TRY_INTERVAL_MS = 700;       // how often to look for the download button
  const MAX_TRIES = 30;              // ~21 seconds total (30 * 700ms)
  const CLOSE_AFTER_CLICK_MS = 1600; // wait after clicking "Download Report" before closing

  // Helper: find clickable link for each report row.
  // Most UIs wrap the edit icon in an <a href="..."> to the report editor.
  function getReportEditLinks() {
    const icons = Array.from(document.querySelectorAll('.nw-icon'));
    const links = icons
      .map(icon => icon.closest('a'))
      .filter(a => a && a.href);

    // De-dupe by href
    const seen = new Set();
    return links.filter(a => (seen.has(a.href) ? false : (seen.add(a.href), true)));
  }

  // Helper: click "Download Report" button in the new window
  function waitForAndClickDownload(newWindow, href) {
    let tries = 0;

    const timer = setInterval(() => {
      tries += 1;

      try {
        // Look for a button with text "Download Report"
        const buttons = Array.from(newWindow.document.querySelectorAll('button, a, .nw-btn'));
        const downloadBtn = buttons.find(el => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return txt === 'download report' || txt.includes('download report');
        });

        if (downloadBtn) {
          downloadBtn.click();
          clearInterval(timer);

          setTimeout(() => {
            try { newWindow.close(); } catch (_) {}
          }, CLOSE_AFTER_CLICK_MS);

          return;
        }
      } catch (e) {
        // This can throw while the page is still loading; just keep trying.
      }

      if (tries >= MAX_TRIES) {
        clearInterval(timer);
        try { newWindow.close(); } catch (_) {}
        console.warn('Timed out waiting for Download Report on:', href);
      }
    }, TRY_INTERVAL_MS);
  }

  function run() {
    // Make sure we're on the reports page
    if (!location.hostname.includes('nightwatch.io')) {
      alert('This tool only runs on Nightwatch.');
      return;
    }

    const editLinks = getReportEditLinks();

    if (!editLinks.length) {
      alert("I couldn't find any report edit links (.nw-icon). Nightwatch UI may have changed.");
      return;
    }

    // Important: open tabs with spacing to reduce Chrome throttling
    editLinks.forEach((a, i) => {
      setTimeout(() => {
        const href = a.href;

        const w = window.open(href, '_blank');
        if (!w) {
          alert("Pop-up blocked. Please allow pop-ups for app.nightwatch.io and try again.");
          return;
        }

        // Wait for the new tab to load, then try clicking Download Report
        // We use polling instead of a load event because modern apps are dynamic.
        waitForAndClickDownload(w, href);
      }, i * OPEN_DELAY_MS);
    });
  }

  run();
})();
