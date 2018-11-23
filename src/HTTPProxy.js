'use strict;'

const http = require('http'),
      url = require('url'),
      net = require('net'),
      zlib = require('zlib'),
      is_dev = require('electron-is-dev'),
      mkdirp = require('mkdirp'),
      path = require('path'),
      fs = require('fs'),
      _ = require('lodash'),
      i18n = require('i18n');

function deleteCaseInsensitive(object, key) {
  const lowerCaseKey = key.toLowerCase();
  for (let k in object) {
    if (k.toLowerCase() == lowerCaseKey) {
      delete(object[k]);
    }
  }
}

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

function HTTPProxy() {

}

const observers = {};
var maxObserverId = -1;

HTTPProxy.addObserver = function(callback) {
  maxObserverId++;
  observers[maxObserverId] = callback;
  return maxObserverId;
};

HTTPProxy.removeObserver = function(key) {
  observers[key] = null;
};

function handle(api, raw_data, request_body, local_response, remote_response) {
  let prefix = '';
  let json = raw_data.toString();
  let headers = clone(remote_response.headers);

  const possible_prefix = 'svdata=';
  if (json.indexOf(possible_prefix) === 0) {
    prefix = possible_prefix;
    json = json.substring(possible_prefix.length);
  }

  for (var key in observers) {
    observers[key](api, json, request_body);
  }

  const obj = JSON.parse(json);
  const filtered = filter(api, obj);
  const filtered_data = new Buffer(prefix + JSON.stringify(filtered));

  deleteCaseInsensitive(headers, 'content-encoding');
  deleteCaseInsensitive(headers, 'content-length');
  deleteCaseInsensitive(headers, 'transfer-encoding');
  headers['content-length'] = filtered_data.byteLength;

  local_response.writeHead(remote_response.statusCode, headers);
  local_response.write(filtered_data);
  local_response.end();

  if (is_dev) {
    console.log(api);
    const log = {
      'api': api,
      'request': request_body,
      'response': filtered,
    };
    const file = path.join(path.dirname(__dirname), 'api_log', api + '.json');
    mkdirp(path.dirname(file), (err) => {
      if (err) {
        console.trace(err)
        return;
      }
      try {
        const stream = fs.createWriteStream(file);
        stream.write(JSON.stringify(log, null, 2));
        stream.end();
      } catch (e) {
        console.trace(e);
      }
    });
    if (api == 'api_req_map/start' || api == 'api_req_map/next') {
      const area = _.get(filtered, ['api_data', 'api_maparea_id'], -1);
      const map = _.get(filtered, ['api_data', 'api_mapinfo_no'], -1);
      const no = _.get(filtered, ['api_data', 'api_no'], -1);
      console.log([area, map, no].join("-"));
    }
  }
}

function filter(api, data) {
  switch (api) {
    case 'api_start2/getData':
      let obj = clone(data);
      const ship_master = _.get(obj, ['api_data', 'api_mst_ship'], []);
      for (let i = 0; i < ship_master.length; i++) {
        const master = ship_master[i];
        const name = _.get(master, ['api_name'], null);
        if (name == null) {
          continue;
        }
        const translated = i18n.__(name);
        master['api_name'] = translated;
      }
      const stype_master = _.get(obj, ['api_data', 'api_mst_stype'], []);
      for (let i = 0; i < stype_master.length; i++) {
        const master = stype_master[i];
        const name = _.get(master, ['api_name'], null);
        if (name == null) {
          continue;
        }
        const translated = i18n.__(name);
        master['api_name'] = translated;
      }
      return obj;
    default:
      return data;
  }
}

HTTPProxy.launch = function(port, complete) {
  var server = http.createServer(function onCliReq(cliReq, cliRes) {
    var cliSoc = cliReq.socket || cliReq.connection;
    const remoteAddress = cliReq.connection.remoteAddress;

    const whitelist = ['::1', '::ffff:127.0.0.1'];
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

    const kcsapiIndex = cliReq.url.indexOf("/kcsapi/");

    var request_body = null;

    var self = this;
    var svrReq = http.request(options, function onSvrRes(svrRes) {
      if (kcsapiIndex >= 0) {
        const api = cliReq.url.substring(kcsapiIndex + "/kcsapi/".length);
        let headers = svrRes.headers;
        var isGzip = false;
        for (var header in headers) {
          if (header.toLowerCase() === "content-encoding" && headers[header].toLowerCase() === "gzip") {
            isGzip = true;
            break;
          }
        }
        var data = null;
        svrRes.on('data', function(chunk) {
          if (data == null) {
            data = chunk;
          } else {
            data = Buffer.concat([data, chunk]);
          }
        });
        svrRes.on('end', function() {
          try {
            let prefix = '';
            let json = null;
            if (isGzip) {
              zlib.gunzip(data, function(error, result) {
                if (error) {
                  console.log("error=" + error);
                }
                handle(api, result, request_body, cliRes, svrRes);
              });
            } else {
              handle(api, data, request_body, cliRes, svrRes);
            }
          } catch (e) {
            console.trace(e);
          }
        });
      } else {
        cliRes.writeHead(svrRes.statusCode, svrRes.headers);
        svrRes.pipe(cliRes);
      }
    });
    cliReq.on('data', (data) => {
      if (request_body == null) {
        request_body = data;
      } else {
        request_body += data;
      }
      svrReq.write(data);
    });
    cliReq.on('end', () => {
      if (request_body == null) {
        request_body = '';
      } else {
        request_body = '' + request_body;
      }
      svrReq.end();
    });
    svrReq.on('error', function onSvrReqErr(err) {
      cliRes.writeHead(400, err.message, {'content-type': 'text/html'});
      cliRes.end('<h1>' + err.message + '<br/>' + cliReq.url + '</h1>');
    });
    svrReq.on('data', function(chunk) {
      console.log(chunk.toString());
    });
  }).listen(port, (e) => {
    complete(e);
  });

  server.on('clientError', function onCliErr(err, cliSoc) {
    cliSoc.end();
  });
};

module.exports = HTTPProxy;
