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
const path = require("path");
const rov_program_1 = require("./rov_program");
const rov_internal_1 = require("./rov_internal");
// console.log(__filename, 'module', module);
// console.log(__filename, 'require', require);
// If worker execution throws an exception, main will get worker exit with code > 0,
// and main will have no worker to use unless it create a new worker.
// So, when handling messages, try catch any exception, and post to main a message that
// includes an error property with value Error(exception messages).
worker_threads_1.parentPort?.on('message', async (msg) => {
    try {
        switch (msg.id) {
            case rov_internal_1.TerminateMsg_ID:
                terminate();
                break;
            case rov_internal_1.LoadFileMsg_ID:
                await loadFile(msg);
                break;
            case rov_internal_1.GetViewNamesMsg_ID:
                getViewNames(msg);
                break;
            case rov_internal_1.GetStructureMsg_ID:
                getStructure(msg);
                break;
            case rov_internal_1.CallFunctionMsg_ID:
                await callFunction(msg);
                break;
            case rov_internal_1.SelfCheck_ID:
                await selfCheck(msg);
                break;
        }
    }
    catch (err) {
        worker_threads_1.parentPort?.postMessage({ key: msg.key, error: err });
    }
});
function terminate() {
    process.exit();
}
const reqFileMap = {};
const baseNameToFileMap = {};
const relFreeRtos = 'kernel/freertos/rov/FreeRTOS.rov.js';
const myFreeRtos = path.join(__dirname, 'rov_freertos.js');
function getLoadedFile(file, key) {
    const x = reqFileMap[file];
    if (x === undefined) {
        worker_threads_1.parentPort?.postMessage({ key, error: new Error(`Invalid file ${file}`) });
    }
    return x;
}
function getViewItem(loadedFile, viewIndex, key) {
    if (loadedFile.viewMap !== undefined && viewIndex >= 0 && viewIndex < loadedFile.viewMap.length) {
        return loadedFile.viewMap[viewIndex];
    }
    else {
        worker_threads_1.parentPort?.postMessage({ key, error: new Error(`Invalid view index ${viewIndex}`) });
    }
}
// async function taskCheck(msg: TaskCheckMsg) {
//     const dsTask = await getTask(msg.dsPort, msg.coreName);
//     const x1 = await taskMemory(dsTask, msg.location);
//     const x2 = await taskRov(dsTask, msg.symbolName);
//     const result = {...x1, ...x2};
//     parentPort?.postMessage({ key: msg.key, result });
// }
async function selfCheck(msg) {
    const dsTask = await (0, rov_internal_1.getTask2)(msg.hostAgentArgs, msg.dsContext.coreName);
    const x1 = await (0, rov_internal_1.taskMemory)(dsTask, msg.location);
    const x2 = await (0, rov_internal_1.taskRov)(dsTask, msg.symbolName);
    const result = { ...x1, ...x2 };
    worker_threads_1.parentPort?.postMessage({ key: msg.key, result });
}
class Context {
    constructor(task) {
        this.program = new rov_program_1.RovProgram(task);
    }
    getModule(fileName) {
        const file = baseNameToFileMap[fileName];
        if (file !== undefined) {
            return reqFileMap[file];
        }
        return undefined;
    }
    getProgram() {
        return this.program;
    }
}
async function loadFile(msg) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // let reqFile = require(msg.file === relFreeRtos ? myFreeRtos : msg.file);
    let reqFile;
    let problems = [];
    for (const x of msg.paths) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            reqFile = require(path.join(x, msg.file));
            break;
        }
        catch (e) {
            // no op
            problems.push({ message: e.message, stack: e.stack });
        }
    }
    if (reqFile === undefined && msg.file === relFreeRtos) {
        reqFile = require(myFreeRtos);
    }
    let moduleName;
    if (reqFile !== undefined) {
        problems = [];
        reqFile.classCtor = reqFile.classCtor || reqFile.default;
        if (reqFile.classCtor !== undefined) {
            // reqFile = new reqFile.classCtor(new RovProgram(await getTask(msg.dsPort, msg.coreName)));
            reqFile = new reqFile.classCtor(new Context(await (0, rov_internal_1.getTask2)(msg.hostAgentArgs, msg.dsContext.coreName)));
            moduleName = reqFile.getModuleName();
        }
        else {
            problems.push(new Error('Missing classCtor'));
        }
        reqFileMap[msg.file] = reqFile;
        baseNameToFileMap[path.basename(msg.file)] = msg.file;
        // if (moduleName !== undefined && moduleName.length > 0) {
        //     moduleNameToFileMap[moduleName] = msg.file;
        // }
    }
    worker_threads_1.parentPort?.postMessage({ key: msg.key, result: { moduleName, problems } });
}
function getViewNames(msg) {
    const x = getLoadedFile(msg.file, msg.key);
    if (x !== undefined) {
        const names = x.viewMap.map(elm => elm.name);
        worker_threads_1.parentPort?.postMessage({ key: msg.key, result: { names } });
    }
}
function getStructure(msg) {
    const x = getLoadedFile(msg.file, msg.key);
    if (x !== undefined) {
        const item = getViewItem(x, msg.viewIndex, msg.key);
        if (item !== undefined) {
            const result = new item.structName();
            worker_threads_1.parentPort?.postMessage({ key: msg.key, result });
        }
    }
}
async function callFunction(msg) {
    const x = getLoadedFile(msg.file, msg.key);
    if (x !== undefined) {
        const item = getViewItem(x, msg.viewIndex, msg.key);
        if (item !== undefined) {
            // If x is a class instance created from new classCtor, and
            // if x.viewMap[viewIndex].fxn is not a bound function bound to the class instance,
            // then code inside that fxn { ... this.Program.xxx, ... } will fail because this is undefined
            // In that case, we should do x.viewMap[viewIndex].fxn.apply(x), 
            // or we bind the fxn in an earlier stage of load file and overwrite it by,
            // x.viewMap[viewIndex].fxn = x.viewMap[viewIndex].fxn.bind(x).
            // BTW, fxn.name is function name e.g. 'getFoo', a bound function will be 'bound getFoo'
            const result = await item.fxn();
            worker_threads_1.parentPort?.postMessage({ key: msg.key, result });
        }
    }
}
if (worker_threads_1.workerData.requireXDC) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const xdc = require(path.join(__dirname, './xdc_wrapper.js'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.xdc = new xdc.XdcWrapper(worker_threads_1.parentPort);
}
worker_threads_1.parentPort?.postMessage('loaded');

