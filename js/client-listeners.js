socket.on('new message', function(messageData) {
    appendMessageToChatbox(messageData.username + ': ' + messageData.message);
});

socket.on('user connected', function(connectionData) {
    appendMessageToChatbox('A user has connected');
    updateNumberOfUsers(connectionData.currentNumberOfUsers);
});

socket.on('user disconnected', function(connectionData) {
    appendMessageToChatbox('A user has disconnected');
    updateNumberOfUsers(connectionData.currentNumberOfUsers);
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

socket.on('initial data sync', function(initialData) {
    updateNumberOfUsers(initialData.currentNumberOfUsers);

    videoQueue = initialData.currentPlaylist;
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
