'use strict;'

const shared = require(__dirname + '/../../../shared.js'),
      i18n = require(__dirname + '/../../i18n.js');

class MainWindow {
  constructor() {
    this.webview = document.querySelector("webview");
    this.language = "ja";
    this.configData = {};
    i18n.setLocale(this.language);

    this.subscribe();
    ipcRenderer.send('app.mainWindowDidLoad', {});
  }

  subscribe() {
    ipcRenderer.on('app.languageDidChanged', (event, data) => {
      const language = data;
      $('#language').val(language);
      this.setLanguage(language);
    });

    ipcRenderer.on('app.configDidPatched', (event, data) => {
      const encodeCapturedVideo = _.get(data, ['encodeCapturedVideo'], false);
      const checkbox = document.querySelector('#option_capture_encode_video');
      if (checkbox) {
        checkbox.checked = encodeCapturedVideo;
      }

      this.configData = data;
    });
  }

  setLanguage(language) {
    this.language = language;
    i18n.setLocale(language);

    shared.applyLanguageToView(language);
  }

  onLanguageSelected() {
    const language = $('#language').val();
    ipcRenderer.send('app.requestLanguageChange', language);
  }

  onEncodeVideoChanged() {
    const checkbox = document.querySelector('#option_capture_encode_video');
    if (!checkbox) {
      return;
    }
    ipcRenderer.send('app.patchConfig', {'encodeCapturedVideo': checkbox.checked});
  }
}

module.exports = MainWindow;
