var express = require('express');
var app = express();
var https = require('https');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var users = [];
var videos = [];
var apiKey = require('./api.json').api_key;

app.use(express.static(__dirname + '/public'));

loadDefaultVideo();

server.listen(3000, function() {
    console.log('Listing on port 3000');
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/views/index.html');
});

io.on('connection', function(socket) {
    console.log('A user has connected.');

    socket.emit('load video queue', videos);
    
    socket.on('disconnect', function() {
        console.log('A user has disconnected.');
    });

    socket.on('send message', function(messageData) {
        io.emit('new message', messageData);
    });

    socket.on('add video', function(videoData) {
        retrieveVideoInformation(videoData.id);
    });

    socket.on('play video', function(playData) {
        console.log(playData.username + ' has requested to play the video');
        io.emit('play video', playData);
    });

    socket.on('pause video', function(pauseData) {
        console.log(pauseData.username + ' has requested to pause the video');
        io.emit('pause video', pauseData);
    });

    socket.on('video ended', function(videoData) {
        if (videos[0].uniqueID == videoData.uniqueID) {
            videos.shift();
            console.log(videos.length);
        }
    });
});

function retrieveVideoInformation(videoID) {
    var options = {
        host: 'www.googleapis.com',
        path: '/youtube/v3/videos?part=snippet&id=' + videoID + '&key=' + apiKey
    }

    callback = function(response) {
        var str = '';

        response.on('data', function(chunk) {
            str += chunk;
        });

        response.on('end', function() {
            responseData = JSON.parse(str);
            addVideoAndEmit(responseData.items[0]);
        });
    }

    https.request(options, callback).end();
}

function addVideoAndEmit(videoData) {
    videoData.uniqueID = guid();
    videos.push(videoData);
    console.log('A video with name ' + videoData.snippet.title + ' has been submitted.');
    io.emit('add video', videoData);
}

function loadDefaultVideo() {
    defaultVideoData = retrieveVideoInformation('sjCw3-YTffo');
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
