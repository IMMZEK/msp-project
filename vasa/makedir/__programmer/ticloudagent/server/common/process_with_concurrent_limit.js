"use strict";
var Q = require("q");
var _ = require("lodash");
function processWithConcurrentLimit(maxConcurrent, toProcess) {
    var results = [];
    var index = 0;
    function processNext() {
        if (index !== toProcess.length) {
            var next = toProcess[index];
            ++index;
            return next()
                .then(function (result) {
                results.push(result);
                return processNext();
            });
        }
        return Q(null);
    }
    var concurrentTasks = [];
    _.times(maxConcurrent, function () {
        concurrentTasks.push(processNext());
    });
    return Q.all(concurrentTasks)
        .thenResolve(results);
}
function mapToConcurrentPromiseChain(maxConcurrent, collection, predicate) {
    // Map can accept either an array (list) or object (dictionary), and takes
    // the appropriate predicate.  The guard to ensure that it matches is done
    // below in maybeCurryFunction, and nothing else is exported, so I'll just
    // cast to the array case here
    var toProcess = _.map(collection, function (a, b, c) {
        return function () {
            return predicate(a, b, c);
        };
    });
    return processWithConcurrentLimit(maxConcurrent, toProcess);
}
// Curry processWithConcurrentLimit to a fixed limit
function curryFunction(maxConcurrent) {
    return curriedFunction;
    function curriedFunction(collection, predicate) {
        return mapToConcurrentPromiseChain(maxConcurrent, collection, predicate);
    }
}
// Implementation
function maybeCurryFunction(maxConcurrent, collection, predicate) {
    if (undefined === collection) {
        return curryFunction(maxConcurrent);
    }
    else {
        return mapToConcurrentPromiseChain(maxConcurrent, collection, predicate);
    }
}
module.exports = maybeCurryFunction;
