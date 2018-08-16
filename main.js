'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  const options = {
    width: 800,
    height: 480 + 200,
    minWidth: 800,
    minHeight: 480 + 200,
  };
  mainWindow = new BrowserWindow(options);
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
