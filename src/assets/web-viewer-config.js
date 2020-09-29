// config.js executed inside the iframe

// After Viewer Loaded but not yet rendered
window.addEventListener('viewerLoaded', () => {
  // disabling these Elements here looks better, as the Elements are hidden, before they are rendered.
  // otherwise the Elements would show for a short amount of time.
  readerControl.disableElements([
    'header',
    'toolsHeader',
    'leftPanel',
    'leftPanelButton',
    'selectToolButton',
    'ribbons',
    'menuButton',
    'toggleNotesButton',
    'searchButton',
    'moreButton',
    'rightPanel',
    'contextMenuPopup',
    'panToolButton',
    'stickyToolButton',
    'annotationPopup',
    'textPopup',
    'pageNavOverlay',
    // 'searchPanel',
    // 'searchOverlay',
  ]);
  // readerControl.disableFeatures(['Measurement', 'Download', 'FilePicker', 'LocalStorage', 'Print', 'NotesPanel']);
  readerControl.hotkeys.off();
  // enables usage of print features of the used web browser.
  // readerControl.useEmbeddedPrint(true);
});

document.addEventListener(
  'contextmenu',
  (event) => {
    event.preventDefault();

    return false;
  },
  false
);
