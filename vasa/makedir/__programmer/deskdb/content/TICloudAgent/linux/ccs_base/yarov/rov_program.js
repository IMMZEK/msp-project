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
exports.RovProgram = void 0;
class RovProgram {
    constructor(task) {
        this.task = task;
    }
    getTask() {
        return this.task;
    }
    async lookupSymbolValue(symbolName) {
        return Number((await this.task.rov.lookupSymbolAddress(symbolName)).value);
    }
    async lookupTypeByVariable(symbolName) {
        return this.task.rov.lookupSymbolType(symbolName);
    }
    async lookupType(typeName) {
        return this.task.rov.lookupType(typeName);
    }
    async fetchArray(desc, address, elmCount) {
        let location;
        if (typeof address === 'number') {
            location = address.toString();
        }
        else {
            location = address;
        }
        const { values } = await this.task.memory.read(location, '8u', elmCount);
        return values.map(e => Number(e));
    }
    async fetchFromAddr(address, type, count = 1) {
        return fetchFromAddr(this.task, address.toString(), type, count);
    }
    async fetchVariable(name) {
        return fetchVariable(this.task, name);
    }
}
exports.RovProgram = RovProgram;
async function fetchFromAddr(task, address, typeName, count) {
    if (count === 1) {
        return fetchVariableImpl(task, `*(${typeName}*)(${address})`);
    }
    const x = [];
    for (let i = 0; i < count; i++) {
        x.push(fetchVariableImpl(task, `((${typeName}*)(${address}))[${i}]`));
    }
    return Promise.all(x);
}
async function fetchVariable(task, name) {
    const { filename } = await task.rov.lookupSymbolAddress(name);
    if (filename) {
        return fetchVariableImpl(task, `'${filename}'::${name}`);
    }
    return fetchVariableImpl(task, name);
}
async function fetchVariableImpl(task, expr) {
    const res = await task.expressions.evaluate(expr);
    if (res.type.endsWith('*')) {
        // Pointer type is returned as a number
        return Number(res.value);
    }
    if (res.arrayInfo) {
        const x = [];
        for (let i = 0; i < res.arrayInfo.size; i++) {
            x.push(fetchVariableImpl(task, `${expr}[${i}]`));
        }
        return Promise.all(x);
    }
    if (res.members.length > 0) {
        // const values = await Promise.all(_.map(res.members, ({ expression }) => fetchVariableImpl(task, expression)));
        // return _.fromPairs(_.zip(_.map(res.members, ({ name }) => name), values));
        const x = {};
        for (const member of res.members) {
            x[member.name] = await fetchVariableImpl(task, member.expression);
        }
        return x;
    }
    return Number(res.value);
}
