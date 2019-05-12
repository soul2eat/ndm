var WebSocket = require('ws');
var fs = require('fs');
var fsP = fs.promises
var request = require('request');
var ws = new WebSocket.Server({
  port: 3002
});
Admin = '';
// fsPromises.readdir(path
var exClients = [];
var fileList = {};
var downloadList = [];
var downloadDirectory = './dowloads/';
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
      let fileName = await getName({fileName: message.data.fileName, url: message.data.url, headers});
      send({
        type: message.type,
        data: headers
      }, connection);
      if(!headers.error){
        console.log('start');

        let test = await saveFile(message.data.url, headers, downloadDirectory+fileName);
        console.log('saved');
        // console.log(test);
      }
    }
    if(message.type == 'acceptRanges'){
      let name;
      if(message.data.fileName) name = message.data.fileName;
      else {
        name = message.data.url.split('?')[0].split('/');
        name = name[name.length - 1];
      }
      fileList[name] = 'Unknown';
      savingAll(message.data.url, downloadDirectory+name);
      delete fileList[name];
      downloadList.push()
    }
    if(message.type == 'getInfo'){
      send({type: 'getInfo', data:{downloadList, fileList}}, connection);
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
 Admin = {saveFile, fs, request};
// setTimeout(test, 3000);
async function test() {
  let url = 'http://hd.aniland.org/720/2147412088.mp4?md5=qnt1e_Ds4rScHqLYjPTnfA&time=1557488913';
  let headers = await getHeaders(url);

  if(!headers.error){
    console.log('start');
    let test =  saveFile(url, headers);
    console.log(test);
    await test.promise;
    console.log('saved');
    // console.log(test);
  }
  //  var headers = await getHeaders();
}

function saveFile(url, headers, fileName, {partSize = 1048576, trysSize = 10, maxStream=10}={}) {
  if (!(this instanceof saveFile)) return new saveFile(url, headers, fileName, {partSize, trysSize, maxStream});
  this.trys = {};
  this.url = url;
  this.headers = headers;
  this.partSize = partSize;
  this.trysSize = trysSize;
  this.parts = 0;
  this.partsLoaded = 0;
  this.status = 'saving';
  this.hashParts = [];
  this.partsBytes = {};
  this.timestamp = Date.now();
  this.promise = new Promise(res=>{this.res=res;});
  this.fileName = fileName;
  this.writeStream = fs.createWriteStream(downloadDirectory+this.fileName); // создаем поток
  for (var i = 0; i < maxStream; i++) {
    this.saveParts();
  }
  return this;
}

async function saveParts(part) {
  if (this.status == 'error') return;
  if (!part && part !== 0){
    part = this.parts++;
  }
  else {
    if (this.trys[part] && this.trys[part] > this.trysSize) {
      this.status = 'error';
      this.res();
      return;
    }else {
      this.trys[part] = this.trys[part] ? (this.trys[part] + 1) : 1;
    }
  }

  let start = part == 0?this.partSize * part:(this.partSize * part)+1;
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
    this.saving(part, partBytes, (this.status == 'download'?true:false));
    await new Promise(res=>{setTimeout(res, 1000)});
    this.saveParts();
  } else{
    await new Promise(res=>{setTimeout(res, 1000)});
    this.saveParts(part);
  }
}

function saving(part, bytes) {
  if (part == this.partsLoaded) {
    this.writeStream.write(bytes, 'binary');
    this.partsLoaded++;
  } else {
    this.hashParts.push(part);
    this.partsBytes[part] = bytes;
    this.hashParts.sort(function(a, b) {
      return a - b;
    });
  }
  if(this.hashParts.length){
    if (this.hashParts[0] == this.partsLoaded) {
      for(let a = 0; a < this.hashParts.length; a++){
        if(this.hashParts[a] == this.partsLoaded){
          let p = this.hashParts.splice(a, 1)[0];
          this.writeStream.write(this.partsBytes[p], 'binary');
          delete this.partsBytes[p];
          this.partsLoaded++;
          a--;
        }else {
          break;
        }
      }
    }
  }
  if (this.partsLoaded*this.partSize >= this.headers['content-length']){
    this.writeStream.end();
    this.status = 'saved';
    this.res();
  }
  if(this.status == 'saved'){
    downloadList.push(this.fileName+' - '+getSize(this.headers['content-length']));
    delete fileList[this.fileName];
  }else {
    fileList[this.fileName] = getSize(this.partsLoaded*this.partSize)+'/'+getSize(this.headers['content-length']);
  }
}
 function getSize(num) {
   if(num < 1024) return num+'b/s';
   else if ((num=num/1024) < 1024) return num.toFixed(0)+'Kb';
   else if ((num=num/1024) < 1024) return num.toFixed(0)+'Mb';
   else if ((num=num/1024) < 1024) return num.toFixed(0)+'Gb';
   else return num.toFixed(0)+'Gb';
 }
function savingAll(url, fileName) {
  return new Promise(response=>{
    request.head(url, (err, res, body) => {
          request(url)
              .pipe(fs.createWriteStream(fileName))
              .on("close", response);
      });
  });
}

function getHeaders(url) {
  return new Promise(res => {
    request
      .get(url)
      .on('response', function(response) {
        if (response.statusCode != 200) {
          res({
            error: 'statusCode'
          });
        } else if (!response.headers['accept-ranges'] || response.headers['accept-ranges'] != 'bytes') {
          res({
            error: 'rangesNone',
            type: response.headers['conttent-type']
          });
        } else {
          res(response.headers);
        }
      })
  });
}

async function getName({fileName, url, headers}){
//if exist url
	if(url && !fileName){
		fileName = url.split('?')[0].split('/');
		fileName = fileName[fileName.length - 1];
    }
	let indexPoint = fileName.lastIndexOf('.');
//if exist content-type
  if( headers && headers['content-type'] && (!~indexPoint || fileName.length - 6> indexPoint) ){
		let memType = headers['content-type'].split(';')[0].split('/')[1];
		fileName = memType ? fileName + '.' + memType : fileName;
		if(memType)indexPoint = fileName.lastIndexOf('.');
    }
//check exist file in download directory
	let dirList = await fsPromises.readdir(downloadDirectory);
	let lowerName = fileName.toLowerCase();
	let num = 0;
	let tmpIndex = indexPoint;
	for(let a = dirList.length-1; a > -1; a--){
		if(dirList[a].toLowerCase() == lowerName){
			if(num){
				tmpIndex += lowerName.lastIndexOf('.');
				let s = lowerName.lastIndexOf('(');
				let e = lowerName.lastIndexOf(')');
				lowerName = lowerName.substring(0, s+1)+(++num)+lowerName.substring(e);
            }
			else{
				lowerName = lowerName.substring(0, tmpIndex)+' ('+(++num)+')'+
				(~tmpIndex?lowerName.substring(tmpIndex):'');
            }

        }
    }
//if ixst file in download directory
	if(num)
		fileName = fileName.substring(0, indexPoint)+' ('+(num)+')'+
		(indexPoint?fileName.substring(indexPoint):'');

	return fileName;
}
