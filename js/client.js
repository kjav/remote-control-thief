var socket = io();
var videoQueue = [];

var player;

var uniqueID = guid();

var isYouTubeIframeAPIReady = false;
var hasVideoQueueLoaded = false;

var numberOfUsers = 0;

function onYouTubeIframeAPIReady() {
    isYouTubeIframeAPIReady = true;
    attemptToLoadFirstVideo();
}

function attemptToLoadFirstVideo() {
    if (isYouTubeIframeAPIReady && hasVideoQueueLoaded && isWatchSet) {
        player = new YT.Player('player', {
            height: '390',
            width: '640',
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
        moveToNextVideo();
        loadVideo();
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

        $('#message-to-send').val('');
        return false;
    });

    $('#send-video-id-button').click(function() {
        var videoData = { id: $('#video-id-to-send').val() };
        socket.emit('add video', videoData);

        return false;
    });

    $('#play-video-button').click(function() {
        requestToPlayVideo();
    });

    $('#pause-video-button').click(function() {
        requestToPauseVideo();
    });

    $('#search-youtube-button').click(function() {
        var searchQuery = { searchString: $('#search-query-to-send').val() };
        socket.emit('search youtube', searchQuery);

        return false;
    });

    $('#search-results').on('click', '.add-to-playlist-button', function(e) {
        var element = $(e.target);
        var videoData = { id: element.data('video-id') };
        socket.emit('add video', videoData);
    });

    $('#playlist').on('click', '.vote-to-skip-button', function(e) {
        var element = $(e.target);
        var skipData = { uniqueID: element.data('unique-id'), userUniqueID: uniqueID };
        socket.emit('vote to skip', skipData);
    });
});

function moveToNextVideo() {
    if (videoQueue.length > 0) {
        videoQueue.shift();
    }
}

function loadVideo() {
    if (videoQueue.length > 0) {
        if (isWatchSet) {
            newVideoData = videoQueue[0];
            player.loadVideoById(newVideoData.id);
        }
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

function loadSearchResults(searchResults) {
    $.get('/views/search-result.hbs', function(source) {
        $('#search-results').html('');

        var template = Handlebars.compile(source);

        $.each(searchResults, function(key, searchResult) {
            var context = { 
                title: searchResult.snippet.title,
                id: searchResult.id.videoId
            };
            var html = template(context);
            $('#search-results').append(html);
        });
    }, 'html');
}

function updatePlaylist() {
    $.get('/views/playlist-item.hbs', function(source) {
        $('#playlist').html('');

        var template = Handlebars.compile(source);

        $.each(videoQueue, function(key, video) {
            var context = { title: video.snippet.title, videoId: video.uniqueID, numberOfSkipUsers: video.skipUsers.length, totalNumberOfUsers: numberOfUsers };
            var html = template(context);
            $('#playlist').append(html);
        });
    });
}

function updateNumberOfUsers(updatedNumberOfUsers) {
    numberOfUsers = updatedNumberOfUsers;
    $('#number-of-users').html(numberOfUsers);
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

