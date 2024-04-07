"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSerially = exports.shouldNeverThrow = exports.promisePipe = void 0;
const logger_1 = require("./logger");
// Code to pipe streams together and return a promise that is resolved when the
// piping is complete.  Any error at any point results in the promise being
// rejected
function isReadable(stream) {
    // Need to check 'readable' because the request module's through stream does not provide read
    return 'read' in stream || 'readable' in stream;
}
function isWritable(stream) {
    // Need to check 'writable' because the request module's through stream does not provide write
    return 'write' in stream || 'writeable' in stream;
}
function promisePipe(streams) {
    return new Promise((resolve, reject) => {
        // Handle errors on each stream, then pipe to the next stream
        const stream = streams.reduce((current, next) => {
            if (!isReadable(current) || !isWritable(next)) {
                throw new Error('invalid arguments');
            }
            return current.once('error', (err) => reject(err)).pipe(next);
        });
        // At the end, handle the last error, then use "finish" and / or "end"
        // to resolve the promise.
        stream.once('error', (err) => reject(err));
        if (isReadable(stream) && isWritable(stream)) {
            Promise.all([
                new Promise((resolve) => stream.once('end', () => resolve(stream))),
                new Promise((resolve) => stream.once('finish', () => resolve(stream)))
            ]).then(resolve, reject);
        }
        else if (isReadable(stream)) {
            throw new Error('Last stream must be writable');
        }
        else {
            stream.once('finish', () => resolve(stream));
        }
    });
}
exports.promisePipe = promisePipe;
function shouldNeverThrow(callback) {
    callback().catch((err) => logger_1.logger.critical('Non-rejecting promise was rejected:', err));
}
exports.shouldNeverThrow = shouldNeverThrow;
function mapSerially(collection, iterator) {
    const result = [];
    let idx = 0;
    return collection
        .reduce(async (promise, item) => {
        await promise;
        const r = await iterator(item, idx++);
        result.push(r);
    }, Promise.resolve())
        .then(() => result);
}
exports.mapSerially = mapSerially;
