// Code to pipe streams together and return a promise that is resolved when the
// piping is complete.  Any error at any point results in the promise being 
// rejected
"use strict";
var Q = require("q");
function promisePipe(_first) {
    var _others = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        _others[_i - 1] = arguments[_i];
    }
    var deferred = Q.defer();
    // Convert to real array
    var streams = Array.prototype.slice.call(arguments);
    // Handle errors on each, then pipe to the next.
    var stream = streams
        .reduce(function (current, next) {
        return current
            .on("error", function (err) {
            deferred.reject(err);
        })
            .pipe(next);
    });
    // At the end, handle the last error + the "finish" to resolve the 
    // promise.
    stream.on("error", function (err) {
        deferred.reject(err);
    });
    stream.on("finish", function () {
        deferred.resolve(stream);
    });
    return deferred.promise;
}
;
module.exports = promisePipe;
