"use strict";
var Q = require("q");
// Suck the data out of a read stream and return a string
function readToString(req) {
    return Q.Promise(function (resolve, reject) {
        var stringData = "";
        req.on("data", function (data) {
            stringData += data;
        });
        req.on("end", function () {
            resolve(stringData);
        });
        req.on("error", reject);
    });
}
module.exports = readToString;
