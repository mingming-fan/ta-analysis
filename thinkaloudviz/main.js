var silenceBubbleText = ["","","silence"];

var mAudio = null;
AmCharts.useUTC = true;
var mChart = null;
var audioDuration;

var note_array = [];

var participants_files = [];

var task_data;

var timeline_start, timeline_end;

var loudnessData, pitchData, allData, transcriptData, silenceData,
silenceDataList, sentimentData, disSentimentData, speechRateData, rawCategoryData, verbalFillerData;

var silenceColor = randomColor({luminosity: 'dark'});
var fillerColor = randomColor({luminosity: 'dark'});

var silenceLength = 0;

var segmentPlayStart;
var logAudio = [];

window.onload = function(){
  Tipped.create('.legend-label')

  $.get('./participant_file.json', function (files) {
    participants_files = files;
    participants = _.map(files,'id');
    _.each(participants, function(participant) {
      $('#participant_sel').append("<option value="+ participant +">" + participant + "</option>");
    });
    $("#participant_sel").val("");
  });

  $('#participant_sel').on('change', function() {
    $('#task_sel').empty();

    let participant = $('#participant_sel').val();
    let tasks = _.find(participants_files, {'id': parseInt(participant)}).tasks;
    _.each(tasks, function (task) {
      $('#task_sel').append("<option value="+ task.id +">" + task.id + "</option>");
    });
    $("#task_sel").val("");
  });

  $('#task_sel').on('change', function () {
    let participant = $('#participant_sel').val();
    let task = $('#task_sel').val();

    task_data = _.find(_.find(participants_files, {'id': parseInt(participant)}).tasks, {'id': parseInt(task)});
    loadTaskData(task_data);
  });

  $('#addNote').on('click', function () {
    let note = {}

    note.startTime = $('#start').val();
    note.endTime = $('#end').val();

    let checked = $('.featureCheckbox:checked')

    note.features = []

    $.each(checked, function(index) {
      note.features.push($($('.featureCheckbox:checked')[index]).val());
    });

    note.width = ((note.endTime - note.startTime)/audioDuration) * 100 + '%';
    note.start = (note.startTime/audioDuration) * 100 + '%';

    note.color = randomColor();
    note.annotation = $('#annotation').val();
    note.prob = $('#probDescription').val();

    let timestamp = new Date().valueOf();;

    note.id = timestamp;

    note_array.push(note);

    $('#notes_timeline').append("<span class='timeline-element note_" + note.id +"' style='"+
    "width:" + note.width +';left:' + note.start + ';background-color:' + note.color
    + "'></span>")

    $('#note-table').append(
      "<tr class=note_"+ note.id + "><td>" + note.startTime + '</td>' +
      "<td>" + note.endTime + '</td>' +
      "<td>" + note.features.join() + '</td>' +
      "<td>" + note.prob + '</td>' +
      "<td>" + note.annotation + '</td>' +
      "<td><i class='fa fa-trash-o delete-note' aria-hidden='true'></i></tr>"
    )

    $('.note_' + note.id + '> td > i').on('click', function() {
      $('.note_' + note.id).remove();
      _.remove(note_array, function (n) {
        return n.id == note.id;
      });
    });

    $('span.note_' + note.id).mouseover(function() {
      $('tr.note_' + note.id).css({'background-color': 'yellow'});
    });

    $('span.note_' + note.id).mouseout(function() {
      $('tr.note_' + note.id).css({'background-color': ''});
    });

    $('#start').val("");
    $('#end').val("");
    $('#annotation').val("");
    $('#probDescription').val("");
    $(".featureCheckbox").prop("checked", false);
  });

  $("#labels_timeline").on('click', function (event){
    let width = $(this).width();
    let x_pos = event.pageX - $("#labels_timeline").parent().offset().left;

    let time = (x_pos/width) * (timeline_end - timeline_start) + timeline_start;

    mAudio.currentTime = time;

    var currentDate = new Date(Math.floor(time*1000));
    for(var x in mChart.panels){
      mChart.panels[x].chartCursor.showCursorAt(currentDate);
    }
    mChart.validateData();
  });

  $('#silence_timeline').mousemove(function (ev) {
    let width = $(this).width();
    let x_pos = event.pageX - $("#labels_timeline").parent().offset().left;

    let time = ((x_pos/width) * (timeline_end - timeline_start) + timeline_start) * 1000;
    // console.log(time);
    updateTranscript(time);
  });

  $('#confirmFiles').on('click', function (ev) {
    // ev.preventDefault();
    $('.participant-selection').addClass('hidden');
  });

  $.key('ctrl+shift+s', function() {
    let audioLog = JSON.stringify(logAudio);
    let jsonData = JSON.stringify(note_array);

    let participant = $('#participant_sel').val();
    let task = $('#task_sel').val();

    let filename = 'uxproblem_' + participant + '_' + task + '_' + Date.now() + '.json'
    let audioFile = 'audioLog_' + participant + '_' + task + '_' + Date.now() + '.json'

    download(jsonData, filename, 'text/plain');
    download(audioLog, audioFile, 'text/plain');
  });

  setTranscriptSelectionEventListener();
};

function download(text, name, type) {
    var a = document.createElement("a");
    var file = new Blob([text], {type: type});
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
}

function loadTaskData () {  //load the audio when the UI is displayed
  mAudio = document.getElementById("audiocontrol");
  mAudio.src = task_data.audio;
  mAudio.addEventListener('loadedmetadata', processAudio);
  mAudio.addEventListener('play', recordStart);
  mAudio.addEventListener('pause', recordEnd);
  //check audio's loading status. if it is not ready, load it again
  if (mAudio.readyState >= 2) {
    processAudio();
  }

  //console.log("loading loudness data...")
  loudnessData = loadChartData(task_data.loudness);
  //console.log("loading pitch data...")
  pitchData = loadChartData(task_data.pitch);
  allData = loadSilenceData(task_data.transcript);
  transcriptData = allData[0];
  silenceData = allData[1];
  silenceDataList = allData[2];
  sentimentData = loadSentimentData(task_data.sentiment);
  disSentimentData = loadDiscreteSentimentData(task_data.sentiment);
  speechRateData = loadSpeechRateData(task_data.speechrate)

  setTimeout(myTimer, 500);
  function myTimer() {
    if( pitchData.length != 0 && pitchData.length != 0)
    {
      console.log("data is ready");
      mChart = drawCharts();
      drawTranscript();
      drawSilenceTimeline();
      //drawTranscript2();
    }
    else {
      setTimeout(myTimer, 500);
    }
  }

};

function recordStart(){
  segmentPlayStart= mAudio.currentTime;
}

function recordEnd() {
  let segment = [segmentPlayStart, mAudio.currentTime];
  logAudio.push(segment);
}

function processAudio() {
  audioDuration = mAudio.duration;
  //console.log(mAudio.duration);
  timeline_start = 0;
  timeline_end = audioDuration;
  loadRawCategoryData(task_data.category);
  loadVerbalFillerData(task_data.filler);

  drawSilenceTimeline();
}

//load the data from the external sources
function loadChartData(dataset_url) {
  var chartData = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    //console.log(pitchData); // this will output an array
    for(var i = 0; i < inputdata.length; i++){
      //var seconds = parseInt(Math.floor(parseFloat(inputdata[i].time)));
      //var millseconds = parseInt(parseFloat(inputdata[i].time) * 1000 - seconds * 1000);
      var millseconds = parseInt(parseFloat(inputdata[i].time) * 1000);
      //console.log("seconds: " + seconds + "; milliseconds: " + millseconds);
      //console.log("converted date info: " + newDate);
      var value = parseFloat(inputdata[i].data);
      //console.log("time: " + millseconds + "; data: " + value);
      //chartData.push({"time": newDate, "data":value});
      chartData.push({"time": millseconds, "data":value, "legendColor": AmCharts.randomColor, "label": "undefined"});
    }
  });
  return  chartData;
}


function loadSilenceData(dataset_url) {
  var chartData = [];
  var chartDataSampled = [];
  var ist = [];
  silenceDataList = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    for(var i = 0; i < inputdata.length; i++){
      var start = parseInt(parseFloat(inputdata[i].start) * 1000);
      var end = parseInt(parseFloat(inputdata[i].end) * 1000);
      var value = inputdata[i].word;
      //console.log("value: " + String(value).trim());
      //var diff = end - start;
      //console.log("diff: " + diff);
      //if( String(value).trim().localeCompare("sp") == 0 && end - start > 1000)
      //longer than 1 seconds
      chartData.push({"start": start, "end": end, "label": String(value).trim()});

      if( String(value).trim().localeCompare("sp") === 0)
      {
        //console.log("time: " + millseconds + "; data: " + value);
        //chartData.push({"time": startDate, "data":1});
        //chartData.push({"time": endDate, "word":1});
        //sample some data points between start and end
        silenceDataList.push({
          start_time: start/1000,
          end_time: end/1000
        });
        for (var j = 0; j < end-start; j+=50){
          chartDataSampled.push({"time": start+j, "data":2, "duration": end-start, "legendColor": AmCharts.randomColor, "label": String(value).trim()});
          //chartData.push({"time": end-1, "data":1, "duration": end-start, "color": undefined, "label": "undefined"});
        }
      }
      else {
        //chartData.push({"time": startDate, "data":0});
        //chartData.push({"time": endDate, "word":0});
        for (var j = 0; j < end-start; j+=50){
          chartDataSampled.push({"time": start+j, "data":1, "duration": end-start, "legendColor": AmCharts.randomColor, "label": String(value).trim()});
          //chartData.push({"time": end-1, "data":0, "duration": end-start, "color": undefined, "label": "undefined"});
        }
      }
    }
  });
  return  [chartData, chartDataSampled, silenceDataList];
}

//whether to discrete the sentiment into just three classes: positive, neutral, negative
var threshold_sentiment = false;

function loadSentimentData(dataset_url) {
  var chartData = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    //create some samples between start and end time and add to the chart
    for(var i = 0; i < inputdata.length; i++){
      var start = parseInt(parseFloat(inputdata[i].start) * 1000);
      var end = parseInt(parseFloat(inputdata[i].end) * 1000);
      if(threshold_sentiment){
        var sentiment = 0;
        if(parseFloat(inputdata[i].data) >= 0.75){
          sentiment = 1;
        }
        else if(parseFloat(inputdata[i].data <= -0.1)){
          sentiment = -1
        }

        for(var j = 0; j < end-start; j+=50){
          chartData.push({"time": start+j, "data": sentiment, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": start, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": end-1, "data":inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
        }
      }
      else{
        /*
        for(var j = 0; j < end-start; j+=50){
          chartData.push({"time": start+j, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": start, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": end-1, "data":inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
        }
        */

        chartData.push({"time": start, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
        chartData.push({"time": end-1, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
      }

    }
  });
  return  chartData;
}

function loadDiscreteSentimentData(dataset_url) {
  var chartData = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    //create some samples between start and end time and add to the chart
    for(var i = 0; i < inputdata.length; i++){
      var start = parseInt(parseFloat(inputdata[i].start) * 1000);
      var end = parseInt(parseFloat(inputdata[i].end) * 1000);
      var sentiment = "neutral";
      if(parseFloat(inputdata[i].data) >= 0.75){
        sentiment = "positive";
      }
      else if(parseFloat(inputdata[i].data) <= -0.05){
        sentiment = "negative";
      }

      chartData.push({"start": start, "end": end, "data": sentiment,  "rawdata": inputdata[i].data});
    }
  });
  return  chartData;
}

//load the script data with words and their start and end time
function loadAlignedTranscriptData(dataset_url) {
  var chartData = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    for(var i = 0; i < inputdata.length; i++){
      //var seconds = parseInt(Math.floor(parseFloat(inputdata[i].time)));
      //var millseconds = parseInt(parseFloat(inputdata[i].time) * 1000 - seconds * 1000);
      var start = parseInt(parseFloat(inputdata[i].start) * 1000);
      //console.log("seconds: " + seconds + "; milliseconds: " + millseconds);

      var end = parseInt(parseFloat(inputdata[i].end) * 1000);
      //console.log("seconds: " + seconds + "; milliseconds: " + millseconds);

      var value = inputdata[i].word;
      //console.log("time: " + millseconds + "; data: " + value);
      chartData.push({"start": start, "end": end, "word":value, "legendColor": AmCharts.randomColor, "label": "undefined"});
    }
  });
  return  chartData;
}

function loadCategoryData(dataset_url) {
  var chartData = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    for(var i = 0; i < inputdata.length; i++){
      var start = parseInt(parseFloat(inputdata[i].start_time) * 1000);
      var end = parseInt(parseFloat(inputdata[i].end_time) * 1000);
      //console.log("startTime:" + start + " , endTime: " + end);
      var label = inputdata[i].label;
      //console.log("label: " + String(label).trim());
      var color = "#FF0F00";
      var data = -1;
      switch(String(label).trim()){
        case "Reading":
        data = 1;
        color = "#3498DB";
        break;
        case "Procedure":
        data = 2;
        color = "#1ABC9C";
        break;
        case "Observation":
        data = 3;
        color = "#F1C40F";
        break;
        case "Explanation":
        data = 4;
        color = "#D35400";
        break;
        default:
        break;
      }

      chartData.push({"time": start, "data":data, "legendColor": color, "label": String(label).trim()});
      chartData.push({"time": end, "data":data, "legendColor": color, "label": String(label).trim()});
    }
  });
  return chartData;
}

function loadRawCategoryData (dataset_url) {
  $.getJSON(dataset_url, function (data) {
    //console.log(audioDuration, data);
    rawCategoryData = data;
    drawCategoryData();
  });
}

function drawCategoryData () {
  $('#labels_timeline').empty();
  var label_color = {
    Reading: '#0275d8',
    Procedure: '#5cb85c',
    Observation: '#f0ad4e',
    Explanation: '#d9534f'
  }

  let duration = timeline_end - timeline_start;

  _.each(rawCategoryData, function (label) {
    let end = ((label.end_time - timeline_start)/duration) * 100;
    let start = ((label.start_time - timeline_start)/duration) * 100;
    if (Math.max(start, 0) < Math.min(100, end)) {
      start = Math.max(0, start);
      let width = Math.min(100, end) - start;
      label.start = start + '%';
      label.width = width + '%';
      $('#labels_timeline').append("<span class='timeline-element' style='"+
      "width:" + label.width +';left:' + label.start + ';background-color:' + label_color[label.label]
      + "' title="+ label.note+" value=" + label.start_time + "></span>")
    }
  });
  //console.log(data);

  Tipped.create('.timeline-element');


  $(".timeline-element").on('dblclick', function (event){
    let time = $(this).attr('value');

    mAudio.currentTime = time;

    mAudio.play();
  });

}

function drawVerbalFillerData () {
  $('#filler_timeline').empty();

  let total_duration = timeline_end - timeline_start;
  _.each(verbalFillerData, function (filler) {
    let end = ((filler.end_time - timeline_start)/total_duration) * 100;
    let start = ((filler.start_time - timeline_start)/total_duration) * 100;
    if (Math.max(start, 0) < Math.min(100, end)) {
      start = Math.max(0, start);
      let width = Math.min(100, end) - start;
      filler.start = start + '%';
      filler.width = width + '%';
      $('#filler_timeline').append("<span class='timeline-element' style='width:"
      + filler.width +';left:' + filler.start + ';background-color:' + fillerColor +
      "'></span>")
    }
  });
}


function loadVerbalFillerData (dataset_url) {
  $.getJSON(dataset_url, function (data) {
    verbalFillerData = data;

    drawVerbalFillerData();
  });
}

function loadSpeechRateData(dataset_url) {
  var chartData = [];
  AmCharts.loadFile(dataset_url, {}, function(data) {
    inputdata = AmCharts.parseJSON(data);
    //create some samples between start and end time and add to the chart
    for(var i = 0; i < inputdata.length; i++){
      var start = parseInt(parseFloat(inputdata[i].start) * 1000);
      var end = parseInt(parseFloat(inputdata[i].end) * 1000);
      var rate = parseFloat(inputdata[i].rate);
      chartData.push({"time": start, "data": rate, "duration": end-start});
      }
    });
  return  chartData;
}

function drawSilenceTimeline(length) {
  $('#silence_timeline').empty();

  if (length) {
    silenceLength = parseInt(length);
  }

  let total_duration = timeline_end - timeline_start;
  _.each(silenceDataList, function (silence) {
    let duration = silence.end_time - silence.start_time;
    let end = ((silence.end_time - timeline_start)/total_duration) * 100;
    let start = ((silence.start_time - timeline_start)/total_duration) * 100;
    if (Math.max(start, 0) < Math.min(100, end) && duration > silenceLength) {
      start = Math.max(0, start);
      let width = Math.min(100, end) - start;
      silence.start = start + '%';
      silence.width = width + '%';
      $('#silence_timeline').append("<span class='timeline-element' style='"+
      "width:" + silence.width +';left:' + silence.start + ';background-color:' + silenceColor
      + "'></span>")
    }
  });
}

//console.log("after checking if the data is ready");
function drawCharts(){
  var chart = null;
  chart = AmCharts.makeChart("chartdiv", {
    type: "stock",
    "theme": "light",
    dataSets: [{
      fieldMappings: [{
        fromField: "data",
        toField: "data5"
      },
      {
        fromField: "label",
        toField: "label5"
      },
      {
        fromField: "legendColor",
        toField: "legendColor"
      }
    ],
    dataProvider: sentimentData,
    categoryField: "time",
    compared: false
    },
    {
      fieldMappings: [{
        fromField: "data",
        toField: "data6"
      }
    ],
    dataProvider: speechRateData,
    categoryField: "time",
    compared: true
  },
  {
      fieldMappings: [{
        fromField: "data",
        toField: "data1"
      },
      {
        fromField: "label",
        toField: "label1"
      },
      {
        fromField: "legendColor",
        toField: "legendColor"
      }
    ],
    dataProvider: loudnessData,
    categoryField: "time",
    compared: true
  },
  {
    fieldMappings: [{
      fromField: "data",
      toField: "data2"
    },
    {
      fromField: "label",
      toField: "label2"
    },
    {
      fromField: "legendColor",
      toField: "legendColor"
    }
  ],
  dataProvider: pitchData,
  categoryField: "time",
  compared: true
}
],
panels: [
{
  showCategoryAxis: false,
  title: "Sentiment",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g5",
    compareGraphType:"smoothedLine",
    valueField: "data5",
    compareField: "data5",
    comparable: false,
  } ],
  stockLegend: {
    enabled: true,
    markType: "none",
    markSize: 0
  },
  listeners:[{
    event: "changed",
    method: handleMousemove,
  }],
},
{
  showCategoryAxis: false,
  title: "speech rate (words/min)",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g6",
    compareGraphType:"smoothedLine",
    valueField: "data6",
    compareField: "data6",
    comparable: true,
    visibleInLegend: true,
  } ],
  stockLegend: {
    enabled: true,
    markType: "none",
    markSize: 0
  },
  listeners:[{
    event: "changed",
    method: handleMousemove,
  }],
},
{
  showCategoryAxis: false,
  title: "Loudness (dB)",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g1",
    type:"smoothedLine",
    valueField: "data1",
    comparable: true,
    compareField: "data1",
  } ],
  stockLegend: {
    enabled: true,
    markType: "none",
    markSize: 0
  },
  listeners:[{
    event: "changed",
    method: handleMousemove,
  },{
    event: "zoomed",
    method: handleZoom
  }],
},
{
  showCategoryAxis: true,
  title: "Pitch (HZ)",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g2",
    compareGraphType:"smoothedLine",
    valueField: "data2",
    compareField: "data2",
    comparable: true,
  } ],
  stockLegend: {
    enabled: true,
    markType: "none",
    markSize: 0
  },
  listeners:[{
    event: "changed",
    method: handleMousemove,
  }],
}
],
valueAxesSettings:{
  labelsEnabled: false,
},
categoryAxesSettings: {
  groupToPeriods: [ 'fff', 'ss' ], // specify period grouping
  parseDates: true,
  autoGridCount: false,
  dateFormats: [{
    period: "fff",
    format: "JJ:NN:SS"
  }, {
    period: "ss",
    format: "JJ:NN:SS"
  }, {
    period: "mm",
    format: "JJ:NN:SS"
  }, {
    period: "hh",
    format: "JJ:NN:SS"
  }, {
    period: "DD",
    format: "MMM DD"
  }, {
    period: "WW",
    format: "MMM DD"
  }, {
    period: "MM",
    format: "MMM"
  }, {
    period: "YYYY",
    format: "YYYY"
  }],
  //"equalSpacing": true,
  minPeriod: "fff"
},
chartScrollbarSettings: {
  enabled: true,
  graph: "g1",
  usePeriod: "fff",
  position: "top",
  dragIcon: "dragIconRectSmall",
  selectedGraphLineColor:"#888888",
},
chartCursor:{
  categoryBalloonDateFormat: "JJ:NN:SS",
},
chartCursorSettings: {
  valueBalloonsEnabled: true,
  fullWidth:false,
  cursorAlpha:0.6,
  selectWithoutZooming: true
},
legend:{
  enabled:false
}
,
periodSelector: {
  labelStyle: 'hidden',
  position: "top",
  dateFormat: "JJ:NN:SS", // date format with milliseconds "NN:SS:QQQ"
  inputFieldsEnabled: false,
  inputFieldWidth: 100,
  periods: [{
    period: "MAX",
    label: "Show all",
    selected: true
  } ]
}
});
return chart;
}

function drawTranscript(){
  // three data fields: start, end, label
  //chartData.push({"time": start, "end": end, "data": sentiment,  "rawdata": inputdata[i].data});
  var transcript = "";
  for(var i in transcriptData){
    var value = transcriptData[i].label;
    var start = parseFloat(transcriptData[i].start);
    var end = parseFloat(transcriptData[i].end);
    var sentiment = "neutral";

    //check the sentiment of the word
    for(var j in disSentimentData){
      var senti_start = parseFloat(disSentimentData[j].start);
      var senti_end = parseFloat(disSentimentData[j].end);
      if(start >= senti_start && end <= senti_end){
        sentiment = disSentimentData[j].data;
        //console.log("sentiment: " + sentiment);
        break;
      }
    }

    if(String(value).trim().localeCompare("sp") != 0){
      transcript += "<span class='" + sentiment + "'>" + String(value).trim() + " " + "</span>";
    }
  }
  var x = document.getElementById("transcriptdiv");
  x.innerHTML = transcript;
}


function drawTranscript2(){
  // three data fields: start, end, label
  //chartData.push({"time": start, "end": end, "data": sentiment,  "rawdata": inputdata[i].data});
  var transcript = "";
  var value = "";
  var start = 0;
  var end = 0;
  var sentiment = "neutral";
  for(var i = 0; i < transcriptData.length-1; i++){
    //read in two at a time
    //the first one is the word and the second one is the gap between two words, the so called "sp"
    value = transcriptData[i].label;
    start = parseFloat(transcriptData[i].start);
    end = parseFloat(transcriptData[i].end);
    sentiment = "neutral";
    var next_value = transcriptData[i+1].label;
    if(String(next_value).trim().localeCompare("sp") === 0){
      i = i + 1;
      end = parseFloat(transcriptData[i].end);
    }

    //check the sentiment of the word
    for(var j in disSentimentData){
      var senti_start = parseFloat(disSentimentData[j].start);
      var senti_end = parseFloat(disSentimentData[j].end);
      if(start >= senti_start && end <= senti_end){
        sentiment = disSentimentData[j].data;
        //console.log("sentiment: " + sentiment);
        break;
      }
    }

    if(String(value).trim().localeCompare("sp") != 0){
      transcript += "<span class='" + sentiment + "'>" + String(value).trim() + " " + "</span>";
    }
  }

  var x = document.getElementById("transcriptdiv");
  x.innerHTML = transcript;
}

//this function is to get the selected text and past it into the analysis note textarea as a quote.
function setTranscriptSelectionEventListener()
{
  var transcript = document.getElementById('transcriptdiv');
  var writtenNote = document.getElementById('annotation');

  transcript.addEventListener('mouseup', function(){
     //console.log("selection test...");
     var text = "";
     if (window.getSelection) {
         text = window.getSelection().toString();
         console.log(text);
     } else if (document.selection && document.selection.type != "Control") {
         text = document.selection.createRange().text;
     }
     writtenNote.value = writtenNote.value + "  \"" + text + "\"\n";
    }, false);
}

//synchronize the mouse cursor with the transcript
function handleMousemove(e){
  //finally get the timestamp information: it is hided really deeply...
  //console.log(e.chart.chartCursor.timestamp);
  var timestamp = parseFloat(e.chart.chartCursor.timestamp);
  updateTranscript(timestamp);
  //updateTranscript2(timestamp);
}

//this function is to sync the transcript with the viz panels when the mouse moves over the viz panels
function updateTranscript(currentTimeInMS){
  var transcript = "";

  for(var i in transcriptData){
    var value = transcriptData[i].label;
    var start = parseFloat(transcriptData[i].start);
    var end = parseFloat(transcriptData[i].end);
    var sentiment = "neutral";
    //console.log("start: " + start);

    //check the sentiment of the word
    for(var j in disSentimentData){
      var senti_start = parseFloat(disSentimentData[j].start);
      var senti_end = parseFloat(disSentimentData[j].end);
      if(start >= senti_start && end <= senti_end){
        sentiment = disSentimentData[j].data;
        //console.log("sentiment: " + sentiment);
        break;
      }
    }

    //console.log("timestamp: " + e.chart.chartCursor.timestamp + " , start: " + start + ", end: " + end + " , word: " + value);
    if (currentTimeInMS >= start && currentTimeInMS <= end)
    {
      if(String(value).trim().localeCompare("sp") != 0){
        transcript += "<span class='highlight'>" + String(value).trim() + " " + "</span>";
      }
      else{
          //thjs logic is used to solve the duplicate last word issue
        if(i > 0)
        {
          var words = transcript.split(" ");
          var transcript = "";
          for(var k = 0; k < words.length -2; k++)
          {
            transcript += words[k] + " "
          }
          var value2 = transcriptData[i-1].label;
          transcript += "<span class='highlight'>" + String(value2).trim() + " " + "</span>";
        }
      }
    }
    else {
      if(String(value).trim().localeCompare("sp") != 0){
        transcript += "<span class='" + sentiment + "'>" + String(value).trim() + " " + "</span>";
      }
    }
  }

  var x = document.getElementById("transcriptdiv");
  x.innerHTML = transcript;
}

function handleZoom(e) {
  timeline_start = moment.duration(e.startValue).asMilliseconds() / 1000.0;
  timeline_end = moment.duration(e.endValue).asMilliseconds() / 1000.0;

  drawCategoryData();
  drawSilenceTimeline();
  drawVerbalFillerData();
}


function updateTranscript2(currentTimeInMS){
  var transcript = "";
  for(var i = 0; i < transcriptData.length-1; i++){
    //read in two at a time
    //the first one is the word and the second one is the gap between two words, the so called "sp"
    var value = transcriptData[i].label;
    var start = parseFloat(transcriptData[i].start);
    var end = parseFloat(transcriptData[i].end);
    var sentiment = "neutral";
    var next_value = transcriptData[i+1].label;
    if(String(next_value).trim().localeCompare("sp") === 0){
      i = i + 1;
      end = parseFloat(transcriptData[i].end);
    }

    //check the sentiment of the word
    for(var j in disSentimentData){
      var senti_start = parseFloat(disSentimentData[j].start);
      var senti_end = parseFloat(disSentimentData[j].end);
      if(start >= senti_start && end <= senti_end){
        sentiment = disSentimentData[j].data;
        //console.log("sentiment: " + sentiment);
        break;
      }
    }

    if (currentTimeInMS >= start && currentTimeInMS <= end)
    {
      if(String(value).trim().localeCompare("sp") != 0){
        transcript += "<span class='highlight'>" + String(value).trim() + " " + "</span>";
      }
      else{
        //thjs logic is used to solve the duplicate last word issue
        if(i > 0)
        {
          var words = transcript.split(" ");
          var transcript = "";
          for(var k = 0; k < words.length -2; k++)
          {
            transcript += words[k] + " "
          }
          var value2 = transcriptData[i-1].label;
          transcript += "<span class='highlight'>" + String(value2).trim() + " " + "</span>";
        }
      }
    }
    else {
      //if the insepcted word is NOT a highlighted word, then just display normal sentiment
      if(String(value).trim().localeCompare("sp") != 0){
        transcript += "<span class='" + sentiment + "'>" + String(value).trim() + " " + "</span>";
      }
    }
  }

  var x = document.getElementById("transcriptdiv");
  x.innerHTML = transcript;
}

setTimeout(myTimer2, 500);

function myTimer2() {
  if(mChart != null && mAudio != null)
  {
    console.log("charts and the audio control are both ready...");
    connectAudioCharts();
    connectMouseEvents();
  }
  else {
    setTimeout(myTimer2, 500);
  }
}

function connectAudioCharts(){
  mAudio.addEventListener("timeupdate", function(e) {
    //console.log("time: " + e.target.currentTime);
    /*
    var currentDate = new Date(Math.floor(e.target.currentTime * 1000));
    for(var x in mChart.panels){
      mChart.panels[x].chartCursor.showCursorAt(currentDate);
    }
    mChart.validateData();
    */
    //update the highlight position in the transcript
    updateTranscript(Math.floor(e.target.currentTime * 1000))
    //updateTranscript2(Math.floor(e.target.currentTime * 1000));
  });
}

function connectMouseEvents(){
  console.log("connecting mouse events... ");
  for(var x in mChart.panels){
    //console.log("set panel  " + x);
    mChart.panels[x].chartCursor.addListener("changed", AmCharts.myHandleMove);
    mChart.panels[x].chartDiv.onclick = AmCharts.myHandleClick;
    mChart.panels[x].chartCursor.addListener("selected", handleSelection);
  }
}

//this variable is to mark whether the mouse select operation is executed so that it can be distinguished from click
var selection = false;

AmCharts.myCurrentPosition;
AmCharts.myHandleMove = function(event) {
  if (undefined === event.index )
  return;
  AmCharts.myCurrentPosition = event.chart.dataProvider[event.index].time;
}

AmCharts.myHandleClick = function(event){
  if(selection === false)
  {
    for(var x in mChart.panels){
      //console.log("time: " + AmCharts.myCurrentPosition.getTime());
      mAudio.currentTime = AmCharts.myCurrentPosition.getTime()/1000; //convert the miliseconds into seconds
      mAudio.addEventListener('canplaythrough', function(){
        this.play();
      });
    }
    mChart.validateData();
  }
  else {
    selection = false;
  }
}

// the logic for mouse selection operation
function handleSelection(event){
  selection = true;
  //console.log("event.start: " + event.start);
  //console.log("event.end: " + event.end);
  for(var x in mChart.panels){
    //console.log("dataprovider: " + x.dataProvider);
    for (var y in mChart.panels[x].dataProvider)
    {
      var datapoint = mChart.panels[x].dataProvider[y];
      var time = datapoint.time;
      //console.log("date: " + time);
      //console.log("time: " + time.getTime());
      document.getElementById("start").value = parseFloat(event.start/1000); //convert the miliseconds into seconds
      document.getElementById("end").value = parseFloat((event.end+1)/1000); //convert the miliseconds into seconds
    }
  }
  mChart.validateData();
}


//filter out the silence that is shorter than the len of seconds
function getFilteredData(len)
{
  //console.log("filter value: " + len);
  console.log("filter value: " + parseInt(len));
  var newData = [];

  var cnt = 0;
  for(var i=0; i < silenceData.length; i++)
  {
    //console.log("duration: ", parseInt(silenceData[i].duration));
    if(parseInt(silenceData[i].data) === 2 && parseInt(silenceData[i].duration) >= parseInt(len) * 1000)
    {
      cnt ++;
      //chartData.push({"time": start, "data":0, "color": undefined, "label": "undefined"});
      newData.push({
        "time": silenceData[i].time,
        "data": 2,
        "duration": silenceData[i].duration,
        "legendColor": AmCharts.randomColor(), //silenceData[i].color,
        "label": silenceData[i].label
      });
      //console.log("silence length: " + len);
    }
    else {
      newData.push({
        "time": silenceData[i].time,
        "data": 1,
        "duration": silenceData[i].duration,
        "legendColor": AmCharts.randomColor(), // silenceData[i].color,
        "label": silenceData[i].label
      });
    }
  }
  console.log("AmCharts.randomColor(): " + AmCharts.randomColor());
  console.log("# of data points: " + cnt);
  return newData;
}

//filter the length of the audio duration
function applySilenceLengthFilters(len){
  //assume that the silence data panel comes the last in the three features
  //reminder: the value "2" must be changed accordingly
  //console.log("filter value: " + parseInt(len));
  var newData = [];

  //var cnt = 0;
  for(var i=0; i < silenceData.length; i++)
  {
    //console.log("duration: ", parseInt(silenceData[i].duration));
    if(parseInt(silenceData[i].data) === 2 && parseInt(silenceData[i].duration) >= parseInt(len) * 1000)
    {
      //cnt ++;
      //chartData.push({"time": start, "data":0, "color": undefined, "label": "undefined"});
      newData.push({
        "time": silenceData[i].time,
        "data": 2,
        "duration": silenceData[i].duration,
        "legendColor": AmCharts.randomColor(), //silenceData[i].color,
        "label": silenceData[i].label
      });
      //console.log("silence length: " + len);
    }
    else {
      newData.push({
        "time": silenceData[i].time,
        "data": 1,
        "duration": silenceData[i].duration,
        "legendColor": AmCharts.randomColor(), // silenceData[i].color,
        "label": silenceData[i].label
      });
    }
  }
  //console.log("AmCharts.randomColor(): " + AmCharts.randomColor());
  //console.log("# of data points: " + cnt);
  //the number 3 below assumes that the silence data panel is the 4th panel in the div
  mChart.dataSets[2].dataProvider = newData;
  mChart.validateData();
}
