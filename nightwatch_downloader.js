(function() {
  var editButtons = document.querySelectorAll('.nw-table-column__col-actions a');
  var index = 0;
  var windows = [];

  function processReport() {
    if (index < editButtons.length) {
      var button = editButtons[index];
      var href = button.getAttribute('href');
      var reportUrl = new URL(href, location.origin).href; // handles relative URLs safely

      var newWindow = window.open(reportUrl, '_blank');
      windows.push(newWindow);

      newWindow.addEventListener('load', function() {
        // Wait for the Download button to appear
        var downloadButtonInterval = setInterval(function() {
          var downloadButton = findDownloadButton(newWindow.document);
          if (downloadButton) {
            clearInterval(downloadButtonInterval);
            downloadButton.click();
            index++;
            processReport();
          }
        }, 100); // Check for the download button every 100ms
      });
    } else {
      // All reports in the current view have been processed
      setTimeout(function() {
        closeAllWindows();
      }, 15000); // Delay of 15 seconds before closing the windows
    }
  }

  function findDownloadButton(document) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if (button.textContent.trim() === 'Download Report') {
        return button;
      }
    }
    return null;
  }

  function closeAllWindows() {
    windows.forEach(function(win) {
      try { win.close(); } catch (_) {}
    });
  }

  processReport();
})();
