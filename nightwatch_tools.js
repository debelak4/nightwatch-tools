//https://cmc.harbenmarketing.com/moz/nightwatch_tools.js


alert("Nightwatch tools loaded, starting SERP Downloads - updated 6-8-2023");


downloadKeywordSERPReports();

function openEditIconsAndDownloadReports() {
  const editIcons = document.querySelectorAll('.nw-icon');

  editIcons.forEach((editIcon) => {
    editIcon.addEventListener('click', (event) => {
      event.preventDefault(); // Prevents the default click behavior

      const editLink = editIcon.parentNode.href;
      const newWindow = window.open(editLink, '_blank');
      newWindow.focus();

      newWindow.addEventListener('load', () => {
        const downloadButton = newWindow.document.querySelector('.ember-view.nw-btn.nw-btn--primary');
        if (downloadButton) {
          downloadButton.click();
        }
      });
    });
  });
}

openEditIconsAndDownloadReports();
