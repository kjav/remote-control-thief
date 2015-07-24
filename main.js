var express = require('express');
var app = express();
var expressHbs = require('express-handlebars');
var https = require('https');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var apiKey = require('./api.json').api_key;
var users = [];
var videos = [];
var timeAtWhichVideoWasMostRecentlyStarted;
var videoIsPaused = true;

app.engine('hbs', expressHbs({extname:'hbs'}));
app.set('view engine', 'hbs');
app.use(express.static(__dirname));

loadDefaultVideo();

server.listen(3000, function() {
    console.log('Listing on port 3000');
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/views/choose_mode.html');
});

app.get('/watch', function(req, res) {
    res.render('index', { watch: true, control: false });
});

app.get('/control', function(req, res) {
    res.render('index', { watch: false, control: true });
});

app.get('/watch/and/control', function(req, res) {
    res.render('index', { watch: true, control: true });
});

io.on('connection', function(socket) {
    console.log('A user has connected.');

    if (!videoIsPaused) {
        var currentTime = Math.floor(Date.now() / 1000);
        videos[0].timeIntoVideo += (currentTime - timeAtWhichVideoWasMostRecentlyStarted);
        timeAtWhichVideoWasMostRecentlyStarted = Math.floor(Date.now() / 1000);
    }
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
        if (videoIsPaused) {
            console.log(playData.username + ' has requested to play the video');
            videoIsPaused = false;
            timeAtWhichVideoWasMostRecentlyStarted = Math.floor(Date.now() / 1000);
            io.emit('play video', playData);
            console.log('A user has clicked to play the video at time ' + timeAtWhichVideoWasMostRecentlyStarted + ' at time ' + videos[0].timeIntoVideo + ' into the video');
        }
    });

    socket.on('pause video', function(pauseData) {
        if (!videoIsPaused) {
            console.log(pauseData.username + ' has requested to pause the video');
            var currentTime = Math.floor(Date.now() / 1000);
            videos[0].timeIntoVideo += (currentTime - timeAtWhichVideoWasMostRecentlyStarted);
            videoIsPaused = true;
            io.emit('pause video', pauseData);
            console.log('A user has clicked to pause the video at time ' + timeAtWhichVideoWasMostRecentlyStarted + ' at time ' + videos[0].timeIntoVideo + ' into the video');
        }
    });

    socket.on('video ended', function(videoData) {
        if (videos[0].uniqueID == videoData.uniqueID) {
            videos.shift();
            videoIsPaused = true;
            videos[0].timeIntoVideo = 0;

            io.emit('video ended', videoData);
        }
    });

    socket.on('search youtube', function(searchQuery) {
        var searchString = searchQuery.searchString;
        searchYoutubeForString(socket, searchString);
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
            var videoData = addVideoAndReturn(responseData.items[0]);
            emitVideo(videoData);
        });
    }

    https.request(options, callback).end();
}

function searchYoutubeForString(userSocket, searchString) {
    console.log('A user has requested to search YouTube for "' + searchString + '"');
    
    var options = {
        host: 'www.googleapis.com',
        path: '/youtube/v3/search?part=snippet&q=' + encodeURIComponent(searchString) + '&key=' + apiKey
    }

    callback = function(response) {
        var str = '';

        response.on('data', function(chunk) {
            str += chunk;
        });

        response.on('end', function() {
            responseData = JSON.parse(str);
            userSocket.emit('send search results', responseData.items);
        });
    }

    https.request(options, callback).end();
}

function addVideoAndReturn(videoData) {
    videoData.uniqueID = guid();
    videoData.timeIntoVideo = 0;
    videos.push(videoData);
    console.log('A video with name ' + videoData.snippet.title + ' has been submitted.');
    return videoData;
}

function emitVideo(videoData) {
    io.emit('add video', videoData);
}

function loadDefaultVideo() {
    retrieveVideoInformation('sjCw3-YTffo');
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
