"use strict";
var dinfra_common_1 = require("./dinfra_common");
var logger = dinfra_common_1.dinfra.logger("cloud-agent-server");
function generateErrorHandler(res) {
    return function (err) {
        // File not found
        var statusCode = err.statusCode || 500;
        var message = err.message || err.toString();
        logger.error({
            requestId: res.cloudAgentId,
            error: err,
        });
        if (res.writeHead) {
            res.writeHead(statusCode, {
                "content-type": "text/html; charset=utf8",
            });
            res.end(message);
        }
        else {
            res.emit("error", message);
        }
    };
}
module.exports = generateErrorHandler;
