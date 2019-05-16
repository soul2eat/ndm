var socket;
window.onload = () => {
  WebSocket.prototype.sendJson = function(obj) {
    this.send(JSON.stringify(obj));
  }
  socket = socketInnit('ws://127.0.0.1:3002/');
  defaultButton();
  contextMenu();
}
var hashTable = [];

function socketInnit(url) {
  let socket = new WebSocket(url);
  socket.onopen = function() {
    console.log("Соединение установлено.");
    setInterval(() => {
      socket.sendJson({
        type: 'getInfo'
      });
    }, 1000);
  };
  socket.onclose = function(event) {
    if (event.wasClean) {
      console.log('Соединение закрыто чисто');
    } else {
      console.log('Обрыв соединения'); // например, "убит" процесс сервера
    }
    console.log('Код: ' + event.code + ' причина: ' + event.reason);
  };
  socket.onmessage = handler;
  socket.onerror = function(error) {
    console.log("Ошибка " + error.message);
  };
  socket.prosendJson = (obj) => {
    socket
  }
  return socket;
}

function handler(event) {
  let message = JSON.parse(event.data);
  if (message.type == 'sendLink') {
    if (message.data.error) {
      if (message.data.error == 'rangesNone') {
        document.querySelector('#alert').innerText = 'Файл не поддерживает докачку, действительно скачать его?'
        if (message.data.fileName) {
          document.querySelector('#fileName').value = message.data.fileName;
        }
        if (message.data.length) {
          document.querySelector('body').innerHTML += '<input type="hidden" id="lengthFile" name="length" value="' + message.data.length + '">';
        }
        if (message.data['content-type']) {
          document.querySelector('body').innerHTML += '<input type="hidden" id="contentType" name="type" value="' + message.data['content-type'] + '">';
        }
        rangesButton();
        return;
      }
      document.querySelector('#alert').innerText = 'Недействительная ссылка!';
      defaultButton();
    } else {
      document.querySelector('#alert').innerText = 'Скачиваем...';
      defaultButton();
    }
  }
  if (message.type == 'getInfo') {
    let tbody = document.querySelector('tbody.fileList');
    let tbodyList = tbody.querySelectorAll('tr');
    let num = tbodyList.length;
    let tbodyExist = false;

    if (num > 0) {
      tbodyExist = true;
    }

    for (var key in message.data.fileList) {
      let item = message.data.fileList[key];
      if (!item.timestamp) item.timestamp = key;
      let status = item.status == 'download'?
      'Скачано':
      item.status == 'error'?
      'Ошибка!':
      item.status == 'pause'?
      'Пауза:'+item.downloaded:
      item.status == 'stop'?
      'Остановлено':
      item.downloaded
      if (tbodyExist) {
        let id = hashTable.indexOf(key);
        if (~id) {
          let tr = tbodyList[id];
          let td = tr.querySelectorAll('td');
          td[2].innerText = status;
          td[3].innerText = getDate(item.timestamp);
        } else {
          tbody.innerHTML += `<tr title="${item.fileName}" data-id="${key}">
            <td class="cut">${item.fileName}</td>
            <td>${(item.size?getSize(item.size):'Неизвестно')}</td>
            <td>${satus}</td>
            <td>${getDate(item.timestamp)}</td>
          </tr>`;
          num++;
          hashTable.push(key);
        }
      } else {

        tbody.innerHTML += `<tr title="${item.fileName}" data-id="${key}">
          <td class="cut">${item.fileName} </td>
          <td>${(item.size?getSize(item.size):'Неизвестно')}</td>
          <td>${status}</td>
          <td>${getDate(item.timestamp)}</td>
        </tr>`;
        num++;
        hashTable.push(key);
      }
    }
  }

}

function rangesButton() {
  document.querySelector('#buttons').innerHTML += `<input type="button" value="Отмена" id="cancel">`;
  document.querySelector('#cancel').onclick = defaultButton;
  document.querySelector('#testbut').onclick = () => {
    document.querySelector('#alert').innerText = 'Скачиваем..';
    socket.sendJson({
      type: 'acceptRanges',
      data: {
        url: document.querySelector('#link').value,
        fileName: (document.querySelector('#fileName').value.length > 0 ? document.querySelector('#fileName').value : undefined),
        length: (document.querySelector('#lengthFile').value.length > 0 ? document.querySelector('#lengthFile').value : undefined),
        'content-type': (document.querySelector('#contentType').value.length > 0 ? document.querySelector('#contentType').value : undefined)
      }
    });
    defaultButton();

  }
}

function defaultButton() {
  document.querySelector('#buttons').innerHTML = `<button type="button" name="button" id="testbut">Скачать</button>`;
  document.querySelector('#fileName').value = '';
  if (document.querySelector('#lengthFile')) {
    document.querySelector('#lengthFile').remove();
  }
  if (document.querySelector('#contentType')) {
    document.querySelector('#contentType').remove();
  }
  setTimeout(() => {
    document.querySelector('#alert').innerText = '';
  }, 2500);
  document.querySelector('#testbut').onclick = () => {
    socket.sendJson({
      type: 'sendLink',
      data: {
        url: document.querySelector('#link').value,
        fileName: (document.querySelector('#fileName').value.length > 0 ? document.querySelector('#fileName').value : undefined)
      }
    })
  }
}

function getDate(time) {
  var date = new Date(time * 1);
  return date.toLocaleString();

  date.setTime(1556447053400);
  var hour = (date.getHours() + '').length < 2 ? ('0' + date.getHours()) : date.getHours();
  var minutes = (date.getMinutes() + '').length < 2 ? ('0' + date.getMinutes()) : date.getMinutes();
  var day = (date.getDate() + '').length < 2 ? ('0' + date.getDate()) : date.getDate();
  var month = ((date.getMonth() + 1) + '').length < 2 ? ('0' + (date.getMonth() + 1)) : (date.getMonth() + 1);
  var year = (date.getDate() + '').length < 2 ? ('0' + date.getDate()) : date.getDate();

  return hour + ':' + minutes + '  ' + day + '.' + month + '.' + date.getFullYear();
}

function getSize(num) {
  if (num < 1024) return num + 'b/s';
  else if ((num = num / 1024) < 1024) return num.toFixed(0) + 'Kb';
  else if ((num = num / 1024) < 1024) return num.toFixed(0) + 'Mb';
  else if ((num = num / 1024) < 1024) return num.toFixed(0) + 'Gb';
  else return num.toFixed(0) + 'Gb';
}

//

// context menu
function contextMenu() {
  if(require){
    // DEFAULT context menu
    let { remote } = require('electron')
    let { Menu, MenuItem } = remote
    let menuDef = new Menu()
    menuDef.append(new MenuItem({ label: 'Вставить', role: 'paste'}))
    menuDef.append(new MenuItem({ label: 'Копировать', role: 'copy'}))
    menuDef.append(new MenuItem({ label: 'Вырезать', role: 'cut'}))
  }



  // TABLE context menu
  //get menu el
  let i = document.getElementById("menu").style;
  //check
  if (document.addEventListener) {
    // lisn
    document.addEventListener('contextmenu', function(e) {
      var posX = e.clientX;
      var posY = e.clientY;
      let target = e.target;
      if (target.tagName == 'TR') {
        menu(posX, posY, target);
        e.preventDefault();
      } else if (target.parentElement.tagName == 'TR') {
        menu(posX, posY, target.parentElement);
        e.preventDefault();
      }else if(menuDef){
        menuDef.popup({ window: remote.getCurrentWindow() });
        e.preventDefault();

      }
    }, false);
    document.addEventListener('click', function(e) {
      i.opacity = "0";
      i.visibility = "hidden";
    }, false);
  }

  function dmEvents(id, event) {
    socket.sendJson({type: event, data:{id}});
    if(event == 'delete'){
      document.querySelector('tbody.fileList').innerHTML = '';
      hashTable = [];
    }
    console.log(id);
    console.log(event);
  }

  function menu(x, y, el) {
    let i = document.getElementById("menu");
    i.innerHTML = '';
    //
    createElem( `<div>Продолжить</div>`, 'continue');
    createElem( `<div>Пауза</div>`, 'pause');
    createElem( `<div>Остановить</div>`, 'stop');
    createElem( `<div>Удалить</div>`, 'delete');
    //ONLY ELECTRON
    createElem( `<div>Показать в папке</div>`, 'openDir');
    createElem( `<div>Открыть файл</div>`, 'openFile');

    function createElem(inner, event) {
      let div = document.createElement('div');
      div.innerHTML = inner;
      div.onclick = () => {
        dmEvents(el.dataset.id, event)
      };
      i.appendChild(div);
    }
    //show
    i.style.top = y + "px";
    i.style.left = x + "px";
    i.style.visibility = "visible";
    i.style.opacity = "1";
  }
}
