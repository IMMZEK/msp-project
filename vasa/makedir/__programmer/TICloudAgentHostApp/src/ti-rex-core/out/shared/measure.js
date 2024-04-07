"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duration = exports.mark = exports.timedFunction = exports.timedPromise = void 0;
/**
 * Measures the execution time of an async function in ms
 *
 * @param  {()=>Promise<any>} fn An anonymous function that wraps the function to be timed
 * @param  {number=4} precision Number of significant digits (between 1 - 21, inclusive)
 * @returns {Promise} number
 */
async function timedPromise(fn, precision = 4) {
    const start = mark();
    await fn();
    return duration(start, precision);
}
exports.timedPromise = timedPromise;
/**
 * Measures the execution time of a sync function in ms
 *
 * @param  {()=>void} fn An anonymous function that wraps the function to be timed
 * @param  {number=4} precision Number of significant digits (between 1 - 21, inclusive)
 *
 * @returns number
 */
function timedFunction(fn, precision = 4) {
    const start = mark();
    fn();
    return duration(start, precision);
}
exports.timedFunction = timedFunction;
function mark() {
    return process.hrtime();
}
exports.mark = mark;
function duration(start, precision = 4) {
    return Number((process.hrtime(start)[0] * 1e3 + process.hrtime(start)[1] * 1e-6).toPrecision(precision));
}
exports.duration = duration;
