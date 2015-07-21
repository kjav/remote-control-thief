            var socket = io();
            var videoQueue = [];

            var player;
            function onYouTubeIframeAPIReady() {
                player = new YT.Player('player', {
                    height: '315',
                    width: '560',
                    videoId: 'g7Lzr3cwaPs',
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange
                    }
                });
            }

            function onPlayerStateChange(event) {
                if (event.data == YT.PlayerState.PLAYING) {
                    requestToPlayVideo();
                }
                else if (event.data == YT.PlayerState.PAUSED) {
                    requestToPauseVideo();
                }
                else if (event.data == YT.PlayerState.ENDED) {
                    loadNextVideo();
                }
            }

            function onPlayerReady(event) {
                // event.target.playVideo();
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
                player.playVideo();
            });

            socket.on('pause video', function(playData) {
                appendMessageToChatbox(playData.username + ' has clicked to pause the video.');
                player.pauseVideo();
            });

            function loadNextVideo() {
                newVideoData = videoQueue.shift();
                alert(newVideoData.id);
                player.loadVideoById(newVideoData.id);
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
