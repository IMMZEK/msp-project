"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePromiseIndicies = exports.cleanupPromiseSyncronization = exports.setupPromiseSyncronization = exports.waitForPromisesToResolve = exports.waitForPromisesToResolvePromise = void 0;
// 3rd party
const _ = require("lodash");
// our modules
const get_promise_replacement_1 = require("./get-promise-replacement");
const util_1 = require("../component-helpers/util");
let tracker = null;
function waitForPromisesToResolvePromise(indicies) {
    return new Promise((resolve, reject) => {
        waitForPromisesToResolve(indicies, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.waitForPromisesToResolvePromise = waitForPromisesToResolvePromise;
function waitForPromisesToResolve(indicies, callback) {
    try {
        if (!tracker) {
            throw new Error('No tracker');
        }
        printActivePromises();
        const intervalRef = setInterval(() => {
            if (!tracker) {
                callback(new Error('No tracker'));
            }
            else if (_.isEmpty(_.intersection(Object.keys(tracker.getActivePromises()), indicies))) {
                clearInterval(intervalRef);
                callback();
            }
            else if ((0, util_1.isBrowserEnvironment)()) {
                const activePromises = _.intersection(Object.keys(tracker.getActivePromises()), indicies);
                console.log('active ', activePromises);
            }
        }, 100);
    }
    catch (err) {
        setImmediate(callback, err);
    }
}
exports.waitForPromisesToResolve = waitForPromisesToResolve;
function setupPromiseSyncronization() {
    if (tracker) {
        throw new Error('Tracker not cleared before calling setup');
    }
    tracker = new get_promise_replacement_1.PromiseReplacementTracker();
    Promise = (0, get_promise_replacement_1.getPromiseReplacement)(tracker);
}
exports.setupPromiseSyncronization = setupPromiseSyncronization;
function cleanupPromiseSyncronization() {
    tracker = null;
    (0, get_promise_replacement_1.restorePromise)();
}
exports.cleanupPromiseSyncronization = cleanupPromiseSyncronization;
function getActivePromiseIndicies() {
    if (!tracker) {
        throw new Error('No tracker');
    }
    return Object.keys(tracker.getActivePromises());
}
exports.getActivePromiseIndicies = getActivePromiseIndicies;
// Helpers
function printActivePromises() {
    if (!tracker) {
        throw new Error('No tracker');
    }
    else if (!(0, util_1.isBrowserEnvironment)()) {
        return;
    }
    const activePromises = tracker.getActivePromises();
    const activePromiseKeys = Object.keys(activePromises);
    const numActivePromises = activePromiseKeys.length;
    if (numActivePromises === 0) {
        console.log('No active promises.');
        return;
    }
    let promiseDebugString = `${numActivePromises} active ${numActivePromises > 1 ? 'promises' : 'promise'}:\n`;
    for (const pIndex of activePromiseKeys) {
        const activePromiseStack = activePromises[pIndex];
        const activePromiseMessage = activePromiseStack.map(item => `\t${item}`).join('\n');
        promiseDebugString += `Promise ${pIndex}:\n${activePromiseMessage}\n`;
    }
    console.log(promiseDebugString);
}
