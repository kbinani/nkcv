'use strict;'

const http = require('http'),
      url = require('url'),
      net = require('net'),
      zlib = require('zlib'),
      isDev = require('electron-is-dev'),
      mkdirp = require('mkdirp'),
      path = require('path'),
      fs = require('fs'),
      _ = require('lodash');
const util = require(__dirname + '/util.js'),
      i18n = require(__dirname + '/i18n.js'),
      json = require(__dirname + '/json.js');

class HTTPProxy {
  constructor(port, complete) {
    this._observers = {};
    this._maxObserverId = -1;
    this._launch(port, complete);
    this._quest_mapping_file = __dirname + '/../data/quest_mapping.json';
    this._quest_mapping = json.fromFile(this._quest_mapping_file);
  }

  addObserver(callback) {
    this._maxObserverId++;
    this._observers[this._maxObserverId] = callback;
    return this._maxObserverId;
  }

  removeObserver(key) {
    this._observers[key] = null;
  }

  _handle(api, rawData, requestBody, localResponse, remoteResponse) {
    let prefix = '';
    let json = rawData.toString();
    let headers = util.clone(remoteResponse.headers);

    const possiblePrefix = 'svdata=';
    if (json.indexOf(possiblePrefix) === 0) {
      prefix = possiblePrefix;
      json = json.substring(possiblePrefix.length);
    }

    for (let key in this._observers) {
      this._observers[key](api, json, requestBody);
    }

    const obj = JSON.parse(json);
    const filtered = this._filter(api, obj);
    const filteredData = new Buffer(prefix + JSON.stringify(filtered));

    util.delete(headers, 'content-encoding', {case_sensitive: false});
    util.delete(headers, 'content-length', {case_sensitive: false});
    util.delete(headers, 'transfer-encoding', {case_sensitive: false});
    headers['content-length'] = filteredData.byteLength;

    localResponse.writeHead(remoteResponse.statusCode, headers);
    localResponse.write(filteredData);
    localResponse.end();

    if (isDev) {
      console.log(api);
      const log = {
        'api': api,
        'request': requestBody,
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

  _filter(api, data) {
    return data;

    switch (api) {
      case 'api_start2/getData':
        return (() => {
          let obj = util.clone(data);

          ['api_mst_ship', 'api_mst_stype', 'api_mst_slotitem'].forEach((key) => {
            const masterList = _.get(obj, ['api_data', key], []);
            for (let i = 0; i < masterList.length; i++) {
              const master = masterList[i];
              const name = _.get(master, ['api_name'], null);
              if (name == null) {
                continue;
              }
              const translated = i18n.__(name);
              master['api_name'] = translated;
            }
          });

          return obj;
        })();
      case 'api_get_member/questlist':
        return (() => {
          if (isDev) {
            this._quest_mapping = json.fromFile(this._quest_mapping_file);
          }

          let obj = util.clone(data);
          const list = _.get(obj, ['api_data', 'api_list'], []);
          for (let i = 0; i < list.length; i++) {
            const d = list[i];
            const api_no = _.get(d, ['api_no'], -1);
            if (api_no == -1) {
              continue;
            }
            const name = _.get(this._quest_mapping, [api_no], null);
            if (name == null) {
              if (isDev) {
                let missing = {};
                const file = __dirname + '/quest_mapping_missiong.json';
                try {
                  missing = json.fromFile(file);
                } catch (e) {
                  console.trace(e);
                }
                missing[api_no] = {
                  title: _.get(d, ['api_title'], ''),
                  detail: _.get(d, ['api_detail'], ''),
                };
                try {
                  json.toFile(missing, file);
                } catch (e) {
                  console.trace(e);
                }
              }
              continue;
            }
            const title = i18n.__(`quest.${name}.title`);
            const detail = i18n.__(`quest.${name}.detail`);
            if (title.indexOf('quest.') < 0) {
              d['api_title'] = title;
            }
            if (detail.indexOf('quest.') < 0) {
              d['api_detail'] = detail;
            }
          }
          data['api_data']['api_list'] = list;
          return data;
        })();
      default:
        return data;
    }
  }

  _launch(port, complete) {
    this._server = http.createServer((clientRequest, clientResponse) => {
      let clientConnection = clientRequest.socket || clientRequest.connection;
      const remoteAddress = clientRequest.connection.remoteAddress;

      const whitelist = ['::1', '::ffff:127.0.0.1'];
      if (whitelist.indexOf(remoteAddress) < 0) {
        clientRequest.destroy();
        return;
      }

      let x = url.parse(clientRequest.url);
      const options = {
        host: x.hostname,
        port: x.port || 80,
        path: x.path,
        method: clientRequest.method,
        headers: clientRequest.headers,
        agent: clientConnection.$agent
      };

      const kcsapiIndex = clientRequest.url.indexOf("/kcsapi/");

      let requestBody = null;

      let serverRequest = http.request(options, (serverResponse) => {
        if (kcsapiIndex >= 0) {
          const api = clientRequest.url.substring(kcsapiIndex + "/kcsapi/".length);
          let headers = serverResponse.headers;
          let isGzip = false;
          for (let header in headers) {
            if (header.toLowerCase() === "content-encoding" && headers[header].toLowerCase() === "gzip") {
              isGzip = true;
              break;
            }
          }
          let data = null;
          serverResponse.on('data', (chunk) => {
            if (data == null) {
              data = chunk;
            } else {
              data = Buffer.concat([data, chunk]);
            }
          });
          serverResponse.on('end', () => {
            try {
              let prefix = '';
              let json = null;
              if (isGzip) {
                zlib.gunzip(data, (error, result) => {
                  if (error) {
                    console.log("error=" + error);
                  }
                  this._handle(api, result, requestBody, clientResponse, serverResponse);
                });
              } else {
                this._handle(api, data, requestBody, clientResponse, serverResponse);
              }
            } catch (e) {
              console.trace(e);
            }
          });
        } else {
          clientResponse.writeHead(serverResponse.statusCode, serverResponse.headers);
          serverResponse.pipe(clientResponse);
        }
      });
      clientRequest.on('data', (data) => {
        if (requestBody == null) {
          requestBody = data;
        } else {
          requestBody += data;
        }
        serverRequest.write(data);
      });
      clientRequest.on('end', () => {
        if (requestBody == null) {
          requestBody = '';
        } else {
          requestBody = '' + requestBody;
        }
        serverRequest.end();
      });
      serverRequest.on('error', (err) => {
        clientResponse.writeHead(400, err.message, {'content-type': 'text/html'});
        clientResponse.end('<h1>' + err.message + '<br/>' + clientRequest.url + '</h1>');
      });
      serverRequest.on('data', (chunk) => {
        console.log(chunk.toString());
      });
    }).listen(port, (e) => {
      complete(e);
    });

    this._server.on('clientError', (err, clientConnection) => {
      clientConnection.end();
    });
  }
}

module.exports = HTTPProxy;
