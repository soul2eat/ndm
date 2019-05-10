var WebSocket = require('ws');
var fs = require('fs');
var ws = new WebSocket.Server({
  port: 3001
});
var exClients = [];
ws.on('connection', (connection, req) => {
  exClients.push(connection);
  //console.log(connections.length);

  connection.on('message', mod.call);
  connection.on('close', () => {
    exClients.splice(exClients.indexOf(exClients), 1);
    console.log(exClients.length);
    console.log('close');
  })
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
