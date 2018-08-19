'use strict';

const electron = require('electron'),
      find_free_port = require('find-free-port'),
      HTTPProxy = require(__dirname + '/src/HTTPProxy.js');
const {app, BrowserWindow, session} = require('electron');

var mainWindow = null;

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  find_free_port(8000, function(err, port) {
    HTTPProxy.launch(port);

    const ses = session.fromPartition('persist:electron-study');
    const proxyOptions = {
      proxyRules: 'http=localhost:' + port + ',direct://',
    };
    ses.setProxy(proxyOptions, function() {
    });
  });

  const options = {
    width: 1200,
    height: 720 + 200,
    minWidth: 1200,
    minHeight: 720 + 200,
  };
  mainWindow = new BrowserWindow(options);
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
