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

    if (videoQueue.length == 1) {
        loadVideo();
    }
});

socket.on('vote to skip', function(skipData) {
    for (var i = 0; i < videoQueue.length; i++) {
        if (skipData.videoID == videoQueue[i].uniqueID) {
            videoQueue[i].skipUsers.push(skipData.newUserID);
            updatePlaylist();
            break;
        }
    }
});

socket.on('skip video', function(skipData) {
    var videoID = skipData.videoID;

    for (var i = 0; i < videoQueue.length; i++) {
        if (videoID == videoQueue[i].uniqueID) {
            if (i == 0) {
                moveToNextVideo();
                loadVideo();
            }
            else {
                videoQueue.splice(i, 1);
            }
            break;
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
            moveToNextVideo();
            loadVideo();
        }
    }
});

socket.on('send search results', function(searchResults) {
    loadSearchResults(searchResults);
});

socket.on('failed add', function(failData) {
    appendMessageToChatbox('Unfortunately, there was an error adding the video with ID ' + failData.videoID + ' to the playlist. This is usually due to YouTube not allowing the video to be embedded.');
});
