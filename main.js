var express = require('express');
var app = express();
var expressHbs = require('express-handlebars');
var https = require('https');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var apiKey = require('./api.json').api_key;
var videos = [];
var timeAtWhichVideoWasMostRecentlyStarted;
var videoIsPaused = true;
var numberOfUsers = 0;

app.engine('hbs', expressHbs({extname:'hbs'}));
app.set('view engine', 'hbs');
app.use(express.static(__dirname));

loadDefaultVideo();

server.listen(3000, function() {
    console.log('Listing on port 3000');
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/register', function(req, res) {
    res.sendFile(__dirname + '/views/register.html');
});

app.get('/watch', function(req, res) {
    res.render('video-room', { watch: true, control: false });
});

app.get('/control', function(req, res) {
    res.render('video-room', { watch: false, control: true });
});

app.get('/watch/and/control', function(req, res) {
    res.render('video-room', { watch: true, control: true });
});

io.on('connection', function(socket) {
    console.log('A user has connected.');
    numberOfUsers++;

    io.emit('user connected', { currentNumberOfUsers: numberOfUsers });

    if (!videoIsPaused) {
        var currentTime = Math.floor(Date.now() / 1000);
        videos[0].timeIntoVideo += (currentTime - timeAtWhichVideoWasMostRecentlyStarted);
        timeAtWhichVideoWasMostRecentlyStarted = Math.floor(Date.now() / 1000);
    }

    socket.emit('initial data sync', { currentPlaylist: videos, currentNumberOfUsers: numberOfUsers });
    
    socket.on('disconnect', function() {
        console.log('A user has disconnected.');
        numberOfUsers--;
        io.emit('user disconnected', { currentNumberOfUsers: numberOfUsers });
    });

    socket.on('send message', function(messageData) {
        io.emit('new message', messageData);
    });

    socket.on('add video', function(videoData) {
        retrieveVideoInformation(socket, videoData.id);
    });

    socket.on('play video', function(playData) {
        if (videos.length > 0) {
            if (videoIsPaused) {
                console.log(playData.username + ' has requested to play the video');
                videoIsPaused = false;
                timeAtWhichVideoWasMostRecentlyStarted = Math.floor(Date.now() / 1000);
                io.emit('play video', playData);
                console.log('A user has clicked to play the video at time ' + timeAtWhichVideoWasMostRecentlyStarted + ' at time ' + videos[0].timeIntoVideo + ' into the video');
            }
        }
    });

    socket.on('pause video', function(pauseData) {
        if (videos.length > 0) {
            if (!videoIsPaused) {
                console.log(pauseData.username + ' has requested to pause the video');
                var currentTime = Math.floor(Date.now() / 1000);
                videos[0].timeIntoVideo += (currentTime - timeAtWhichVideoWasMostRecentlyStarted);
                videoIsPaused = true;
                io.emit('pause video', pauseData);
                console.log('A user has clicked to pause the video at time ' + timeAtWhichVideoWasMostRecentlyStarted + ' at time ' + videos[0].timeIntoVideo + ' into the video');
            }
        }
    });

    socket.on('video ended', function(videoData) {
        if (videos.length > 0) {
            if (videos[0].uniqueID == videoData.uniqueID) {
                videos.shift();
                videoIsPaused = true;

                if (videos.length > 0) {
                    videos[0].timeIntoVideo = 0;
                }

                io.emit('video ended', videoData);
            }
        }
        else {
            videoIsPaused = true;
        }
    });

    socket.on('search youtube', function(searchQuery) {
        var searchString = searchQuery.searchString;
        searchYoutubeForString(socket, searchString);
    });

    socket.on('vote to skip', function(voteData) {
        var videoUniqueID = voteData.uniqueID;
        var userUniqueID = voteData.userUniqueID;
        
        for (var i = 0; i < videos.length; i++) {
            if (videos[i].uniqueID == videoUniqueID) {
                var video = videos[i];
                addToSkipUsers(video, userUniqueID);

                if (video.skipUsers.length >= numberOfUsers / 2) {
                    console.log('The users have voted to skip ' + video.snippet.title);
                    io.emit('skip video', { videoID: videoUniqueID });
                    videos.splice(i, 1);
                }

                break;
            }
        }
    });
});

function addToSkipUsers(video, userID) {
    var isInSkipUsersAlready = false;

    for (var i = 0; i < video.skipUsers.length; i++) {
        if (video.skipUsers[i] == userID) {
            isInSkipUsersAlready = true;
            break;
        }
    }
    
    if (!isInSkipUsersAlready) {
        video.skipUsers.push(userID);
        io.emit('vote to skip', { videoID: video.uniqueID, newUserID: userID });
        console.log('A user has voted to skip ' + video.snippet.title);
    }
}

function retrieveVideoInformation(userSocket, videoID) {
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
            if (responseData.items.length >= 1) {
                var videoData = addVideoAndReturn(responseData.items[0]);
                emitVideo(videoData);
            }
            else {
                if (userSocket != null) {
                    userSocket.emit('failed add', { videoID: videoID });
                }
            }
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
    videoData.skipUsers = [];
    videos.push(videoData);
    console.log('A video with name ' + videoData.snippet.title + ' has been submitted.');
    return videoData;
}

function emitVideo(videoData) {
    io.emit('add video', videoData);
}

function loadDefaultVideo() {
    retrieveVideoInformation(null, 'sjCw3-YTffo');
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

function escape(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
