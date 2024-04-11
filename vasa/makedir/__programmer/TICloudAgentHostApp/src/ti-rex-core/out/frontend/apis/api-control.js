"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIControl = void 0;
// 3rd party
const PQueue = require("p-queue");
// our modules
const counter_1 = require("../component-helpers/counter");
/**
 * Implements a locking solution to allow users of apis.ts to
 * acquire / release control of the exposed methods.
 *
 */
class APIControl {
    currentMaster = null;
    resolver = null;
    apiQueue = new PQueue({ concurrency: 1 });
    apiIndex = new counter_1.Counter();
    /**
     * Acquire control. If someone has control it resolves the promise once you have control.
     *
     * @param name
     *
     * @returns {Promise} name - Resolved once you have acquired control.
     */
    acquireControl(name) {
        if (this.isCurrentMaster(name)) {
            return Promise.reject(new Error(`Already in control ${name}`));
        }
        const initialIndex = this.apiIndex.getValue();
        return new Promise((resolveControl, reject) => {
            this.apiQueue
                .add(() => {
                const index = this.apiIndex.getValue();
                if (index !== initialIndex) {
                    return Promise.resolve({});
                }
                this.currentMaster = name;
                // We now have control
                resolveControl(this.currentMaster);
                return new Promise(resolveRelease => {
                    this.resolver = resolveRelease;
                    return this.currentMaster;
                });
            })
                .catch(reject);
        });
    }
    /**
     * Release control. Note you can only relese control if you have already acquired control.
     *
     * @param name
     */
    releaseControl(name) {
        if (this.currentMaster !== name) {
            throw new Error(`${name} is trying to release control of ${this.currentMaster}`);
        }
        else if (!this.resolver) {
            throw new Error(`resolver is null`);
        }
        this.currentMaster = null;
        this.resolver();
        this.resolver = null;
    }
    /**
     * Determine if you are the current master
     *
     * @param name
     *
     * @returns isCurrentMaster
     */
    isCurrentMaster(name) {
        return name === this.currentMaster;
    }
    /**
     * Resolves when there is no ongoing masters with control.
     *
     * @returns {Promise} void
     *
     */
    onIdle() {
        return this.apiQueue.onIdle();
    }
    /**
     * Clear the queue (for testing purposes only)
     *
     */
    _clear() {
        // Avoid clearing queue because it leaves dangling promises that cause issues in tests
        // Instead increment the index and in the add routine skip the body if the current
        // index does not match the initial index
        this.apiIndex.setValue();
        if (this.currentMaster) {
            this.releaseControl(this.currentMaster);
        }
    }
}
exports.APIControl = APIControl;
