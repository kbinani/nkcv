'use strict;'

const shared = require(__dirname + '/../../../shared.js'),
      i18n = require(__dirname + '/../../i18n.js');

class MainWindow {
  constructor() {
    this.webview = document.querySelector("webview");
    this.language = "ja";
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
}

module.exports = MainWindow;
