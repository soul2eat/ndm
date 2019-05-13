var WebSocket = require('ws');
var fs = require('fs');
var fsPromises = fs.promises
var request = require('request');
var ws = new WebSocket.Server({
  port: 3002
});
Admin = '';
// fsPromises.readdir(path
var exClients = [];
var fileList = {};
var downloadList = [];
var downloadDirectory = './downloads/';
mkdir(downloadDirectory);
saveFile.prototype.saving = saving;
saveFile.prototype.saveParts = saveParts;
ws.on('connection', (connection, req) => {
  exClients.push(connection);
  //console.log(connections.length);
  console.log('Connecting ' + exClients.length + ' client');
  connection.on('message', handler);
  connection.on('close', () => {
    exClients.splice(exClients.indexOf(exClients), 1);
    console.log(exClients.length);
    console.log('close');
  })

  async function handler(message) {
    message = JSON.parse(message);
    if (message.type == 'sendLink') {
      let headers = await getHeaders(message.data.url);
      let fileName = await getName({
        fileName: message.data.fileName,
        url: message.data.url,
        headers
      });
      if (headers.error && headers.error == 'rangesNone')
        headers.fileName = fileName;
      send({
        type: message.type,
        data: headers
      }, connection);
      if (!headers.error) {
        console.log('start');
        let test = await saveFile(message.data.url, headers, fileName);
        console.log('saved');
        // console.log(test);
      }
    }
    if (message.type == 'acceptRanges') {
      let name;
      if (message.data.fileName) name = message.data.fileName;
      else {
        name = message.data.url.split('?')[0].split('/');
        name = name[name.length - 1];
      }
      savingAll(message.data.url, name, message.data.length);
    }
    if (message.type == 'getInfo') {
      send({
        type: 'getInfo',
        data: {
          fileList
        }
      }, connection);
    }
    if(message.type == 'pause' || message.type == 'stop'){
      fileList[message.data.id].status = message.type;
    }
    if(message.type == 'delete'){
      if(fileList[message.data.id].status == 'download' || fileList[message.data.id].status == 'stop'){
        delete fileList[message.data.id];
      }
    }
    if(message.type == 'continue'){
      if(fileList[message.data.id].partsLoaded){
        let headers = await getHeaders(fileList[message.data.id].url);
        if (!headers.error) {
          console.log('start');
          let test = await saveFile(fileList[message.data.id].url, headers, fileList[message.data.id].fileName, {
            timestamp: message.data.id,
            partsLoaded: fileList[message.data.id].partsLoaded
          });
          console.log('saved');
          // console.log(test);
        }else {
          if(headers.error != 'rangesNone')
            send({
            type: 'linkUpdate',
            data: headers
          }, connection);
          else
            send({
              type: 'sendLink',
              data: headers
            }, connection);
        }
      }
    }
  }
});

function send(json, conn) {
  if (exClients.length < 1) {
    return;
  }
  if (conn) {
    conn.send(JSON.stringify(json));
  } else {
    exClients.forEach(val => {
      val.send(JSON.stringify(json));
    });
  }
  return;
}
Admin = {
  saveFile,
  fs,
  request
};
// setTimeout(test, 3000);
async function test() {
  let url = 'http://hd.aniland.org/720/2147412088.mp4?md5=qnt1e_Ds4rScHqLYjPTnfA&time=1557488913';
  let headers = await getHeaders(url);

  if (!headers.error) {
    console.log('start');
    let test = saveFile(url, headers);
    console.log(test);
    await test.promise;
    console.log('saved');
    // console.log(test);
  }
  //  var headers = await getHeaders();
}

function saveFile(url, headers, fileName, {
  partSize = 1048576,
  trysSize = 10,
  maxStream = 10,
  partsLoaded,
  timestamp
} = {}) {
  if (!(this instanceof saveFile)) return new saveFile(url, headers, fileName, {
    partSize,
    trysSize,
    maxStream,
    partsLoaded,
    timestamp
  });
  this.trys = {};
  this.url = url;
  this.headers = headers || {};
  this.partSize = partSize;
  this.trysSize = trysSize;
  this.parts = partsLoaded || 0;
  this.partsLoaded = partsLoaded || 0;
  this.status = 'saving';
  this.hashParts = [];
  this.partsBytes = {};
  this.timestamp =timestamp || Date.now();
  this.promise = new Promise(res => {
    this.res = res;
  });
  this.fileName = fileName;
  fileList[this.timestamp] = {
    fileName: this.fileName,
    url: this.url,
    status: this.status,
    partsLoaded: this.partsLoaded,
    size: this.headers['content-length'],
    downloaded: (this.headers['content-length']?
      ((this.partsLoaded * this.partSize)/this.headers['content-length']*100).toFixed(2)+'%':
      this.partsLoaded * this.partSize)
  };
  this.writeStream = fs.createWriteStream(downloadDirectory + this.fileName); // создаем поток
  for (var i = 0; i < maxStream; i++) {
    this.saveParts();
  }
  return this;
}

async function saveParts(part) {
  if (this.status == 'error') return;
  if(fileList[this.timestamp].status == 'pause' || fileList[this.timestamp].status == 'stop'){
    this.status = fileList[this.timestamp].status;
    return;
  }
  if (!part && part !== 0) {
    part = this.parts++;
  } else {
    if (this.trys[part] && this.trys[part] > this.trysSize) {
      this.status = 'error';
      this.res();
      return;
    } else {
      this.trys[part] = this.trys[part] ? (this.trys[part] + 1) : 1;
    }
  }

  let start = part == 0 ? this.partSize * part : (this.partSize * part) + 1;
  let end = this.partSize * (part + 1);
  if (this.headers['content-length'] < start) {
    return;
  }
  if (this.headers['content-length'] < end) {
    // end = this.headers['content-length'];
    this.status = 'download';
  }
  let [error, status, partBytes] = await new Promise(c =>
    request({
      url: this.url,
      encoding: null,
      headers: {
        'Range': 'bytes=' + start + '-' + end,
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.108 Safari/537.36 OPR/50.0.2762.45',
        //'referer': 'https://tradeit.gg/',
      }
    }, (...a) => c(a)));
  if (status.statusCode == 206) {
    this.saving(part, partBytes, (this.status == 'download' ? true : false));
    await new Promise(res => {
      setTimeout(res, 1000)
    });
    this.saveParts();
  } else {
    await new Promise(res => {
      setTimeout(res, 1000)
    });
    this.saveParts(part);
  }
}

function saving(part, bytes) {
//signal pause
  if((this.status == 'stop' || this.status == 'pause') && this.writeStream){
    delete this.hashParts;
    delete this.partsBytes;
    this.writeStream.end();
    delete this.writeStream;
    if(fileList[this.timestamp].status == 'stop'){
      delete fileList[this.timestamp].partsLoaded;
      delete fileList[this.timestamp].downloaded;
    }
    return;
  }else if(this.status == 'stop' || this.status == 'pause'){
    return;
  }

  if (part == this.partsLoaded) {
    this.writeStream.write(bytes, 'binary');
    this.partsLoaded++;
  }
  else {
    this.hashParts.push(part);
    this.partsBytes[part] = bytes;
    this.hashParts.sort(function(a, b) {
      return a - b;
    });
  }
  if (this.hashParts && this.hashParts.length) {
    if (this.hashParts[0] == this.partsLoaded) {
      for (let a = 0; a < this.hashParts.length; a++) {
        if (this.hashParts[a] == this.partsLoaded) {
          let p = this.hashParts.splice(a, 1)[0];
          this.writeStream.write(this.partsBytes[p], 'binary');
          delete this.partsBytes[p];
          this.partsLoaded++;
          a--;
        } else {
          break;
        }
      }
    }
  }
  if (this.partsLoaded * this.partSize >= this.headers['content-length']) {
    this.writeStream.end();
    this.status = 'download';
    this.res();
  }

  fileList[this.timestamp].partsLoaded = this.partsLoaded;

  if (this.status == 'download') {
    fileList[this.timestamp].timestamp = Date.now();
    delete fileList[this.timestamp].partsLoaded;
    delete fileList[this.timestamp].downloaded;
  } else {
    fileList[this.timestamp].downloaded = (this.hashParts.length + this.partsLoaded) * this.partSize;
    if (this.headers['content-length']) {
      fileList[this.timestamp].downloaded = (fileList[this.timestamp].downloaded / this.headers['content-length'] * 100).toFixed(2) + '%';
    } else {
      fileList[this.timestamp].downloaded = getSize(fileList[this.timestamp].downloaded);
    }
  }

if(fileList[this.timestamp].status != 'pause' && fileList[this.timestamp].status != 'stop')
  fileList[this.timestamp].status = this.status;

}

function getSize(num) {
  if (num < 1024) return num + 'b/s';
  else if ((num = num / 1024) < 1024) return num.toFixed(0) + 'Kb';
  else if ((num = num / 1024) < 1024) return num.toFixed(0) + 'Mb';
  else if ((num = num / 1024) < 1024) return num.toFixed(0) + 'Gb';
  else return num.toFixed(0) + 'Gb';
}

function savingAll(url, fileName, length) {
  let timestamp = Date.now();
  fileList[timestamp] = {
    fileName: fileName,
    url: url,
    status: 'saving',
    type: 'all',
    size: length,
    downloaded: 'Неизвестно'
  };
  return new Promise(response => {
    request.head(url, (err, res, body) => {
      request(url)
        .pipe(fs.createWriteStream(fileName))
        .on('error', e => {
          console.log(e);
          fileList[timestamp].status = 'error'
        })
        .on("close", () => {
          fileList[timestamp].status = 'download';
          response();
        });
    });
  });
}

async function getHeaders(url) {
  var t = new Promise(res => {

    let r = request.get(url);

    r.on('response', function(response) {
      if (response.statusCode != 200) {
        res({
          error: 'statusCode'
        });
      }
      else if (!response.headers['accept-ranges'] || response.headers['accept-ranges'] != 'bytes') {
        res({
          error: 'rangesNone',
          'content-type': response.headers['content-type'],
          length: response.headers['content-length']
        });
      }
      else {
        res(response.headers);
      }
      r.abort();
    });
    r.on('error', e => {
      console.log(e);
      res({
        error: 'statusCode'
      });
    })
  });

  try {
    t = await t;
  }
  catch (e) {
    t = {error: 'statusCode'}
  }
  return t;
}

async function getName({
  fileName,
  url,
  headers
}) {
  //if exist url
  if (url && !fileName) {
    fileName = url.split('?')[0].split('/');
    fileName = fileName[fileName.length - 1];
  }
  let indexPoint = fileName.lastIndexOf('.');
  //if exist content-type
  if (headers && headers['content-type'] && (!~indexPoint || fileName.length - 6 > indexPoint)) {
    let memType = headers['content-type'].split(';')[0].split('/')[1];
    fileName = memType ? fileName + '.' + memType : fileName;
    if (memType) indexPoint = fileName.lastIndexOf('.');
  }
  //check exist file in download directory
  let dirList = await fsPromises.readdir(downloadDirectory);
  let lowerName = fileName.toLowerCase();
  let num = 0;
  let tmpIndex = indexPoint;
  for (let a = dirList.length - 1; a > -1; a--) {
    if (dirList[a].toLowerCase() == lowerName) {
      if (num) {
        tmpIndex += lowerName.lastIndexOf('.');
        let s = lowerName.lastIndexOf('(');
        let e = lowerName.lastIndexOf(')');
        lowerName = lowerName.substring(0, s + 1) + (++num) + lowerName.substring(e);
      } else {
        lowerName = lowerName.substring(0, tmpIndex) + ' (' + (++num) + ')' +
          (~tmpIndex ? lowerName.substring(tmpIndex) : '');
      }

    }
  }
  //if ixst file in download directory
  if (num)
    fileName = fileName.substring(0, indexPoint) + ' (' + (num) + ')' +
    (indexPoint ? fileName.substring(indexPoint) : '');

  return fileName;
}

function mkdir(dirpath) {
  try {
    fs.mkdirSync(dirpath, {
      recursive: true
    });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') return fase;
  }
}
