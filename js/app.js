//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");
var startingTime=10;
var recordInterval;
//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);


function countDown()
{
    document.getElementById("indications").style.display="block";
    document.getElementById("countdown").innerHTML="Recording: "+startingTime+"s Remaining";
    startingTime-=1;
    if(startingTime==-1)
        {
            document.getElementById("record-panel").style.display="none";
            document.getElementById("processing").style.display="block";
            stopRecording();
            clearInterval(recordInterval);
        }
}

function startRecording() {
	console.log("recordButton clicked");

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

    

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();
        
        recordInterval=setInterval(countDown,1000);

		//update the format 
		

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);
        
        const analyser = audioContext.createAnalyser();
        input.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 32;

        let frequencyData = new Uint8Array(analyser.frequencyBinCount);
         //console.log(frequencyData);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	
	});
}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	console.log("stopButton clicked");

	

	
	
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {
	
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var currentdate = new Date(); 
var datetime = currentdate.getDate() + "_"
                + (currentdate.getMonth()+1)  + "_" 
                + currentdate.getFullYear() + "_"  
                + currentdate.getHours() + "_"  
                + currentdate.getMinutes() + "_" 
                + currentdate.getSeconds();
    
    filename=datetime+".wav";
   
	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename+".wav "))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	function uploadToServer(){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
		          console.log("Server returned: ",e.target.responseText);
                  document.getElementById("processing").style.display="none";
                  document.getElementById("result").style.display="block";
                  if(e.target.responseText=="normal")
                      {
                        document.getElementById("result-icon1").style.display="block";
                        document.getElementById("result-text").innerHTML="Your Heartbeat Seems Fine.";  
                      }
                  else if (e.target.responseText=="abnormal")
                      {
                        document.getElementById("result-icon2").style.display="block";
                          document.getElementById("result-text").innerHTML="You may have possibility of heart disease."; 
                      }
                  else{
                      alert(e.target.responseText)
                  }
                  
		      }
		  };
		  var fd=new FormData();
          fd.append("title",filename);
		  fd.append("file",blob, filename);
		  xhr.open("POST","https://heartbeat-classification-rest.herokuapp.com/api/analyseHeartbeat/",true);
          //alert(filename)
		  xhr.send(fd);
	}
	

    uploadToServer();
}