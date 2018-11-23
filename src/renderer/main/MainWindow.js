'use strict;'

class MainWindow {
  constructor() {
    this.webview = document.querySelector("webview");
    this.language = "ja";
    i18n.configure({
      locales: ['ja', 'en'],
      directory: __dirname +'/../../../locales',
    });
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

    applyLanguageToView(language);
  }

  onLanguageSelected() {
    const language = $('#language').val();
    ipcRenderer.send('app.requestLanguageChange', language);
  }
}

module.exports = MainWindow;
