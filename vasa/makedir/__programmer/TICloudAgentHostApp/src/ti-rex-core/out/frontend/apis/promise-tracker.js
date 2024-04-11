"use strict";
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromiseTracker = void 0;
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Used to synchronize promises to eliminate redundant function / APO calls.
 *
 */
class PromiseTracker {
    ///////////////////////////////////////////////////////////////////////////
    /// Members
    ///////////////////////////////////////////////////////////////////////////
    queue;
    constructor() {
        this.queue = {};
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Public Methods
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Register a promise to be tracked.
     * Will be automatically deregistered upon resolution.
     *
     * @param id
     * @param promise
     *
     * @returns promise
     */
    registerPromise(id, promise) {
        if (this.checkPromise(id)) {
            throw new Error(`id already exists in queue ${id}`);
        }
        this.queue[id] = promise;
        const cleanup = () => this.deregisterPromise(id, promise);
        promise.then(cleanup, cleanup);
        return promise;
    }
    /**
     * Check if the promise is registered.
     *
     * @param id
     *
     * @returns promise - or null if it does not exist
     */
    checkPromise(id) {
        const item = this.queue[id];
        return item ? item : null;
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Private Methods
    ///////////////////////////////////////////////////////////////////////////
    deregisterPromise(id, promise) {
        if (this.checkPromise(id) !== promise) {
            throw new Error(`promise mismatch at deregister for id ${id}`);
        }
        delete this.queue[id];
    }
}
exports.PromiseTracker = PromiseTracker;
