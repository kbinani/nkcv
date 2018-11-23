'use strict;'

class MainWindow {
  constructor() {
    this.webview = document.querySelector("webview");
    this.language = "ja";
    i18n.configure({
      locales: ['ja', 'en'],
      directory: __dirname +'/locales',
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

    $('[data-i18n]').each((_, element) => {
      const $element = $(element);
      const key = $element.attr('data-i18n');
      const translated = i18n.__(key);

      const attribute = $element.attr('data-i18n-attribute');
      if (attribute) {
        $element.attr(attribute, translated);
      } else {
        $element.html(translated);
      }
    });
  }

  onLanguageSelected() {
    const language = $('#language').val();
    ipcRenderer.send('app.requestLanguageChange', language);
  }
}

module.exports = MainWindow;
