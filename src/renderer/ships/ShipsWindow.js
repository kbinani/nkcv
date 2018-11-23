'use strict;'

const i18n = require('i18n');

class ShipsWindow {
  constructor() {
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
      this.setLanguage(language);
    });
  }

  setLanguage(language) {
    this.language = language;
    i18n.setLocale(language);

    applyLanguageToView(language);
  }
}

module.exports = ShipsWindow;
