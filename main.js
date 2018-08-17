'use strict';

const electron = require('electron'),
      http = require('http'),
      url = require('url'),
      net = require('net');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

const HTTP_PORT = 8080;

var mainWindow = null;

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  const {session} = require('electron');

  const ses = session.fromPartition("persist:electron-study");
  const proxyOptions = {
    proxyRules: "localhost:" + HTTP_PORT + ";direct://",
  };
  ses.setProxy(proxyOptions, function() {
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

var server = http.createServer(function onCliReq(cliReq, cliRes) {
  var cliSoc = cliReq.socket || cliReq.connection;
  var x = url.parse(cliReq.url);
  var options = {
    host: x.hostname,
    port: x.port || 80,
    path: x.path,
    method: cliReq.method,
    headers: cliReq.headers,
    agent: cliSoc.$agent
  };
  var self = this;
  var svrReq = http.request(options, function onSvrRes(svrRes) {
    cliRes.writeHead(svrRes.statusCode, svrRes.headers);
    svrRes.pipe(cliRes);
  });
  cliReq.pipe(svrReq);
  svrReq.on('error', function onSvrReqErr(err) {
    cliRes.writeHead(400, err.message, {'content-type': 'text/html'});
    cliRes.end('<h1>' + err.message + '<br/>' + cliReq.url + '</h1>');
  });
  svrReq.on('data', function(chunk) {
    console.log(chunk.toString());
  });
}).listen(HTTP_PORT);

server.on('clientError', function onCliErr(err, cliSoc) {
  cliSoc.end();
});

server.on('connect', function onCliConn(cliReq, cliSoc, cliHead) {
  var x = url.parse('https://' + cliReq.url);

  var svrSoc = net.connect(x.port || 443, x.hostname, function onSvrConn() {
    cliSoc.write('HTTP/1.0 200 Connection established\r\n\r\n');
    if (cliHead && cliHead.length) {
      svrSoc.write(cliHead);
    }
    cliSoc.pipe(svrSoc);
  });
  svrSoc.pipe(cliSoc);
  svrSoc.on('error', funcOnSocErr(cliSoc, 'svrSoc', cliReq.url));

  cliSoc.on('error', function onCliSocErr(err) {
    if (svrSoc) {
      svrSoc.end();
    }
  });
  function funcOnSocErr(soc, msg, url) {
    return function onSocErr(err) {
      soc.end();
    };
  }
});

const whiteAddressList = {};
whiteAddressList['::1'] = true;
whiteAddressList['::ffff:127.0.0.1'] = true;
whiteAddressList['::ffff:192.168.251.1'] = true;

server.on('connection', function onConn(cliSoc) {
  if (cliSoc.remoteAddress in whiteAddressList) {
    return;
  }
  cliSoc.destroy();
});
