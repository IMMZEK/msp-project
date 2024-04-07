"use strict";
/*
 * Copyright (c) 2022, Texas Instruments Incorporated
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
exports.taskRov = exports.taskMemory = exports.getTask2 = exports.SelfCheck_ID = exports.CallFunctionMsg_ID = exports.GetStructureMsg_ID = exports.GetViewNamesMsg_ID = exports.LoadFileMsg_ID = exports.TerminateMsg_ID = exports.IMsg = void 0;
// import { createClientModule } from './rov_omg';
const path = require("path");
class IMsg {
}
exports.IMsg = IMsg;
exports.TerminateMsg_ID = 'terminate';
exports.LoadFileMsg_ID = 'loadFile';
exports.GetViewNamesMsg_ID = 'getViewNames';
exports.GetStructureMsg_ID = 'getStructure';
exports.CallFunctionMsg_ID = 'callFunction';
// export const TaskCheck_ID = 'taskCheck';
// export interface TaskCheckMsg extends IMsg, IDsContext {
//     id: typeof TaskCheck_ID;
//     location?: string;
//     symbolName?: string;
// }
exports.SelfCheck_ID = 'selfCheck';
// export async function getTask(dsPort: number, coreName: string) {
//     const ds = await createClientModule(dsPort);
//     const dsTask = await ds.getSubModule(coreName) as unknown as Task;
//     return dsTask;
// }
async function getTask2(hostAgentArgs, coreName) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const x = require(path.join(hostAgentArgs.cloudAgentDir, 'agentWrapper'));
    const agent = await x.constructHostAgent(hostAgentArgs);
    const ds = await agent.getSubModule('DS');
    const dsTask = await ds.getSubModule(coreName);
    return dsTask;
}
exports.getTask2 = getTask2;
async function taskMemory(dsTask, location) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {
        memory: dsTask.memory !== undefined,
        memoryRead: undefined
    };
    try {
        if (location !== undefined) {
            result.memoryRead = await dsTask.memory.read(location, '8u', 4);
        }
    }
    catch (err) {
        result.memoryRead = err;
    }
    return result;
}
exports.taskMemory = taskMemory;
async function taskRov(dsTask, symbolName) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {
        rov: dsTask.rov !== undefined,
        rovLookup: undefined
    };
    try {
        if (symbolName !== undefined) {
            result.rovLookup = await dsTask.rov.lookupSymbolAddress(symbolName);
        }
    }
    catch (err) {
        result.rovLookup = err;
    }
    return result;
}
exports.taskRov = taskRov;
