"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromiseReplacementTracker = exports.restorePromise = exports.getPromiseReplacement = void 0;
// our modules
const counter_1 = require("../component-helpers/counter");
const event_emitter_1 = require("../component-helpers/event-emitter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
let OriginalPromise = Promise;
const nativePromiseName = Promise.name;
function getPromiseReplacement(promiseReplacementTracker) {
    if (Promise.name !== nativePromiseName) {
        throw new Error(`global Promise was not restored, got ${Promise.name} as the name but wanted ${nativePromiseName}`);
    }
    OriginalPromise = Promise;
    // See here https://github.com/Microsoft/TypeScript/issues/15202 and
    // https://github.com/Microsoft/TypeScript/issues/15397 for why we do this instead
    // of just extending Promise
    // @ts-ignore complains about [Symbol.species] not being defined
    const replacement = class PromiseReplacement {
        promise;
        constructor(executor) {
            const index = promiseReplacementTracker.getPromiseIndex();
            const registerPromise = () => {
                promiseReplacementTracker.registerPromise(index);
            };
            let isDeregistered = false;
            const deregisterPromise = () => {
                if (!isDeregistered) {
                    promiseReplacementTracker.deregisterPromise(index);
                    isDeregistered = true;
                }
            };
            this.promise = new OriginalPromise((realResolve, realReject) => {
                registerPromise();
                try {
                    const resolve = (value) => {
                        deregisterPromise();
                        if (value) {
                            realResolve(value);
                        }
                        else {
                            // @ts-ignore - issue with handling Promise<void>
                            realResolve();
                        }
                    };
                    const reject = (reason) => {
                        deregisterPromise();
                        realReject(reason);
                    };
                    // Call the original executor, but with our wrappers instead
                    return executor(resolve, reject);
                }
                catch (e) {
                    deregisterPromise();
                    throw e;
                }
            });
        }
        then(resolve, reject) {
            return this.promise.then(resolve, reject);
        }
        catch(onRejected) {
            return this.promise.catch(onRejected);
        }
        static resolve(value) {
            return OriginalPromise.resolve(value);
        }
        static reject(reason) {
            return OriginalPromise.reject(reason);
        }
        static all(values) {
            return OriginalPromise.all(values);
        }
        static race(values) {
            return OriginalPromise.race(values);
        }
    };
    return replacement;
}
exports.getPromiseReplacement = getPromiseReplacement;
function restorePromise() {
    assetOriginalPromiseValid();
    Promise = OriginalPromise;
}
exports.restorePromise = restorePromise;
/**
 * Tracks pending promises and allows waiting until all are resolved.
 *
 */
class PromiseReplacementTracker {
    activePromises = {};
    emitter = new event_emitter_1.default();
    pendingCount = 0;
    promiseIndex = new counter_1.Counter();
    getActivePromises() {
        return this.activePromises;
    }
    getPromiseIndex() {
        const index = this.promiseIndex.getValue();
        this.promiseIndex.setValue();
        return index;
    }
    registerPromise(index) {
        this.activePromises[index] = getStackTrace();
        this.pendingCount++;
    }
    deregisterPromise(index) {
        delete this.activePromises[index];
        this.pendingCount--;
        if (this.pendingCount === 0) {
            this.emitter.emit('onClear');
        }
    }
    onClear() {
        assetOriginalPromiseValid();
        if (this.pendingCount === 0) {
            return OriginalPromise.resolve();
        }
        return new OriginalPromise(resolve => {
            this.emitter.once('onClear', () => {
                resolve();
            });
        });
    }
}
exports.PromiseReplacementTracker = PromiseReplacementTracker;
function assetOriginalPromiseValid() {
    if (OriginalPromise.name !== nativePromiseName) {
        throw new Error(`OriginalPromise is not the native Promise got ${OriginalPromise.name} as the name but wanted ${nativePromiseName}`);
    }
}
/**
 * Method to get stack trace across modern browsers.
 *
 */
function getStackTrace() {
    let stack;
    try {
        throw new Error('');
    }
    catch (error) {
        stack = error.stack || '';
    }
    const stackArr = stack.split('\n').map(line => line.trim());
    return stackArr.slice(stackArr[0] === 'Error' ? 1 : 0);
}
