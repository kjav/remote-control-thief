var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var users = []

app.use(express.static(__dirname + '/public'));

http.listen(3000, function() {
    console.log('Listing on port 3000');
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/views/index.html');
});

io.on('connection', function(socket) {
    console.log('A user has connected.');
    
    socket.on('disconnect', function() {
        console.log('A user has disconnected.');
    });

    socket.on('send message', function(messageData) {
        io.emit('new message', messageData);
    });

    socket.on('add video', function(videoData) {
        io.emit('add video', videoData);
    });

    socket.on('play video', function(playData) {
        console.log(playData.username + ' has requested to play the video');
        io.emit('play video', playData);
    });

    socket.on('pause video', function(pauseData) {
        console.log(pauseData.username + ' has requested to pause the video');
        io.emit('pause video', pauseData);
    });
});
