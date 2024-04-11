// Code to pipe streams together and return a string that is resolved when the
// piping is complete.
"use strict";
var readToString = require("./read_to_string");
var promisePipe = require("./promise_pipe");
function promisePipeToString(stream, buffer) {
    // We need to call readToString before promisePipe so that something is actively 
    // draining buffer when promisePipe is called and waiting
    var promise = readToString(buffer);
    return promisePipe(stream, buffer)
        .then(function () {
        return promise;
    });
}
;
module.exports = promisePipeToString;
