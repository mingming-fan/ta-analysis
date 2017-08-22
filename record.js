
var server = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs');

var port = 9009;

function serverHandler(request, response) {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    var isWin = !!process.platform.match(/^win/);

    if (filename && filename.toString().indexOf(isWin ? '\\uploadFile' : '/uploadFile') != -1 && request.method.toLowerCase() == 'post') {
        uploadFile(request, response);
        return;
    }
    else if (filename && filename.toString().indexOf(isWin ? '\\uploadMetaFile' : '/uploadMetaFile') != -1 && request.method.toLowerCase() == 'post') {
          uploadMetaFile(request, response);
          return;
      }


    fs.exists(filename, function(exists) {
        if (!exists) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + filename + '\n');
            response.end();
            return;
        }

        if (filename.indexOf('favicon.ico') !== -1) {
            return;
        }

        if (fs.statSync(filename).isDirectory() && !isWin) {
            filename += '/index.html';
        } else if (fs.statSync(filename).isDirectory() && !!isWin) {
            filename += '\\index.html';
        }

        fs.readFile(filename, 'binary', function(err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write(err + '\n');
                response.end();
                return;
            }

            var contentType;

            if (filename.indexOf('.html') !== -1) {
                contentType = 'text/html';
            }

            if (filename.indexOf('.js') !== -1) {
                contentType = 'application/javascript';
            }

            if (contentType) {
                response.writeHead(200, {
                    'Content-Type': contentType
                });
            } else response.writeHead(200);

            response.write(file, 'binary');
            response.end();
        });
    });
}

var app;

app = server.createServer(serverHandler);

app = app.listen(port, process.env.IP || "0.0.0.0", function() {
    var addr = app.address();

    if (addr.address == '0.0.0.0') {
        addr.address = 'localhost';
    }

    app.address = addr.address;

    console.log("Server listening at", 'http://' + addr.address + ":" + addr.port);
});

function uploadFile(request, response) {
    // parse a file upload
    var mime = require('mime');
    var formidable = require('formidable');
    var util = require('util');

    var form = new formidable.IncomingForm();

    var dir = !!process.platform.match(/^win/) ? '\\uploads\\' : '/uploads/';

    form.uploadDir = __dirname + dir;
    form.keepExtensions = true;
    form.maxFieldsSize = 10 * 1024 * 1024;
    form.maxFields = 1000;
    form.multiples = false;

    form.parse(request, function(err, fields, files) {
        var file = util.inspect(files);

        response.writeHead(200, getHeaders('Content-Type', 'application/json'));

        var originalFileName = file.split('path:')[1].split('\',')[0].split(dir)[1].toString().replace(/\\/g, '').replace('/\//g', '');

        console.log('original FileName: ' + originalFileName);

        var FileName = file.split('name:')[1].split('\',')[0].toString().replace(/\\/g, '').replace('\'', '').replace(/\s/g,'');

        //var fullFilaName = file.split('path:')[1].split('\',')[0].split(dir)[0].toString().replace('\'', '') + dir + file.split('name:')[1].split('\',')[0].toString().replace(/\\/g, '').replace('\'', '').replace(/\s/g,'');
        // rename the file to resolve the unknown random naming problem
        console.log("FileName: " + FileName);
        var res = FileName.split("-");
        var participantid = res[0];
        var taskid = res[1];
        var file = res[2];
        console.log("dir:" + dir);
        console.log("participant id: " + participantid + ", task id: " + taskid + ", file: " + file);
        var folder1 = __dirname + dir + "p" + participantid;
        var folder2 = __dirname + dir + participantid + '\\t' + taskid;
        var fs = require('fs');
        if (!fs.existsSync(folder1)){
           fs.mkdirSync(folder1);
           if (!fs.existsSync(folder2)){
             fs.mkdirSync(folder2);
           }
         }

        fs.rename('./uploads/' + originalFileName, './uploads/p' + participantid + "/t"+ taskid + "/" + file, function(err) {
            if ( err ) console.log('ERROR: ' + err);
        });

       var fileURL = 'http://' + app.address + ':' + port + '/uploads/p' + participantid + '/t'+ taskid + '/' + file;

        console.log('fileURL: ', fileURL);

        response.write(JSON.stringify({
            fileURL: fileURL
        }));
        response.end();
    });
}


function uploadMetaFile(request, response){
  var body = "";
   request.on("data", function (data) {
       body += data;
   });
   request.on("end", function() {
       console.log(JSON.parse(body));
       var currentdate = new Date();
       var month = currentdate.getMonth() + 1;
       var fileName = "./uploads/" + currentdate.getFullYear()+'_'+ month +"_" + currentdate.getDate() + "_" + currentdate.getHours() + "_" + currentdate.getMinutes() + "_" + currentdate.getSeconds() + "_" + currentdate.getMilliseconds() +".json";

       fs.writeFile(fileName, body, 'utf8', (err) => { if (err) throw err;
         console.log('The file has been saved!');});

       response.on('error', (err) => {
         console.error(err);
       });

       response.statusCode = 200;
       response.setHeader('Content-Type', 'application/json');
       response.write("Server received the data successfully...");
       response.end();
   });
}



function getHeaders(opt, val) {
    try {
        var headers = {};
        headers["Access-Control-Allow-Origin"] = "https://secure.seedocnow.com";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = true;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";

        if (opt) {
            headers[opt] = val;
        }

        return headers;
    } catch (e) {
        return {};
    }
}
