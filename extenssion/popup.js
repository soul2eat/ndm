var socket;
window.onload=()=>{
  WebSocket.prototype.sendJson = function(obj) {
    this.send(JSON.stringify(obj));
  }
  socket = socketInnit('ws://127.0.0.1:3002/');
  defaultButton();
}


function socketInnit(url) {
  let socket = new WebSocket(url);
  socket.onopen = function() {
    console.log("Соединение установлено.");
    setInterval(()=>{
      socket.sendJson({type: 'getInfo'});
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
        if(message.data.fileName){
          document.querySelector('#fileName').value = message.data.fileName;
        }
        rangesButton();
        return ;
      }
      document.querySelector('#alert').innerText = 'Недействительная ссылка!'
    } else {
      document.querySelector('#alert').innerText = 'Скачиваем...';
      defaultButton();
    }
  }
  if(message.type == 'getInfo'){
    document.querySelector('#downloaded').innerHTML = '';
    document.querySelector('#downloads').innerHTML = '';
    message.data.downloadList.forEach(val=>{
      document.querySelector('#downloaded').innerHTML += val+'<br>';
    });
    for (var key in message.data.fileList) {
      document.querySelector('#downloads').innerHTML += key+' - '+ message.data.fileList[key];
    }
  }

}

function rangesButton() {
  document.querySelector('#buttons').innerHTML += `<input type="button" value="Отмена" id="cancel">`;
  document.querySelector('#cancel').onclick =  defaultButton;
  document.querySelector('#testbut').onclick = () => {
    socket.sendJson({
      type: 'acceptRanges',
      data: {
        url: document.querySelector('#link').value,
        fileName: (document.querySelector('#fileName').value.length > 0?document.querySelector('#fileName').value:undefined)
      }
    })
  }
}

function defaultButton() {
  document.querySelector('#buttons').innerHTML = `<button type="button" name="button" id="testbut">Скачать</button>`;
  document.querySelector('#alert').innerText = '';
  document.querySelector('#testbut').onclick = () => {
    socket.sendJson({
      type: 'sendLink',
      data: {
        url: document.querySelector('#link').value,
        fileName: (document.querySelector('#fileName').value.length > 0?document.querySelector('#fileName').value:undefined)
      }
    })
  }
}