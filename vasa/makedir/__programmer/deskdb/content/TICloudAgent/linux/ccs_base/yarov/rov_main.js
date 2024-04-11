"use strict";
/*
 * Copyright (c) 2022-2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const rov_internal_1 = require("./rov_internal");
class RovMain {
    constructor(emitEvent, createSibling, logger, getHostAgentArgs) {
        this.emitEvent = emitEvent;
        this.createSibling = createSibling;
        this.logger = logger;
        this.getHostAgentArgs = getHostAgentArgs;
        this.callbackKeeper = new CallbackKeeper();
        this.log = true;
        this.worker = new worker_threads_1.Worker(path.join(__dirname, 'rov_worker.js'), { workerData: { requireXDC: false } });
        this.worker.on('message', msg => {
            if (msg.error) {
                this.log && logger.info(`${__filename} got worker message ${msg}`);
            }
            if (msg.key !== undefined) {
                const x = this.callbackKeeper.checkout(msg.key);
                msg.error !== undefined ? x?.reject(msg.error) : x?.resolve(msg.result);
            }
        });
        this.worker.on('error', (error) => {
            this.log && logger.info(`${__filename} got worker error ${error}`);
        });
        this.worker.on('exit', (code) => {
            this.log && logger.info(`${__filename} got worker exit ${code}`);
        });
    }
    onClose() {
        const msg = {
            id: rov_internal_1.TerminateMsg_ID,
            key: -1
        };
        this.worker.postMessage(msg);
    }
    async getCrovContent(crovFile) {
        const data = await new Promise((resolve, reject) => {
            fs.readFile(crovFile, (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(data);
            });
        });
        const myctx = {};
        vm.runInNewContext(data, myctx, crovFile);
        return myctx;
    }
    async loadFile(file, coreName, paths) {
        // const x = await this.createSibling('DS');
        const hostAgentArgs = this.getHostAgentArgs();
        return new Promise((resolve, reject) => {
            const key = this.callbackKeeper.checkin({ resolve, reject });
            const msg = {
                id: rov_internal_1.LoadFileMsg_ID,
                key,
                hostAgentArgs,
                dsContext: { coreName },
                // dsPort: x.port,
                // coreName,
                file,
                paths
            };
            this.worker.postMessage(msg);
        });
    }
    async getViewNames(file) {
        return new Promise((resolve, reject) => {
            const key = this.callbackKeeper.checkin({ resolve, reject });
            const msg = {
                id: rov_internal_1.GetViewNamesMsg_ID,
                key,
                file
            };
            this.worker.postMessage(msg);
        });
    }
    async getStructure(file, viewIndex) {
        return new Promise((resolve, reject) => {
            const key = this.callbackKeeper.checkin({ resolve, reject });
            const msg = {
                id: rov_internal_1.GetStructureMsg_ID,
                key,
                file,
                viewIndex
            };
            this.worker.postMessage(msg);
        });
    }
    async callFunction(file, viewIndex) {
        return new Promise((resolve, reject) => {
            const key = this.callbackKeeper.checkin({ resolve, reject });
            const msg = {
                id: rov_internal_1.CallFunctionMsg_ID,
                key,
                file,
                viewIndex
            };
            this.worker.postMessage(msg);
        });
    }
    async enableLog(enable) {
        this.log = enable;
    }
    async selfCheck(coreName, onWorker, location, symbolName) {
        const hostAgentArgs = this.getHostAgentArgs();
        if (onWorker) {
            return new Promise((resolve, reject) => {
                const key = this.callbackKeeper.checkin({ resolve, reject });
                const msg = {
                    id: rov_internal_1.SelfCheck_ID,
                    key,
                    hostAgentArgs,
                    dsContext: { coreName },
                    // coreName,
                    location,
                    symbolName
                };
                this.worker.postMessage(msg);
            });
        }
        const dsTask = await (0, rov_internal_1.getTask2)(hostAgentArgs, coreName);
        const x1 = await (0, rov_internal_1.taskMemory)(dsTask, location);
        const x2 = await (0, rov_internal_1.taskRov)(dsTask, symbolName);
        return { ...x1, ...x2 };
    }
}
class CallbackKeeper {
    constructor() {
        this.keyIndex = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.callbackMap = {};
    }
    checkin(cbPair) {
        const key = ++this.keyIndex;
        this.callbackMap[key] = cbPair;
        return key;
    }
    checkout(key) {
        const result = this.callbackMap[key];
        delete this.callbackMap[key];
        return result;
    }
    status() {
        return this.callbackMap;
    }
}
// Caller of rovMain puts the syscfg_c.rov.xs in a place
// Caller of rovMain asks rovMain to getCRovContent from the syscfg_c.rov.xs
// rovMain returns the list of crovFiles to the caller of rovMain
// For each crov file,
// Caller of rovMain resolves the full path of the crov file, put it in a place
// Caller of rovMain asks rovMain to load the crov file
// rovMain delegates it to rovWorker
// rovWoker read the crov file, add exports.viewMap, add exports.moduleName, save, reload file
exports.RovMain = RovMain;
// Implement TICA submodule contract
exports.name = 'yarov';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.instance = (triggerEvent, createSiblingModule, logger, eventBroker, getHostAgentSetupArgs) => {
    return {
        commands: new RovMain(triggerEvent, createSiblingModule, logger, getHostAgentSetupArgs)
    };
};

