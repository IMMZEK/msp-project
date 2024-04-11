"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyServerInit = void 0;
// Our modules
const measure_1 = require("../../shared/measure");
const expect_1 = require("../expect");
// XMLHttpRequest is not defined in node
const OPENED = 1;
const DONE = 4;
/**
 * Initialize the proxy server
 *
 * @param  server
 * @param  remoteserverUrl
 * @param  onResponse Callback that gets passed the full response object
 *
 * Consider https://www.npmjs.com/package/xmlhttprequest so we don't have to handle proxy-ing requests ourselves.
 * Will need to figure out how to set the origin to remoteserver.
 */
function proxyServerInit(server, remoteserverUrl, onResponse) {
    // Sinon fake server config - handle api and content
    server.respondImmediately = true;
    setupResponse(/^api.*/, false);
    setupResponse(/^content.*/, true);
    // Treat any other urls as an error
    server.respondWith('GET', /^(?!api)(?!content).*/, xhr => {
        const err = new Error(`unknown url: ${xhr.url}`);
        handleError(err, xhr, (0, measure_1.mark)());
    });
    function setupResponse(routeMatcher, isContent) {
        server.respondWith('GET', routeMatcher, async (xhr) => {
            // Sinon likes to store every request in an array so you can query them after if you like
            // That might be nice in some cases, but when doing load tests it's dumb - it causes the
            // tests to eat up memory like crazy.  Since we don't need those statistics, I'm just going
            // to work around the leak by setting the array to [] on each request
            server.requests = [];
            const start = (0, measure_1.mark)();
            try {
                // Set readystate to DONE to ensure Sinon doesn't autorespond before the promise resolves
                xhr.readyState = DONE;
                // Forward request to tirex server
                let chaiRequest = expect_1.chai.request(remoteserverUrl).get(xhr.url);
                if (isContent) {
                    chaiRequest = chaiRequest.buffer().parse(binaryParser);
                }
                const res = await chaiRequest;
                // Log result
                if (onResponse) {
                    onResponse(xhr.url, res, (0, measure_1.duration)(start));
                }
                // Send response back to test
                xhr.readyState = OPENED;
                xhr.respond(res.status, res.header, JSON.stringify(res.body));
            }
            catch (err) {
                handleError(err, xhr, start);
            }
        });
    }
    function handleError(err, xhr, start) {
        if (onResponse) {
            onResponse(xhr.url, err, (0, measure_1.duration)(start));
        }
        xhr.readyState = XMLHttpRequest.OPENED;
        if (err.status) {
            xhr.respond(parseInt(err.status), {}, err.message);
        }
        else {
        }
    }
}
exports.proxyServerInit = proxyServerInit;
function binaryParser(res, cb) {
    // We want to stream the data from the server, but the tests don't need it
    // So just add events to capture the data, but don't do anything with it
    res.setEncoding('binary');
    res.on('data', (_chunk) => { });
    res.on('error', cb);
    res.on('end', () => {
        cb(null, {});
    });
}
