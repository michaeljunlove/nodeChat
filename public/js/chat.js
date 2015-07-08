//定义了一个Chat函数，成员属性是socket
var Chat = function(socket) {
  this.socket = socket;
};
//在Chat函数函数的原型对象上添加一个sendMessage方法
Chat.prototype.sendMessage = function(room, text) {
  var message = {
    room: room,
    text: text
  };
  this.socket.emit('message', message);
};
//在Chat函数函数的原型对象上添加一个changeRoom方法
Chat.prototype.changeRoom = function(room) {
  this.socket.emit('join', {
    newRoom: room
  });
};
//在Chat函数函数的原型对象上添加一个processCommand方法，用来处理聊天命令，能够识别join和nick这2个命令
Chat.prototype.processCommand = function(command) {
  var words = command.split(' ');
  var command = words[0]
                .substring(1, words[0].length)
                .toLowerCase();
  var message = false;

  switch(command) {
    case 'join':
      words.shift();
      var room = words.join(' ');
      this.changeRoom(room);
      break;
    case 'nick':
      words.shift();
      var name = words.join(' ');
      this.socket.emit('nameAttempt', name);
      break;
    default:
      message = 'Unrecognized command.';
      break;
  };

  return message;
};
