"use strict";
// Code to pipe streams together and return a promise that is resolved when the
// piping is complete.  Any error at any point results in the promise being 
// rejected
const Q = require("q");
function promisePipe(_first, ..._others) {
    const deferred = Q.defer();
    // Convert to real array
    const streams = Array.prototype.slice.call(arguments);
    // Handle errors on each, then pipe to the next.
    const stream = streams
        .reduce((current, next) => {
        return current
            .on("error", (err) => {
            deferred.reject(err);
        })
            .pipe(next);
    });
    // At the end, handle the last error + the "finish" to resolve the 
    // promise.
    stream.on("error", (err) => {
        deferred.reject(err);
    });
    stream.on("finish", () => {
        deferred.resolve(stream);
    });
    return deferred.promise;
}
;
module.exports = promisePipe;
