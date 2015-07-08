/**
 * Created by michaeljunlove on 15/7/8.
 * 查看socket.io模块的API移步
 * http://socket.io/docs/server-api/
 */

var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
/*
server.js调用了listen这个函数，这个函数主要启动了Socket.IO服务器，
限定了Socket.IO向控制台输出日志的详细程度，并确定了该如何处理每个接进来的连接。
*/
exports.listen = function(server) {
    //启动Socket.IO服务器
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {
        //当用户第一次连到聊天服务器上的时候，用户会被放到一个叫做Lobby的聊天室中，并分配一个昵称，以便不同的用户可以相互区分开
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        //在用户连接上来时，把他放入聊天室Lobby中
        joinRoom(socket, 'Lobby');
        handleMessageBroadcasting(socket, nickNames);
        //处理用户的消息，更名，以及聊天室的创建和变更
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        //用户发出请求的时候，向其提供已经被占用的聊天室的列表
        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.manager.rooms);
        });
        //定义用户断开连接后的清楚逻辑
        handleClientDisconnection(socket, nickNames, namesUsed);
    });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    //生成新的昵称
    var name = 'Guest' + guestNumber;
    //把用户昵称和客户端连接ID相关联
    nickNames[socket.id] = name;
    //让用户知道他们的昵称
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    //存放已经使用过的昵称
    namesUsed.push(name);
    //更新已经连接的用户的数量
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    //让用户进入房间
    socket.join(room);
    //记录当前用户的房间
    currentRoom[socket.id] = room;
    //告诉这次连入房间的用户，他已经连入了房间
    socket.emit('joinResult', {room: room});
    //广播给房间里面其他的用户知道有新的用户进入了房间了
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    var usersInRoom = io.sockets.clients(room);
    //如果不止一个用户在这个房间，汇总下都是谁
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        //将房间里面的其他用户汇总发送给这个刚连入的用户
        socket.emit('message', {text: usersInRoomSummary});
    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    //添加nameAttempt监听器
    socket.on('nameAttempt', function(name) {
        //用户自己定义的昵称不能以Guest开头
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            //如果昵称还没有注册就注册上
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                //删掉之前用了的昵称，让其他用户可以使用
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                //如果用户想要的昵称已经有人在用了，那么向客户端发送错误消息
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}
/*
处理用户发送过来的消息
* */
function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}
/*
 创建房间
 */
function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}
/*
 用户断开连接
 */
function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}
