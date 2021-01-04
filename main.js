var sendChannel = null;
var receiveChannel = null;

var sendType = '';



var Demo = (function () {
    var _audioTrack;
    var _videoTrack = null;
    var _screenTrack = null;

    var _mediaRecorder;
    var _recordedChunks = [];

    var connection = null;
    var _remoteStream = new MediaStream();

    var _localVideo;

    var _rtpSender;
    var name = '';



    /**creating socket object */
    function createSocketData(name) {
        console.log(name);
        try {
            ws = new EventSource('serverGet.php?name=' + name);
            console.log(ws);
        } catch (e) {
            console.error("Could not create eventSource ", e);
        }

        ws.send = function send(message) {

            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState != 4) {
                    return;
                }
                if (this.status != 200) {
                    console.log("Error sending to server with message: " + message);
                }
            };
            xhttp.open('POST', 'serverPost.php', true);
            xhttp.setRequestHeader("Content-Type", "Application/X-Www-Form-Urlencoded");
            xhttp.send(message);
        }

        ws.onmessage = function (e) {
            onsinglemessage(e.data);
        }
    }


    async function onsinglemessage(message) {
        message = JSON.parse(message);

        //if (message.rejected) {
        if (message.type === 'rejected') {
            alert('other user rejected');
        }
        //else if (message.answer) {
        else if (message.type === 'answer') {

            console.log('answer', message.data);
            console.log('type of .........', typeof message.data);
            console.log('offer .........', message.data);

            dataAnswer = message.data;

            dataAnswer = dataAnswer.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");

            console.log('after removiing new line', dataAnswer);

            dataAnswer = JSON.parse(dataAnswer);

            console.log(dataAnswer);
            await connection.setRemoteDescription(new RTCSessionDescription(dataAnswer));
        }
        //else if (message.offer) {
        else if (message.type === 'offer') {

            var r = true;

            if (!_audioTrack) {
                r = confirm('want to continue?');
                if (r) {
                    await startwithAudio();
                    if (_audioTrack) {
                        connection.addTrack(_audioTrack);
                    }
                }
                else {

                    // socket.emit('new_message1', JSON.stringify({ name: name, 'rejected': 'true' }));
                    //ws.send(JSON.stringify({ name: name, 'rejected': 'true' }));
                    publish(name, 'rejected', 'true');
                }
            }
            if (_audioTrack) {

                if (!connection) {
                    await _createConnection();
                }


                console.log('type of .........', typeof message.data);
                console.log('offer .........', message.data);

                dataoffer = message.data;

                dataoffer = dataoffer.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");

                console.log('after removiing new line', dataoffer);

                dataoffer = JSON.parse(dataoffer);

                console.log(dataoffer);


                await connection.setRemoteDescription(new RTCSessionDescription(dataoffer));
                var answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                publish(name, 'answer', answer);
            }
        }
        else if (message.type === 'iceCandidate') {

            if (!connection) {
                await _createConnection();
            }
            try {
                candidateData = JSON.parse(message.data);

                await connection.addIceCandidate({
                    candidate: candidateData.candidateData,
                    sdpMid: candidateData.sdpMid, // don't make it up, you get this in onicecandidate
                    sdpMLineIndex: candidateData.sdpMLineIndex // don't make it up, you get this in onicecandidate
                })
            } catch (e) {
                console.log(e);
            }
        }
    }

    function fetchJson(data) {
        int
    }


    async function _init() {

        getName();

        _localVideo = document.getElementById('videoCtr');


        /**Bind all event conroller */

        eventBinding();
    }


    function getName() {
        $('#frmName').on("submit", function (event) {
            event.preventDefault();
            $('#iName').attr("type", "hidden");
            name = $('#iName').val();
            $('#nameInput').hide();
            createSocketData(name);
        });

    }

    function eventBinding() {

        $("#btnMuteUnmute").on('click', function () {
            if (!_audioTrack) return;/**if still audio is null, simply return. 
                                    Otherwise control the audio track using event */

            if (_audioTrack.enabled == false) {
                _audioTrack.enabled = true;
                $(this).text("Mute");
            }
            else {
                _audioTrack.enabled = false;
                $(this).text("Unmute");
            }
            console.log(_audioTrack);
        });
        $("#btnStartReco").on('click', function () {
            setupMediaRecorder();/** call the recording function */
            _mediaRecorder.start(1000); /**get media stream in every one(1) second */
        });
        /**control the record events */
        $("#btnPauseReco").on('click', function () {
            _mediaRecorder.pause();
        });
        $("#btnResumeReco").on('click', function () {
            _mediaRecorder.resume();
        });
        $("#btnStopReco").on('click', function () {
            _mediaRecorder.stop();
        });

        /**control the video streams */

        $("#btnStartStopCam").on('click', async function () {

            if (_videoTrack) {
                _videoTrack.stop();
                _videoTrack = null;
                _localVideo.srcObject = null; /** reset the video object  */
                $("#btnStartStopCam").text("Start Camera");

                if (_rtpSender && connection) {
                    connection.removeTrack(_rtpSender); /**stop sending the streams */
                    _rtpSender = null;
                }

                return;
            }

            /**if video is not avaiable, get the media access. only audio !!!!  */
            try {
                var vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 200,
                        height: 200
                    },
                    audio: false
                });
                if (vstream && vstream.getVideoTracks().length > 0) { /**check video stream , and vidoe media available */
                    _videoTrack = vstream.getVideoTracks()[0]; /** get the media stream */
                    setLocalVideo(true);/** set stream to local video */
                    $("#btnStartStopCam").text("Stop Camera");
                }


            } catch (e) {
                console.log(e);
                return;
            }
        });

        $("#btnStartStopScreenshare").on('click', async function () {

            if (_screenTrack) {
                _screenTrack.stop(); /** stop current screen sharing */
                _screenTrack = null; /** clesr screenTrack and reset streams */
                _localVideo.srcObject = null;
                $(this).text("Screen Share");

                if (_rtpSender && connection) {
                    connection.removeTrack(_rtpSender); /** stop sharing screen */
                    _rtpSender = null;
                }
                return;
            }

            /** if screen sharing is not available, get the access */
            try {
                var sc_stream = await navigator.mediaDevices.getDisplayMedia({
                    audio: false,
                    video: {
                        frameRate: 1, /** take frame after one (1) second */
                    },
                });
                if (sc_stream && sc_stream.getVideoTracks().length > 0) {
                    _screenTrack = sc_stream.getVideoTracks()[0]; /**get the screen track */
                    setLocalVideo(false);
                    $(this).text("Stop Share");
                }

            } catch (e) {
                console.log(e);
                return;
            }
        });

        $("#startConnection").on('click', async function () {
            if (name === '') {
                getNameAlert();
                createSocketData(name);
            } else {
                await startwithAudio();
                await _createConnection();
            }
            //await _createOffer();
        });
    }

    function getNameAlert() {
        name = prompt("Please enter your name:", "");
        if (name == null || name == "") {
            getNameAlert();
        } else {
            console.log('got name', name);
            $('#nameInput').hide();
        }
    }

    /** switch the vedio strem to screen sharing and assign it to local  */
    function setLocalVideo(isVideo) {
        var currtrack;

        if (isVideo) {
            if (_screenTrack)
                $("#btnStartStopScreenshare").trigger('click');

            if (_videoTrack) {
                _localVideo.srcObject = new MediaStream([_videoTrack]);
                currtrack = _videoTrack;
            }

        }
        else {
            if (_videoTrack)
                $("#btnStartStopCam").trigger('click');

            if (_screenTrack) {
                _localVideo.srcObject = new MediaStream([_screenTrack]);
                currtrack = _screenTrack;
            }
        }

        if (_rtpSender && _rtpSender.track && currtrack && connection) {
            _rtpSender.replaceTrack(currtrack);
        }
        else {
            if (currtrack && connection)
                _rtpSender = connection.addTrack(currtrack);
        }
    }
    /** functiion to handle record system */
    function setupMediaRecorder() {

        var _width = 0;
        var _height = 0;

        if (_screenTrack) {
            _width = _screenTrack.getSettings().width;
            _height = _screenTrack.getSettings().height;
        }
        else if (_videoTrack) {
            _width = _videoTrack.getSettings().width;
            _height = _videoTrack.getSettings().height;
        }

        var merger = new VideoStreamMerger({
            width: _width,   // Width of the output video
            height: _height,  // Height of the output video
            audioContext: null,
        })

        if (_screenTrack && _screenTrack.readyState === "live") {
            // Add the screen capture.Position it to fill the whole stream (the default)
            merger.addStream(new MediaStream([_screenTrack]), {
                x: 0, // position of the topleft corner
                y: 0,
                mute: true /** ignore audio in screen share option */
            });

            if (_videoTrack && _videoTrack.readyState === "live") {
                merger.addStream(new MediaStream([_videoTrack]), {
                    x: 0, /** add video in left bottom */
                    y: merger.height - 100,
                    width: 100,
                    height: 100,
                    mute: true
                });
            }
        }
        else {
            if (_videoTrack && _videoTrack.readyState === "live") {

                merger.addStream(new MediaStream([_videoTrack]), {
                    x: 0,
                    y: 0,
                    width: _width,
                    height: _height,
                    mute: true
                });
            }
        }


        if (_audioTrack && _audioTrack.readyState === "live") {

            merger.addStream(new MediaStream([_audioTrack]), {
                mute: false
            });
        }

        /**Start the merging */
        merger.start()

        var stream = merger.result;
        var videoRecPlayer = document.getElementById('videoCtrRec');
        videoRecPlayer.srcObject = stream;
        videoRecPlayer.load();
        $(videoRecPlayer).show();

        stream.getTracks().forEach(track => {
            console.log(track);
        })

        _recordedChunks = [];
        _mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });
        _mediaRecorder.ondataavailable = (e) => {
            console.log(e.data.size);
            if (e.data.size > 0)
                _recordedChunks.push(e.data);
        };
        _mediaRecorder.onstart = async () => {
            console.log('onstart');
            $("#btnStartReco").hide();
            $("#btnPauseReco").show();
            $("#btnStopReco").show();
            $("#downloadRecording").hide();
        };
        _mediaRecorder.onpause = async () => {
            $("#btnPauseReco").hide();
            $("#btnResumeReco").show();
        };
        _mediaRecorder.onresume = async () => {
            $("#btnResumeReco").hide();
            $("#btnPauseReco").show();
            $("#btnStopReco").show();
        };

        _mediaRecorder.onstop = async () => {
            console.log('onstop');
            var blob = new Blob(_recordedChunks, { type: 'video/webm' });
            let url = window.URL.createObjectURL(blob);


            videoRecPlayer.srcObject = null;
            videoRecPlayer.load();
            videoRecPlayer.src = url;
            videoRecPlayer.play();
            $(videoRecPlayer).show();

            $("#downloadRecording").attr({ href: url, download: 'Ultra-X.webm' }).show();

            $("#btnStartReco").show();
            $("#btnPauseReco").hide();
            $("#btnStopReco").hide();


        };
    }

    /** start the connection with only audio  */

    async function startwithAudio() {

        try {
            var astream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

            _audioTrack = astream.getAudioTracks()[0];

            _audioTrack.onmute = function (e) {
                console.log(e);
            }
            _audioTrack.onunmute = function (e) {
                console.log(e);
            }

            _audioTrack.enabled = false; /** disable audio initially */

        } catch (e) {
            console.log(e);
            return;
        }
    }

    function publish(name, event, data) {
        console.log("sending ws.send: " + event);
        ws.send(JSON.stringify({
            name: name,
            event: event,
            data: data
        }));
    }



    async function _createConnection() {

        console.log('_createConnection', name);
        var configuration = {
            'iceServers': [{
                'urls': 'stun:stun.stunprotocol.org:3478'
            }
            ]
        };


        connection = new RTCPeerConnection(configuration);

        connection.onicecandidate = function (event) {
            console.log('onicecandidate', event.candidate);
            if (event.candidate) {
                //socket.emit('new_message1', JSON.stringify({ name: name, 'iceCandidate': event.candidate }));
                //ws.send(JSON.stringify({ name: name, 'iceCandidate': event.candidate }));
                publish(name, 'iceCandidate', event.candidate);
            }
        }
        connection.onicecandidateerror = function (event) {
            console.log('onicecandidateerror', event);

        }
        /**gather ICE */
        connection.onicegatheringstatechange = function (event) {
            console.log('onicegatheringstatechange', event);
        };
        /** offer ICE and negotiate offre for the connection */
        connection.onnegotiationneeded = async function (event) {
            await _createOffer();
        }
        connection.onconnectionstatechange = function (event) {
            console.log('onconnectionstatechange', connection.connectionState)
            if (connection.connectionState === "connected") {
                console.log('connected finally........')
            }
        }

        /** add remote media streams to the local   */
        connection.ontrack = function (event) {

            if (!_remoteStream)
                _remoteStream = new MediaStream();

            if (event.streams.length > 0) {

                //_remoteStream = event.streams[0];
            }

            if (event.track.kind == 'video') {
                _remoteStream.getVideoTracks().forEach(t => _remoteStream.removeTrack(t));
            }

            _remoteStream.addTrack(event.track);

            _remoteStream.getTracks().forEach(t => console.log(t));

            var newVideoElement = document.getElementById('remoteVideoCtr');


            newVideoElement.srcObject = null;
            newVideoElement.srcObject = _remoteStream;
            newVideoElement.load();
            //newVideoElement.play();
        };


        if (_videoTrack) {
            _rtpSender = connection.addTrack(_videoTrack);
        }

        if (_screenTrack) {
            _rtpSender = connection.addTrack(_screenTrack);
        }

        if (_audioTrack) {
            connection.addTrack(_audioTrack, _remoteStream);
        }

    }

    async function _createOffer() {


        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        console.log('offer to set', offer);
        console.log('localDescription', connection.localDescription);
        //Send offer to Server
        //socket.emit('new_message1', JSON.stringify({ name: name, 'offer': connection.localDescription }));
        //ws.send(JSON.stringify({ name: name, 'offer': connection.localDescription }));
        publish(name, 'offer', connection.localDescription);
    }

    return {
        init: async function () {
            await _init();
        }
    }
}());