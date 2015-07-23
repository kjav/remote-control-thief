var socket = io();
var videoQueue = [];

var player;

var isYouTubeIframeAPIReady = false;
var hasVideoQueueLoaded = false;

function onYouTubeIframeAPIReady() {
    isYouTubeIframeAPIReady = true;
    attemptToLoadFirstVideo();
}

function attemptToLoadFirstVideo() {
    if (isYouTubeIframeAPIReady && hasVideoQueueLoaded && isWatchSet) {
        player = new YT.Player('player', {
            height: '315',
            width: '560',
            playerVar: {
                'autoplay': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        requestToPlayVideo();
    }
    else if (event.data == YT.PlayerState.PAUSED) {
        requestToPauseVideo();
    }
    else if (event.data == YT.PlayerState.ENDED) {
        emitVideoEnded(videoQueue[0]);
        loadNextVideo();
    }
}

function onPlayerReady(event) {
    event.target.loadVideoById({
        videoId: videoQueue[0].id,
        startSeconds: videoQueue[0].timeIntoVideo
    });
}

function emitVideoEnded(videoData) {
    socket.emit('video ended', videoData);
}

$(document).ready(function() {
    $('#send-message-button').click(function() {
        var messageData = { username: $('#username').val(), message: $('#message-to-send').val() };
        socket.emit('send message', messageData);
    });

    $('#send-video-button').click(function() {
        var videoData = { id: $('#video-id-to-send').val() };
        socket.emit('add video', videoData);
    });

    $('#play-video-button').click(function() {
        requestToPlayVideo();
    });

    $('#pause-video-button').click(function() {
        requestToPauseVideo();
    });
});

socket.on('new message', function(messageData) {
    appendMessageToChatbox(messageData.username + ': ' + messageData.message);
});

socket.on('add video', function(videoData) {
    videoQueue.push(videoData);
    updatePlaylist();
});

socket.on('play video', function(playData) {
    appendMessageToChatbox(playData.username + ' has clicked to play the video.');

    if (isWatchSet) {
        player.playVideo();
    }
});

socket.on('pause video', function(playData) {
    appendMessageToChatbox(playData.username + ' has clicked to pause the video.');

    if (isWatchSet) {
        player.pauseVideo();
    }
});

socket.on('load video queue', function(videoQueueToLoad) {
    videoQueue = videoQueueToLoad;
    updatePlaylist();
    hasVideoQueueLoaded = true;
    attemptToLoadFirstVideo();
});

function loadNextVideo() {
    videoQueue.shift();

    if (isWatchSet) {
        newVideoData = videoQueue[0];
        player.loadVideoById(newVideoData.id);
    }

    updatePlaylist();
}

function requestToPlayVideo() {
    socket.emit('play video', { username: $('#username').val() });
}

function requestToPauseVideo() {
    socket.emit('pause video', { username: $('#username').val() });
}

function appendMessageToChatbox(message) {
    $('#chatbox').append('<p>' + message + '</p>');
    $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
}

function updatePlaylist() {
    $('#playlist').html('');
    $.each(videoQueue, function(key, video) {
        $('#playlist').append('<div class="playlist-item">' + video.snippet.title + '</div>');
    });
}
