var recording_status = false;  //whether it is recording now or not
// fetching DOM references
var btnStartRecording = document.querySelector('#btn-start-recording');
var btnStopRecording  = document.querySelector('#btn-stop-recording');

var btnNext = document.querySelector('#btn-next');
var btnPrevious  = document.querySelector('#btn-previous');


//var videoElement  = document.querySelector('video');

//var progressBar = document.querySelector('#progress-bar');
var percentage = document.querySelector('#percentage');

var recorder;


var step_id = -1; //before the overview screen; 0: overview screen
var instruction_id = -1; //the id for the instruction step
var instruction_steps = [];

var startrecordingtime = -1;
var stepstarttime = -1;
var stependtime = -1;
var fileName = "";


function loadTaskFromXMLDoc(){
 var Connect = new XMLHttpRequest();
 Connect.open("GET", "./alarm-task-1.xml", false);
 Connect.setRequestHeader("content-Type","text/xml");
 Connect.send(null);

 var xmlDoc = Connect.responseXML;
 var title = xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue;
 instruction_steps.push(title);
 var steps = xmlDoc.getElementsByTagName("cmd");
 for (i = 0; i < steps.length; i++){
   instruction_steps.push(steps[i].childNodes[0].nodeValue)
 }
}

loadTaskFromXMLDoc();
console.log("instructions:", instruction_steps);

var sessions_data = []

// this function submits recorded blob to nodejs server
function postFiles() {
    var blob = recorder.getBlob();
    // getting unique identifier for the file name
    //var fileName = generateRandomString() + '.webm';
    var currentdate = new Date();
    var month = currentdate.getMonth() + 1;
    fileName = currentdate.getFullYear()+'_'+ month +"_" + currentdate.getDate() + "_" + currentdate.getHours() + "_" + currentdate.getMinutes() + "_" + currentdate.getSeconds() + "_" + currentdate.getMilliseconds() + '.mp4';

    var file = new File([blob], fileName, {
        type: 'video/mp4'
    });
    //console.info('fileName', fileName);
    //console.info('fileName2:', file)

    //videoElement.src = '';
    //videoElement.poster = '/ajax-loader.gif';
    xhr('/uploadFile', file, function(responseText) {
        var fileURL = JSON.parse(responseText).fileURL;
        console.info('fileURL', fileURL);

        //videoElement.src = fileURL;
        //videoElement.play();
        //videoElement.muted = false;
        //videoElement.controls = true;
    });

    if(mediaStream) mediaStream.stop();

    postMetaFile();
}


function postMetaFile(){
  ux_data={"videofile": fileName,"data": sessions_data}
  var jsonData = JSON.stringify(ux_data);

  var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
  xmlhttp.open("POST", "/uploadMetaFile");
  xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xmlhttp.send(jsonData);
}


// XHR2/FormData
function xhr(url, data, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
        }
    };

    request.upload.onprogress = function(event) {
        //progressBar.max = event.total;
        //progressBar.value = event.loaded;
        //progressBar.innerHTML = 'Upload Progress ' + Math.round(event.loaded / event.total * 100) + "%";
    };

    request.upload.onload = function() {
        //percentage.style.display = 'none';
        //progressBar.style.display = 'none';
    };

    request.open('POST', url);
    var formData = new FormData();
    formData.append('file', data);
    request.send(formData);
}


var mediaStream = null;
// reusable getUserMedia
function captureUserMedia(success_callback) {
    var session = {
        audio: true,
        video: true
    };

    navigator.getUserMedia(session, success_callback, function(error) {
        alert('Unable to capture your camera. Please check console logs.');
        console.error(error);
    });
}


// UI events handling
btnStartRecording.onclick = function() {
  btnNext.disabled = false;
  btnStopRecording.disabled = false;
};

btnStopRecording.onclick = function() {
  //send the meta data to the server
  if (recording_status == true)
  {
    recorder.stopRecording(postFiles);
    recording_status = false;
  }

};

window.onbeforeunload = function() {
    recording_status = false;
};


// UI events handling
btnNext.onclick = function() {
    step_id ++;
    instruction_id ++;
    if(instruction_id <= instruction_steps.length-1)
    {
      if(instruction_id > 0)
        btnPrevious.disabled = false;
      //instruction_d == 0 means that the overview of the instruction steps.
      document.getElementById('instructions').innerHTML = instruction_steps[instruction_id];

      if (recording_status == true)
      {
        //terminate the current recording and upload the file
        var d = new Date();
        currenttime = d.getTime();
        stependtime = currenttime - startrecordingtime;

        //record the data into the data file
        var session_data = {"step_id": step_id-1, "instruction_id": instruction_id-1, "starttime": stepstarttime, "endtime": stependtime}
        sessions_data[sessions_data.length] = session_data

        stepstarttime = stependtime;
      }
      else
      {
        captureUserMedia(function(stream) {
            mediaStream = stream;
            var options = {
              recorderType: MediaStreamRecorder,
              mimeType: 'video/mp4\;codecs=vp9'
            };
            recorder = RecordRTC(stream, options);
            recorder.startRecording();
            recording_status = true;
            var d = new Date();
            startrecordingtime = d.getTime();
            stepstarttime = 0;
        });
      }
    }
    else {
      document.getElementById('instructions').innerHTML = instruction_steps[instruction_id-1];
      if (recording_status == true)
      {
        //terminate the current recording and upload the file
        var d = new Date();
        currenttime = d.getTime();
        stependtime = currenttime - startrecordingtime;

        //record the data into the data file
        var session_data = {"step_id": step_id-1, "instruction_id": instruction_id, "starttime": stepstarttime, "endtime": stependtime}
        sessions_data[sessions_data.length] = session_data

        stepstarttime = stependtime;
      }
      btnNext.disabled = true;
    }
};

btnPrevious.onclick = function() {
    step_id ++;
    if(instruction_id > 0)
    {
      instruction_id --;
      document.getElementById('instructions').innerHTML = instruction_steps[instruction_id];

      if (recording_status == true)
      {
        //terminate the current recording and upload the file
        var d = new Date();
        currenttime = d.getTime();
        stependtime = currenttime - startrecordingtime;

        //record the data into the data file
        var session_data = {"step_id": step_id-1, "instruction_id": instruction_id-1, "starttime": stepstarttime, "endtime": stependtime}
        sessions_data[sessions_data.length] = session_data

        stepstarttime = stependtime;
      }
    }
    else {
      btnPrevious.disabled = false;
    }
};
