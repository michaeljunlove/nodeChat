//用来防止XSS脚本攻击，将特殊字符转换为html实体
function divEscapedContentElement(message) {
  return $('<div></div>').text(message);
}
//用来显示信任的内容
function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');
}
//处理原始的用户输入
function processUserInput(chatApp, socket) {
  var message = $('#send-message').val();
  var systemMessage;
  //如果输入的第一个字符是/开头的，那么这是命令的意思。
  if (message.charAt(0) == '/') {
    systemMessage = chatApp.processCommand(message);
    if (systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    //将非命令的输入广播给其他用户
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }

  $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function() {
  var chatApp = new Chat(socket);
  //显示更名的结果
  socket.on('nameResult', function(result) {
    var message;

    if (result.success) {
      message = 'You are now known as ' + result.name + '.';
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });
  //显示房间变更的结果
  socket.on('joinResult', function(result) {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));
  });
  //显示接收到的消息
  socket.on('message', function (message) {
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });
  //显示可用房间列表
  socket.on('rooms', function(rooms) {
    $('#room-list').empty();

    for(var room in rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        $('#room-list').append(divEscapedContentElement(room));
      }
    }
    //点击房间名可以切换到那个房间
    $('#room-list div').click(function() {
      chatApp.processCommand('/join ' + $(this).text());
      $('#send-message').focus();
    });
  });
  //每隔1秒请求可用的房间列表
  setInterval(function() {
    socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();
  //提交表单，发送聊天消息
  $('#send-form').submit(function() {
    processUserInput(chatApp, socket);
    return false;
  });
});
