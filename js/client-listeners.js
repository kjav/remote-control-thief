socket.on('new message', function(messageData) {
    appendMessageToChatbox(messageData.username + ': ' + messageData.message);
});

socket.on('add video', function(videoData) {
    videoQueue.push(videoData);
    updatePlaylist();
});

socket.on('skip video', function(skipData) {
    var videoID = skipData.videoID;

    for (var i = 0; i < videoQueue.length; i++) {
        if (videoID == videoQueue[i].uniqueID) {
            if (i == 0) {
                loadNextVideo();
            }
            else {
                videoQueue.splice(i, 1);
            }
        }
    }

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

socket.on('video ended', function(videoData) {
    if (!isWatchSet) {
        if (videoData.uniqueID == videoQueue[0].uniqueID) {
            loadNextVideo();
        }
    }
});

socket.on('send search results', function(searchResults) {
    loadSearchResults(searchResults);
});
