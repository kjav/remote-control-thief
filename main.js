var app = require('express')();
// var events = require('events');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var users = []

http.listen(3000, function() {
    console.log('Listing on port 3000');
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/views/index.html');
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
});
