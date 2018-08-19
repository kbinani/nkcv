'use strict;'

const http = require('http'),
      url = require('url'),
      net = require('net');

function HTTPProxy() {

}

const _ = HTTPProxy;

_.launch = function(port) {
  var server = http.createServer(function onCliReq(cliReq, cliRes) {
    var cliSoc = cliReq.socket || cliReq.connection;
    const remoteAddress = cliReq.connection.remoteAddress;

    const whitelist = ['::1'];
    if (whitelist.indexOf(remoteAddress) < 0) {
      cliReq.destroy();
      return;
    }

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
  }).listen(port);

  server.on('clientError', function onCliErr(err, cliSoc) {
    cliSoc.end();
  });
};

module.exports = _;
