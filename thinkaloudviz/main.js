var silenceBubbleText = ["","","silence"];

var mAudio = null;
AmCharts.useUTC = true;
var mChart = null;
var audioDuration;

window.onload = function(){
  //load the audio when the UI is displayed
  mAudio = document.getElementById("audiocontrol");
  mAudio.addEventListener('loadedmetadata', processAudio);
  //check audio's loading status. if it is not ready, load it again
  if (mAudio.readyState >= 2) {
        processAudio();
  }

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

    console.log(note);

    $('#notes_timeline').append("<span class='timeline-element' style='"+
    "width:" + note.width +';left:' + note.start + ';background-color:' + note.color
    + "'></span>")

    $('#start').val("0");
    $('#end').val("0");
  });
};

function processAudio() {
  audioDuration = mAudio.duration;
  //console.log(mAudio.duration);
  loadRawCategoryData("./coders/1/1/categorydata.json");
}

//console.log("loading loudness data...")
var loudnessData = loadChartData("./p1/t1/thinkaloud_loudness.json");
//console.log("loading pitch data...")
var pitchData = loadChartData("./p1/t1/thinkaloud_pitch.json");
var allData = loadSilenceData("./p1/t1/thinkaloud_aligned.json");
var transcriptData = allData[0];
var silenceData = allData[1];

var categoryData = loadCategoryData("./coders/1/1/categorydata.json");
var sentimentData = loadSentimentData("./p1/t1/thinkaloud_sentiment.json");
var disSentimentData = loadDiscreteSentimentData("./p1/t1/thinkaloud_sentiment.json");

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
  return  [chartData, chartDataSampled];
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
        if(parseFloat(inputdata[i].data) >= 0.5){
          sentiment = 1;
        }
        else if(parseFloat(inputdata[i].data <= -0.5)){
          sentiment = -1
        }

        for(var j = 0; j < end-start; j+=50){
          chartData.push({"time": start+j, "data": sentiment, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": start, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": end-1, "data":inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
        }
      }
      else{
        for(var j = 0; j < end-start; j+=50){
          chartData.push({"time": start+j, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": start, "data": inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
          //chartData.push({"time": end-1, "data":inputdata[i].data, "duration": end-start, "legendColor": AmCharts.randomColor, "label": "undefined"});
        }
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
      if(parseFloat(inputdata[i].data) >= 0.5){
        sentiment = "positive";
      }
      else if(parseFloat(inputdata[i].data) <= -0.5){
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
      /*
      for(var j = 0; j < end-start; j+=50){
        chartData.push({"time": start+j, "data":data, "duration": end-start, "legendColor": color, "label": String(label).trim()});
      }
      */
    }
  });
  return chartData;
}

function loadRawCategoryData (dataset_url) {
  $.getJSON(dataset_url, function (data) {
    //console.log(audioDuration, data);
    var label_color = {
      Reading: '#0275d8',
      Procedure: '#5cb85c',
      Observation: '#f0ad4e',
      Explanation: '#d9534f'
    }

    _.each(data, function (label) {
      label.width = ((label.end_time - label.start_time)/audioDuration) * 100 + '%';
      label.start = (label.start_time/audioDuration) * 100 + '%';
      $('#labels_timeline').append("<span class='timeline-element' style='"+
      "width:" + label.width +';left:' + label.start + ';background-color:' + label_color[label.label]
      + "' title="+ label.note+"></span>")
    });
    //console.log(data);

    Tipped.create('.timeline-element');
    loaded = true;
  });
}


//console.log("after calling the loadChartData function");
setTimeout(myTimer, 500);
function myTimer() {
  if( pitchData.length != 0 && pitchData.length != 0)
  {
    console.log("data is ready");
    mChart = drawCharts();
    drawTranscript();
    //mChart2 = drawCategoryChart();
  }
  else {
    setTimeout(myTimer, 500);
  }
}


function drawCategoryChart(){
  var chart = null;
  chart = AmCharts.makeChart("chartdiv2",{
    "type": "serial",
    "theme": "light",
    "dataProvider": categoryData,
    "valueAxes": [{
      "axisAlpha": 0,
      "gridAlpha": 0.1
    }],
    "startDuration": 1,
    "graphs": [{
      "balloonText": "<b>[[category]]</b><br>starts at [[startTime]]<br>ends at [[endTime]]",
      "colorField": "legendColor",
      "fillAlphas": 0.8,
      "lineAlpha": 0,
      "openField": "startTime",
      "type": "column",
      "valueField": "endTime",
      "xclustered": true,
      "clustered": true,
    }],
    "rotate": true,
    "columnWidth": 1,
    "categoryField": "label",
    "categoryAxis": {
      "gridPosition": "start",
      "axisAlpha": 0,
      "gridAlpha": 0.1,
      "position": "left"
    }
  }
);
return chart;
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
    categoryField: "time"
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
},
{
  fieldMappings: [{
    fromField: "data",
    toField: "data3"
  },
  {
    fromField: "label",
    toField: "label3"
  },
  {
    fromField: "legendColor",
    toField: "legendColor"
  }
],
dataProvider: silenceData,
categoryField: "time",
compared: true
},
{
  fieldMappings: [{
    fromField: "data",
    toField: "data4"
  },
  {
    fromField: "label",
    toField: "label4"
  },
  {
    fromField: "legendColor",
    toField: "legendColor"
  }
],
dataProvider: categoryData,
categoryField: "time",
compared: true,

},
{
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
compared: true
},
],

panels: [ {
  showCategoryAxis: false,
  title: "Loudness (dB)",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g1",
    type:"smoothedLine",
    valueField: "data1",
    comparable: false,
    compareField: "data1",
    useDataSetColors: true,
    colorField: "legendColor",
    lineColor: "legendColor",
    legendColorField: "legendColor",
    lineColorField: "legendColor",
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
  title: "Pitch (HZ)",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g2",
    compareGraphType:"smoothedLine",
    valueField: "data2",
    compareField: "data2",
    comparable: true,
    useDataSetColors: false,
    lineColor: "legendColor",
    legendColorField: "legendColor",
    lineColorField: "legendColor",

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
  title: "Silence",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g3",
    compareGraphType:"step",
    valueField: "data3",
    compareField: "data3",
    comparable: true,
    visibleInLegend: true,
    useDataSetColors: false,
    lineColor: "legendColor",
    legendColorField: "legendColor",
    lineColorField: "legendColor",
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
  title: "Category",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g4",
    compareGraphType:"step",

    fillAlphas: 1,
    valueField: "data4",
    compareField: "data4",
    comparable: true,
    visibleInLegend: false,
    useDataSetColors: false,
    colorField: "lengendColor",
    legendColorField: "legendColor",
    lineColorField: "legendColor",
    lineColor:"lengendColor", //"#FABC9C"
    //compareGraphFillColors: "lengendColor",
    //compareGraphLineColor: "lengendColor"
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
  showCategoryAxis: true,
  title: "Sentiment",
  allowTurningOff: false,
  stockGraphs: [ {
    id: "g5",
    compareGraphType:"step",
    lineThickness: 3,
    showBalloon: true,
    fillAlphas: 1,
    valueField: "data5",
    compareField: "data5",
    comparable: true,
    visibleInLegend: false,
    useDataSetColors: true,
    colorField: "lengendColor",
    lineColor: "lengendColor", //"#1ABC9C",
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
    period: "ss",
    count: 15,
    label: "15 seconds"
  }, {
    period: "ss",
    count: 30,
    label: "30 seconds"
  }, {
    period: "ss",
    count: 60,
    label: "60 seconds"
  }, {
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


function handleMousemove(e){
  //finally get the timestamp information: it is hided really deeply...
  //console.log(e.chart.chartCursor.timestamp);
  var timestamp = parseFloat(e.chart.chartCursor.timestamp);
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
    if (timestamp >= start && timestamp <= end)
    {
      if(String(value).trim().localeCompare("sp") != 0){
        transcript += "<span class='highlight'>" + String(value).trim() + " " + "</span>";
      }
      else{
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
    var currentDate = new Date(Math.floor(e.target.currentTime * 1000));
    for(var x in mChart.panels){
      mChart.panels[x].chartCursor.showCursorAt(currentDate);
    }
    mChart.validateData();
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
  /*
  for(var x in mChart.dataSets){
  for(var j in mChart.dataSets[x].dataProvider){
  var datapoint = mChart.dataSets[x].dataProvider[j];
  if(parseInt(datapoint.time) >= parseInt(event.start)  && parseInt(datapoint.time) < parseInt(event.end))
  {
  //console.log("selected point");
  //console.log("datapoint: " + datapoint.time + ", value: " + datapoint.data + ", color: " + datapoint.lineColor + ", label: " + datapoint.label);
  datapoint.lengendColor = "#00CC00";
}
else
{
datapoint.lengendColor = "#FF6600";
}
}
}
*/
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

  mChart.dataSets[2].dataProvider = newData;
  mChart.validateData();
}


function applyCategoryFilters(){
  var newData = [];
  var categories = [];

  if (document.getElementById("labelcategory1").checked){
    categories.push(document.getElementById("labelcategory1").value);
    //console.log("still chosen categories: " + document.getElementById("labelcategory1").value);
  }

  if (document.getElementById("labelcategory2").checked){
    categories.push(document.getElementById("labelcategory2").value);
    //console.log("still chosen categories: " + document.getElementById("labelcategory2").value);
  }

  if (document.getElementById("labelcategory3").checked){
    categories.push(document.getElementById("labelcategory3").value);
    //console.log("still chosen categories: " + document.getElementById("labelcategory3").value);
  }

  if (document.getElementById("labelcategory4").checked){
    categories.push(document.getElementById("labelcategory4").value);
    //console.log("still chosen categories: " + document.getElementById("labelcategory4").value);
  }

  for(var i = 0; i < categoryData.length; i++)
  {
    var chosen = false;
    for (var k = 0; k < categories.length; k++)
    {
      if(String(categoryData[i].label).trim().localeCompare(categories[k]) === 0){
        chosen = true;
        break;
      }
    }

    if(chosen)
    {
      newData.push({
        "time": categoryData[i].time,
        "data": categoryData[i].data,
        "duration": categoryData[i].duration,
        "legendColor": categoryData[i].color, //silenceData[i].color,
        "label": categoryData[i].label,
      });
      //console.log("silence length: " + len);
    }
    /*
    else {
    newData.push({
    "time": categoryData[i].time,
    "data": -1,
    "duration": categoryData[i].duration,
    "legendColor": categoryData[i].color, //silenceData[i].color,
    "label": categoryData[i].label,
  });
}
*/
  }

  //based on the assumption that the sentiment data is the 5th panel
  mChart.dataSets[3].dataProvider = newData;
  mChart.validateData();
}
