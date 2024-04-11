"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWSServer = void 0;
const http = require("http");
const ws_1 = require("ws");
const Q = require("q");
// create a websocket server
function createWSServer() {
    const def = Q.defer();
    // use create server to find an available port and to upgrade to wss
    const server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end();
    });
    server.on("error", (err) => {
        def.reject(err);
    });
    server.listen(() => {
        const wss = new ws_1.Server({ server });
        def.resolve({
            server,
            wss,
        });
    });
    return def.promise;
}
exports.createWSServer = createWSServer;
