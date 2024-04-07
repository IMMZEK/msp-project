"use strict";
// tslint:disable-next-line: no-implicit-dependencies
const WebSocket = require("ws");
// Purpose of this module:
// Browsers block non-secure content on https pages. This includes non-secure websockets.
// This module opens websockets on behalf of the client and forwards any messages
// received. This avoids mixed-content errors as the browser is communicating to this
// module through the extension.
// There is currently no need for the client to send messages on the websockets so this
// functionality is not included.
class WsPipe {
    constructor(_triggerEvent, logger) {
        this._triggerEvent = _triggerEvent;
        this.logger = logger;
        this.nextId = 0;
        this.openWebSockets = {};
    }
    async onClose() {
        for (const ws of Object.values(this.openWebSockets)) {
            ws.close(1000, "Module was closed");
        }
        this.openWebSockets = {};
    }
    async openPipe(url) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            try {
                const ws = new WebSocket(url);
                ws.on("close", (code, reason) => {
                    delete this.openWebSockets[id];
                    this.logger.info(`WebSocket ${id} was closed (code: ${code}, reason: ${reason})`);
                    this._triggerEvent("closed", { id, code, reason });
                });
                ws.on("message", (data) => {
                    this._triggerEvent("message", { id, data });
                });
                ws.on("error", (err) => {
                    this.logger.info(`Error on WebSocket ${id}: ${err.message}`);
                    this._triggerEvent("error", { id, message: err.message });
                });
                this.logger.info(`Opened WebSocket to ${url} with id ${id}`);
                this.openWebSockets[id] = ws;
                resolve({ id });
            }
            catch (err) {
                reject(err);
                delete this.openWebSockets[id];
            }
        });
    }
    async closePipe(id, code, reason) {
        const ws = this.openWebSockets[id];
        if (!ws) {
            throw new Error(`No websocket with id ${id} to close`);
        }
        ws.close(code, reason);
        delete this.openWebSockets[id];
    }
}
exports.WsPipe = WsPipe;
exports.name = "WsPipe";
function instance(triggerEvent, _, logger) {
    return {
        commands: new WsPipe(triggerEvent, logger),
    };
}
exports.instance = instance;
